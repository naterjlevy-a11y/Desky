-- The shock absorber.
--
-- Waking the agent on every single capture would be wasteful: say three things
-- on the walk to class and you get three cold sessions racing each other over
-- the same rows. This fires at most once per cooldown window - the run already
-- on its way sweeps up anything that lands in the meantime.
--
-- No secret appears in this file. The token lives in Supabase Vault, encrypted
-- at rest, created separately:
--
--   select vault.create_secret('YOUR_TOKEN', 'agent_fire_token');

create or replace function public.wake_agent()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  cooldown constant interval := interval '5 minutes';
  endpoint constant text := 'https://api.example.com/v1/agent/YOUR_TRIGGER_ID/fire';
  last_at  timestamptz;
  token    text;
begin
  -- Claim the wake slot atomically. If another insert in the same burst got
  -- here first, its row lock makes us wait; we then see its timestamp and
  -- correctly decide not to fire a second time.
  insert into public.wake_state (user_id, last_fired_at)
  values (new.user_id, null)
  on conflict (user_id) do nothing;

  select last_fired_at into last_at
    from public.wake_state
   where user_id = new.user_id
     for update;

  if last_at is not null and last_at > now() - cooldown then
    return null;                  -- a run is already coming; it will take this row too
  end if;

  select decrypted_secret into token
    from vault.decrypted_secrets
   where name = 'agent_fire_token';

  if token is null then
    -- Never lose a capture over this. The row is already committed, and the
    -- scheduled morning run will pick it up even if the wake-up is broken.
    raise warning 'wake_agent: no token in vault; capture saved but agent not woken';
    return null;
  end if;

  update public.wake_state
     set last_fired_at = now()
   where user_id = new.user_id;

  -- Async. pg_net queues the request, so the insert returns to the phone
  -- immediately instead of waiting on someone else's API.
  perform net.http_post(
    url     := endpoint,
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || token,
                 'Content-Type',  'application/json'
               ),
    body    := jsonb_build_object(
                 'text',
                 'New captures are waiting in public.captures with status = ''new''.'
               ),
    timeout_milliseconds := 8000
  );

  return null;
end;
$$;

revoke all on function public.wake_agent() from public, anon, authenticated;

drop trigger if exists captures_wake_agent on public.captures;

create trigger captures_wake_agent
  after insert on public.captures
  for each row
  execute function public.wake_agent();

-- ── checking it worked ──────────────────────────────────────────────────────
-- After saving a capture, this shows the outbound call:
--
--   select id, status_code, created from net._http_response
--    order by created desc limit 5;
--
-- Note that auth.uid() is NULL on this connection - the trigger runs as the
-- definer, not as a signed-in user. Anything the agent writes back must set
-- user_id explicitly or it will fail the not-null constraint.

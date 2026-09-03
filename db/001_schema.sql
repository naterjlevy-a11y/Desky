-- Desky schema.
--
-- Four tables. Every one of them is scoped to auth.uid() by row-level security,
-- which is the entire reason the publishable key can ship in the browser: the
-- key says which project you are talking to, the policy says which rows you may
-- see, and the policy is enforced by Postgres, not by the client.

create extension if not exists pg_net with schema extensions;

-- ── captures ────────────────────────────────────────────────────────────────
-- Everything the user says, exactly as they said it. Never edited, never
-- deleted. The id is generated on the phone, not here, so a capture made
-- offline keeps its identity when it finally syncs and a double-send is a
-- primary key conflict rather than a duplicate row.
create table if not exists public.captures (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  text        text not null,
  said_at     timestamptz not null,           -- when they said it, not when it arrived
  synced_at   timestamptz not null default now(),
  status      text not null default 'new'
              check (status in ('new', 'done', 'skipped')),
  lane        text,
  category    text,
  outcome     text,                           -- what the agent did about it
  handled_at  timestamptz
);

-- ── cards ───────────────────────────────────────────────────────────────────
-- Things the agent could not finish alone and is handing back.
create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  section     text not null,                  -- which screen it belongs on
  title       text not null,
  body        text,
  url         text,
  due         date,
  pinned      boolean not null default false,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── agenda ──────────────────────────────────────────────────────────────────
-- The calendar, mirrored in so the app works with no signal. `day` is a plain
-- date and not derived from starts_at: an all-day deadline has no time at all,
-- and the difference between "due today" and "at 21:00" is the difference
-- between something that stays on screen and something that clears itself.
create table if not exists public.agenda (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  day         date not null,
  starts_at   timestamptz,
  ends_at     timestamptz,
  title       text not null,
  location    text,
  course      text,
  kind        text not null default 'event',  -- 'class' rows are drawn differently
  note        text,
  synced_at   timestamptz not null default now()
);

-- ── wake_state ──────────────────────────────────────────────────────────────
-- One row per user, holding the last time the agent was woken. See 002.
create table if not exists public.wake_state (
  user_id       uuid primary key default auth.uid() references auth.users on delete cascade,
  last_fired_at timestamptz
);

create index if not exists captures_user_said  on public.captures (user_id, said_at desc);
create index if not exists cards_user_open     on public.cards (user_id, done, due);
create index if not exists agenda_user_day     on public.agenda (user_id, day, starts_at);

-- ── row-level security ──────────────────────────────────────────────────────
alter table public.captures   enable row level security;
alter table public.cards      enable row level security;
alter table public.agenda     enable row level security;
alter table public.wake_state enable row level security;

do $$
declare t text;
begin
  foreach t in array array['captures', 'cards', 'agenda', 'wake_state'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    -- One policy covering all four verbs. `with check` matters as much as
    -- `using`: without it you could read only your own rows but insert a row
    -- carrying someone else's user_id.
    execute format($f$
      create policy own_rows on public.%I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    $f$, t);
  end loop;
end $$;

-- The anon role gets nothing at all. Signing in is what grants access.
revoke all on public.captures, public.cards, public.agenda, public.wake_state from anon;

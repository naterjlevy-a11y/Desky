# Desky

A one-button capture app for a university term. You say a thing — out loud, walking, half-formed — and an agent decides what it was and does something about it. It lands on your calendar, or becomes a task, or gets filed against a course, or it turns out to be nothing.

No project pickers, no tags, no "which list?" prompt. One text box and one button, because a system you have to think about before using is a system you stop using in week three.

Built as a PWA with **no framework, no build step and no dependencies** — one HTML file, one CSS file, one JS module, a service worker. It installs to a phone home screen and works with no signal.

---

## Why it looks like this

Most capture apps fail at the same two places, and both are the moment of capture rather than anything downstream.

**They ask you to classify.** Choosing between *task*, *event* and *note* is a decision, and you are making it while walking into a building. So Desky has one input. Classification is the agent's job — it has the timetable, the deadlines and every previous capture, which is more context than a dropdown ever gets.

**They lose things politely.** A capture that fails to send should never disappear quietly. Every capture gets its UUID generated on the device, is queued in `localStorage`, and is retried until the server confirms that specific row came back. A double-send is a primary key conflict, not a duplicate.

The rest of the app is a read-only view of the term: what's next, what's due, what each class is actually about today.

---

## How it works

```
 phone ──insert──▶ Postgres ──trigger──▶ agent ──writes──▶ Postgres ──poll──▶ phone
   │                                       │
   └── localStorage queue                  └── calendar, email, notes, repo
       (survives no signal)
```

1. **Capture.** The text goes into a local queue first, then to Supabase. If the network is gone it stays queued and the UI says so honestly.
2. **Wake.** An `after insert` trigger calls an agent endpoint through `pg_net`, asynchronously, so the insert returns to the phone without waiting on anyone else's API. A cooldown means a burst of captures wakes one agent, not five. See [`db/002_wake_agent.sql`](db/002_wake_agent.sql).
3. **Act.** The agent reads the new rows, does the work, writes back what it did, and marks the capture handled.
4. **Reflect.** The app polls and shows the outcome. The whole loop is a few seconds to wake and under a minute to finish.

### The parts worth reading

| | |
|---|---|
| [`app/app.js`](app/app.js) | The whole client. Rendering, the offline queue, auth, polling. |
| [`db/001_schema.sql`](db/001_schema.sql) | Four tables, all scoped to `auth.uid()` by RLS. |
| [`db/002_wake_agent.sql`](db/002_wake_agent.sql) | The debounced trigger, and why it can't lose a capture. |
| [`app/sw.js`](app/sw.js) | Cache-first shell, network-only data. |

---

## Things that were harder than they looked

**A 200 that wrote nothing.** Sending with `Prefer: resolution=merge-duplicates` puts PostgREST on its upsert path, which under some policy shapes writes zero rows and still returns `200` with an empty body. The client then called `.json()` on nothing and threw `The string did not match the expected pattern` — a parse error standing in front of a silent data loss bug. The fix is in two halves: never blind-parse a response body, and never trust a status code. The client asks for the row back and checks the id it gets is the id it sent.

**`auth.uid()` is NULL inside a `security definer` trigger.** It doesn't run as a signed-in user, so anything written from that side must set `user_id` explicitly or die on the not-null constraint. Obvious afterwards.

**Time is not a number.** A class ends at a wall-clock minute in a named timezone; an all-day deadline has no time at all. Collapsing both into a timestamp made 21:00 reminders sort above 11:40 ones and made deadlines expire at midnight UTC. `day` is a `date` and stays a `date`.

**A poll that cancelled its own backoff.** A 4-second refresh loop cleared the 15-second retry timer, so a failing capture retried four times a second forever. Only real events clear a backoff now.

---

## Running it

You need a [Supabase](https://supabase.com) project. Everything else is static files.

```bash
git clone https://github.com/YOUR-NAME/Desky
cd Desky

# 1. database
#    run db/001_schema.sql then db/002_wake_agent.sql in the SQL editor

# 2. connection
cp app/config.example.js app/config.js
#    fill in your project URL and publishable key

# 3. serve
npx serve app
```

Then enable email auth in Supabase and sign in.

The **publishable key is meant to ship in the browser.** It identifies the project; it does not grant access. Row-level security is what protects the data — every policy is scoped to `auth.uid()`, enforced by Postgres, so a signed-in user can only ever touch their own rows. The service-role key and the agent token never leave the server.

To deploy, point Vercel at the repo. [`vercel.json`](vercel.json) serves `app/` as the root.

### Your own term

The timetable, courses and per-session topics in [`app/app.js`](app/app.js) are a demo term. Replace `COURSES`, `SESSIONS`, `WEEK` and `PLACES` with yours — they are plain data at the top of the file, deliberately, so this is a five-minute edit and not a schema migration.

---

## Design notes

A few decisions that are load-bearing:

- **The room number is the largest text on the screen.** You open this app while walking to a building. Everything else is secondary to *which door*.
- **Finished things leave.** A class that ended or a reminder whose moment passed drops off the day rather than dimming to 38% and staying forever. All-day deadlines stay all day, because they are deadlines, not appointments.
- **One screen, one row shape.** Tick boxes appear on exactly one tab. A list that mixes things you read with things you act on teaches you to trust neither.
- **Never a dead end.** After the last class the header rolls forward to the next day that has one, and says "In class now" when you're sitting in one.
- **Honest status.** If a sync failed, the screen says so. Silence is the failure mode that trains people to stop believing the app.

Single dark theme, on purpose: it's used at night and in corridors, and one committed palette reads better than a compromised pair.

---

## Licence

MIT. See [LICENSE](LICENSE).

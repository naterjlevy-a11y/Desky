/* Demo backend.
 *
 * config.js names a Supabase project and is gitignored, so it does not exist in
 * a fresh clone or on a public deploy. app.js used to import it statically,
 * which meant the module failed to load and anyone opening the link got a blank
 * page and a console error.
 *
 * When config is missing, app.js falls back to this: the same three tables, the
 * same PostgREST-shaped responses, backed by localStorage and seeded with a
 * plausible week. Captures you type are really stored, so the offline queue and
 * the send path can be exercised. Nothing leaves the browser.
 */

const KEY = "desk.demo.v1";

const iso = (d) => d.toISOString();
const dayISO = (d) => d.toISOString().slice(0, 10);
const shift = (days, h = 0, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d;
};
const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

function seed() {
  const cls = (dayOffset, h, m, endH, endM, title, location, course) => ({
    id: uid(),
    day: dayISO(shift(dayOffset)),
    starts_at: iso(shift(dayOffset, h, m)),
    ends_at: iso(shift(dayOffset, endH, endM)),
    title,
    location,
    course,
    kind: "class",
    note: null,
  });

  return {
    captures: [
      {
        id: uid(),
        text: "move the MATH 201 problem set to Thursday morning",
        said_at: iso(shift(0, 9, 12)),
        status: "done",
        lane: "school",
        category: "reschedule",
        outcome: "Moved to Thursday 10:15. Nothing else was in that block.",
        handled_at: iso(shift(0, 9, 12)),
      },
      {
        id: uid(),
        text: "quiz got moved to Wednesday, it is in class not online",
        said_at: iso(shift(0, 8, 40)),
        status: "done",
        lane: "school",
        category: "deadline",
        outcome: "Added Wednesday 10:35 and flagged the room.",
        handled_at: iso(shift(0, 8, 41)),
      },
      {
        id: uid(),
        text: "ask about the second lab section before add drop closes",
        said_at: iso(shift(-1, 17, 5)),
        status: "new",
        lane: null,
        category: null,
        outcome: null,
        handled_at: null,
      },
    ],
    cards: [
      {
        id: uid(),
        section: "due",
        title: "ENGR 210 — Assignment 1",
        body: "Truss analysis, the whole problem set.",
        url: null,
        due: dayISO(shift(3)),
        pinned: false,
        done: false,
        created_at: iso(shift(-4)),
      },
      {
        id: uid(),
        section: "due",
        title: "MATH 201 problem set 2",
        body: null,
        url: null,
        due: dayISO(shift(5)),
        pinned: false,
        done: false,
        created_at: iso(shift(-2)),
      },
      {
        id: uid(),
        section: "ask",
        title: "Which lab section has room?",
        body: "Add/drop closes at the end of next week.",
        url: null,
        due: null,
        pinned: true,
        done: false,
        created_at: iso(shift(-1)),
      },
    ],
    agenda: [
      // Aligned to the fictional timetable already baked into app.js (WEEK /
      // SESSIONS). Seeding real McGill courses here made the demo contradict
      // itself: the class strip said ENGR 210 and the agenda said MATH 338.
      cls(0, 10, 0, 11, 20, "Statics and Mechanics", "SCI 240", "ENGR 210"),
      cls(0, 13, 0, 14, 20, "Intro to Computing", "TECH 200", "CMPT 130"),
      cls(1, 9, 0, 9, 50, "Calculus II", "MATH 120", "MATH 201"),
      cls(1, 17, 0, 18, 20, "Technical Communication", "ARTS 110", "COMM 150"),
      cls(2, 10, 0, 11, 20, "Statics and Mechanics", "SCI 240", "ENGR 210"),
      {
        id: uid(),
        day: dayISO(shift(1)),
        starts_at: iso(shift(1, 10, 0)),
        ends_at: iso(shift(1, 11, 20)),
        title: "Quiz 1",
        location: "SCI 240",
        course: "ENGR 210",
        kind: "exam",
        note: "In class, on paper.",
      },
    ],
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

/** Pull `table` and any `col=eq.value` filters out of a PostgREST path. */
function parsePath(path) {
  const [table, qs = ""] = path.split("?");
  const q = new URLSearchParams(qs);
  const eq = {};
  for (const [k, v] of q.entries()) {
    if (k === "select" || k === "order" || k === "limit") continue;
    const m = String(v).match(/^eq\.(.*)$/);
    if (m) eq[k] = m[1];
  }
  return { table, q, eq };
}

/**
 * Stand-in for api(). Same call shape, same return shape: an array for reads,
 * the written rows for an insert asking for a representation.
 */
export async function demoApi(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const { table, q, eq } = parsePath(path);
  const db = read();
  const rows = db[table];
  if (!rows) throw new Error(`404 no such table ${table}`);

  if (method === "GET") {
    let out = rows.filter((r) =>
      Object.entries(eq).every(([k, v]) => String(r[k]) === v)
    );
    const done = q.get("done");
    if (done === "eq.false") out = out.filter((r) => !r.done);
    const gte = q.get("day");
    if (gte && gte.startsWith("gte.")) {
      const cut = gte.slice(4);
      out = out.filter((r) => r.day >= cut);
    }
    const order = q.get("order") || "";
    if (order.startsWith("said_at.desc")) {
      out = [...out].sort((a, b) => String(b.said_at).localeCompare(String(a.said_at)));
    } else if (order.startsWith("day.asc")) {
      out = [...out].sort(
        (a, b) =>
          String(a.day).localeCompare(String(b.day)) ||
          String(a.starts_at || "").localeCompare(String(b.starts_at || ""))
      );
    } else if (order.startsWith("due.asc")) {
      // nullslast
      out = [...out].sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      });
    }
    const limit = Number(q.get("limit") || 0);
    return limit ? out.slice(0, limit) : out;
  }

  if (method === "POST") {
    const body = JSON.parse(opts.body || "{}");
    // A real insert rejects a duplicate primary key with 409, and app.js relies
    // on that to treat a retried capture as already saved.
    if (rows.some((r) => r.id === body.id)) {
      const err = new Error("409 duplicate key");
      err.status = 409;
      throw err;
    }
    const row = { status: "new", lane: null, category: null, outcome: null, handled_at: null, ...body };
    rows.unshift(row);
    write(db);
    return [row];
  }

  if (method === "PATCH") {
    const body = JSON.parse(opts.body || "{}");
    let n = 0;
    for (const r of rows) {
      if (Object.entries(eq).every(([k, v]) => String(r[k]) === v)) {
        Object.assign(r, body);
        n++;
      }
    }
    write(db);
    return n ? [{}] : [];
  }

  if (method === "DELETE") {
    const keep = rows.filter(
      (r) => !Object.entries(eq).every(([k, v]) => String(r[k]) === v)
    );
    db[table] = keep;
    write(db);
    return [];
  }

  throw new Error(`405 ${method}`);
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

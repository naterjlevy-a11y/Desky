import { SUPABASE_URL, SUPABASE_KEY } from "/config.js";

const VERSION = "8.0.0";
const TZ = "America/Toronto";
const AUTH = "desk.auth";
const QUEUE = "desk.queue";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const link = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g,
  (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

// Kept deliberately short. The routine already knows where to look and what
// to do with what it finds; repeating that here just gives it more to misread.
const COMMANDS = {
  granola: "Check Granola for new lectures and file them.",
  goodnotes: "Check the GoodNotes folder in my Drive for new pages and file them.",
};

/* Everything from the syllabi that is worth having in your pocket. Kept in the
   app rather than fetched so it works with no signal, standing in a corridor. */
const COURSES = {
  "ENGR 210": {
    name: "Statics and Mechanics of Materials", colour: "#D9694F",
    when: [["Tue/Thu", "10:00-11:20", "SCI 240", "Lecture"],
           ["Fri", "14:00-15:50", "SHOP 110", "Lab"]],
    people: [["Dr. R. Okafor", "r.okafor@example.edu", "Instructor - SCI 318, Tue after class"],
             ["M. Petrov", "m.petrov@example.edu", "TA"]],
    grading: [["Midterm 1", 15], ["Midterm 2", 15], ["Labs", 20],
              ["Problem sets", 10], ["Final", 40]],
    dates: [["2026-09-18", "Problem set 1 due"],
            ["2026-10-09", "Midterm 1", "closed book, formula sheet given"],
            ["2026-11-06", "Midterm 2"],
            ["2026-11-27", "Lab report due"]],
    notes: ["Formula sheet is provided - do not spend the term memorising it.",
            "Labs are marked on the report, not on attendance.",
            "Text: Hibbeler, Statics, 14th ed."],
  },
  "MATH 201": {
    name: "Linear Algebra", colour: "#7FA8C4",
    when: [["Mon/Wed/Fri", "09:00-09:50", "MATH 120", "Lecture"],
           ["Wed", "16:00-16:50", "MATH 015", "Tutorial"]],
    people: [["Dr. A. Lindqvist", "a.lindqvist@example.edu", "Instructor"]],
    grading: [["Weekly homework", 15], ["Midterm", 25], ["Final", 60]],
    dates: [["2026-09-13", "Homework 1 due"], ["2026-10-19", "Midterm, evening"]],
    notes: ["Homework is out Friday and due the Sunday of the following week.",
            "The midterm is replaced by the final if the final grade is higher."],
  },
  "CMPT 130": {
    name: "Programming for Engineers", colour: "#8FBF9B",
    when: [["Tue", "13:00-14:20", "TECH 200", "Lecture"],
           ["Thu", "13:00-14:20", "TECH 200", "Lecture"]],
    people: [["Dr. S. Haddad", "cmpt130@example.edu", "Course email, not personal"]],
    grading: [["Assignments", 30], ["Quizzes", 10], ["Midterm", 20], ["Final", 40]],
    dates: [["2026-09-16", "Quiz 0 due, 23:59", "ungraded, but you only get the mark if you do it"],
            ["2026-10-07", "Midterm, 18:30-20:30", "room posted the week before"]],
    notes: ["Questions go on the discussion board, not email.",
            "Book the in-person programming test early - the late slots fill up."],
  },
  "HIST 215": {
    name: "History of Science", colour: "#C4A87F",
    when: [["Mon/Wed/Fri", "11:00-11:50", "ARTS 305", "Lecture"]],
    people: [["Dr. J. Mwangi", "https://example.edu/hist215", "The course blog is the real syllabus"]],
    grading: [["Essay 1", 25], ["Midterm", 25], ["Essay 2", 50]],
    dates: [["2026-10-16", "Midterm", "closed book"], ["2026-11-20", "Essay 2 due"]],
    notes: ["Reading is the whole course. Falling a week behind costs a weekend.",
            "Counts as a complementary studies credit."],
  },
  "COMM 150": {
    name: "Engineering Practice and Communication", colour: "#C58FBF",
    when: [["Wed", "17:00-18:20", "ARTS 110", "Lecture"],
           ["Fri", "15:00-16:20", "ARTS 110", "Lecture"],
           ["Thu", "08:30-09:50", "LIB 220", "Tutorial"]],
    people: [["Dr. L. Chen", "l.chen@example.edu", "Office hours Tue, on Zoom"],
             ["R. Sandberg", "r.sandberg@example.edu", "By appointment"]],
    grading: [["Portfolio (ongoing)", 15], ["Teamwork", 7], ["Class activities", 15],
              ["Reflective paper", 15], ["Team proposal", 5],
              ["Lit review outline", 10], ["Literature review", 10],
              ["Oral presentation", 20], ["Self-assessment", 3]],
    dates: [["2026-09-23", "Team contract"], ["2026-09-25", "Self-assessment"],
            ["2026-10-22", "Team proposal"],
            ["2026-11-04", "Oral presentation, 23:59", "20% - must submit to pass"],
            ["2026-12-04", "Reflective paper AND literature review", "both the same night"]],
    notes: ["Every assignment worth 20% or more must be submitted to pass.",
            "Late: 48h grace free, next 48h at 50%, then 0.",
            "Announcements go through the course site, not email."],
  },
};

/* What you will actually be doing in a given class, by date range. Only what
   the syllabi genuinely say - where a course does not
   publish per-session topics, this stays empty and the app says so rather
   than inventing a plausible-sounding one. */
const SESSIONS = {
  // Per-date topics, where the course publishes them. A course with no entry
  // here simply shows no topic - the screen says so rather than guessing.
  "COMM 150": [
    ["2026-09-02", "2026-09-02", "Communication and the writing process. The 7 Cs."],
    ["2026-09-04", "2026-09-04", "Introduction to the profession. Accreditation."],
    ["2026-09-09", "2026-09-09", "Audience, purpose, organization, style. PREP: read ch 1-2 and rank the survival scenario (20 min)."],
    ["2026-09-11", "2026-09-11", "Team building. In class: your team norms contract."],
    ["2026-09-16", "2026-09-16", "Thesis statements and literature reviews. PREP: SUBMIT THE FRAMEWORK ASSIGNMENT."],
    ["2026-09-18", "2026-09-18", "Engineering for sustainability. Guest lecture."],
    ["2026-09-23", "2026-09-23", "Collaborative writing. First team meeting in class."],
    ["2026-09-25", "2026-09-25", "Design principles. Timed team design challenge."],
    ["2026-09-30", "2026-09-30", "Oral presentations - norms, slides. PREP: ch 8."],
    ["2026-10-02", "2026-10-02", "Professional values and responsibility. PREP: 4 videos plus the case study (60 min)."],
    ["2026-10-07", "2026-10-07", "Data visualization, tables, figures. PREP: ch 3."],
    ["2026-10-16", "2026-10-16", "Ethics in engineering. PREP: 3 videos and six scenarios (60 min)."],
    ["2026-10-21", "2026-10-21", "Citations, plagiarism, AI ethics. PREP: ch 6."],
    ["2026-10-23", "2026-10-23", "AI in engineering. Team activity."],
    ["2026-10-28", "2026-10-28", "Paragraphs and outlines. Edit draft 1 in class."],
    ["2026-11-04", "2026-11-04", "Rhetoric: ethos, logos, pathos."],
    ["2026-11-06", "2026-11-06", "Guest: the professional order."],
    ["2026-11-11", "2026-11-11", "Writing technical introductions."],
    ["2026-11-13", "2026-11-13", "Equity and inclusion in practice."],
    ["2026-11-18", "2026-11-18", "Editing: concision and parallelism."],
    ["2026-11-20", "2026-11-20", "Project and risk management."],
    ["2026-11-25", "2026-11-25", "Abstracts and executive summaries."],
    ["2026-11-27", "2026-11-27", "Health and safety."],
    ["2026-12-02", "2026-12-02", "Peer review - giving and receiving feedback."],
    ["2026-12-04", "2026-12-04", "Wrap-up."],
  ],
  "ENGR 210": [
    ["2026-09-01", "2026-09-25", "Equilibrium of particles and rigid bodies."],
    ["2026-09-28", "2026-10-23", "Trusses, frames, internal forces."],
    ["2026-10-26", "2026-11-20", "Stress, strain, axial loading."],
    ["2026-11-23", "2026-12-04", "Torsion and bending. Review."],
  ],
};

function topicFor(code, dayISO) {
  for (const [from, to, topic] of SESSIONS[code] || []) {
    if (dayISO >= from && dayISO <= to) return topic;
  }
  return null;
}

const WEEK = [
  ["Mon", "09:00", "09:50", "MATH 201", "MATH 120"],
  ["Mon", "11:00", "11:50", "HIST 215", "ARTS 305"],
  ["Tue", "10:00", "11:20", "ENGR 210", "SCI 240"],
  ["Tue", "13:00", "14:20", "CMPT 130", "TECH 200"],
  ["Wed", "09:00", "09:50", "MATH 201", "MATH 120"],
  ["Wed", "11:00", "11:50", "HIST 215", "ARTS 305"],
  ["Wed", "16:00", "16:50", "MATH 201 tutorial", "MATH 015"],
  ["Wed", "17:00", "18:20", "COMM 150", "ARTS 110"],
  ["Thu", "08:30", "09:50", "COMM 150 tutorial", "LIB 220"],
  ["Thu", "10:00", "11:20", "ENGR 210", "SCI 240"],
  ["Thu", "13:00", "14:20", "CMPT 130", "TECH 200"],
  ["Fri", "09:00", "09:50", "MATH 201", "MATH 120"],
  ["Fri", "11:00", "11:50", "HIST 215", "ARTS 305"],
  ["Fri", "14:00", "15:50", "ENGR 210 lab", "SHOP 110"],
  ["Fri", "15:00", "16:20", "COMM 150", "ARTS 110"],
];

function parts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}
const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const nowMin = () => { const p = parts(); return +p.hour * 60 + +p.minute; };
const todayISO = () => { const p = parts(); return `${p.year}-${p.month}-${p.day}`; };
const daysUntil = (iso) =>
  Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(todayISO() + "T00:00:00Z")) / 864e5);

/* Days the timetable does NOT run. WEEK used to be applied blindly to whatever
   weekday it was, so the app would have marched you into a lecture hall on the
   Friday of reading break. Source: the registrar's key dates - reading break
   is Fri Oct 9 to Wed Oct 14 inclusive. */
const NO_CLASS = {
  "2026-09-07": "Labour Day",
  "2026-10-09": "Reading break",
  "2026-10-12": "Thanksgiving",
  "2026-10-13": "Reading break",
  "2026-10-14": "Reading break",
};

/* Thu Dec 3 runs a MONDAY timetable - a makeup day. Monday's classes
   happen that Thursday; Thursday's do not. */
const DAY_OVERRIDE = { "2026-12-03": "Mon" };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isoPlus = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");       // midday, so no DST edge can shift the date
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso) => DAYS[new Date(iso + "T12:00:00Z").getUTCDay()];

// Which weekday's timetable a date actually runs. null means no classes at all.
const scheduleDay = (iso) => (NO_CLASS[iso] ? null : DAY_OVERRIDE[iso] || weekdayOf(iso));

/* The single source of truth for "the classes on this date". openSession
   indexes into this same list, so it must never be computed two ways. */
const rowsOn = (iso) => { const d = scheduleDay(iso); return d ? WEEK.filter((r) => r[0] === d) : []; };

const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let session = load(AUTH, null);
let queue = load(QUEUE, []);
let captures = [];
let cards = [];
let agenda = [];               // calendar mirrored in by the routine
let onlyOpen = false;          // Inbox filter: false = everything
let expanded = new Set();
let lastError = "";

/* -- auth -------------------------------------------------- */
async function signInWithPassword(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Supabase returns the same "invalid login credentials" whether the
    // password is wrong or none was ever set. Say the useful thing.
    const raw = d.error_description || d.msg || d.message || "";
    throw new Error(/invalid login/i.test(raw)
      ? "Wrong email or password. If you haven't set one yet, use the email link below."
      : (raw || `Sign-in failed (${r.status})`));
  }
  session = { access_token: d.access_token, refresh_token: d.refresh_token,
              expires_at: Date.now() + (d.expires_in || 3600) * 1000,
              email: d.user?.email };
  put(AUTH, session);
}

async function setPassword(password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`,
               "Content-Type": "application/json" },
    body: JSON.stringify({ password }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.msg || d.error_description || `Failed (${r.status})`);
}

async function sendReset(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, options: { redirect_to: location.origin } }) });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.msg || d.error_description || `Failed (${r.status})`);
  }
}

async function magicLink(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true,
      options: { email_redirect_to: location.origin } }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).msg || `Sign-in failed (${r.status})`);
}

let arrivedForReset = false;

function tokensFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const at = h.get("access_token");
  if (!at) return;
  // A reset link signs you in AND says why. Catch it so we can ask for the
  // new password straight away instead of dropping you into the app.
  arrivedForReset = h.get("type") === "recovery";
  session = { access_token: at, refresh_token: h.get("refresh_token"),
              expires_at: Date.now() + (+h.get("expires_in") || 3600) * 1000 };
  put(AUTH, session);
  history.replaceState(null, "", location.pathname);
}

async function askForNewPassword() {
  for (;;) {
    const pw = prompt("Choose a new password (at least 6 characters).\nYou will use this and your email to sign in from now on.");
    if (pw === null) return;                       // dismissed; they stay signed in
    if (pw.length < 6) { alert("Too short - use at least 6 characters."); continue; }
    try {
      await setPassword(pw);
      toast("Password set. Use your email and that password from now on.");
      return;
    } catch (e) {
      alert(`Could not set it: ${e.message}`);
      return;
    }
  }
}

async function refresh() {
  if (!session?.refresh_token) return false;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }) });
  if (!r.ok) { session = null; put(AUTH, null); return false; }
  const d = await r.json();
  session = { access_token: d.access_token, refresh_token: d.refresh_token,
              expires_at: Date.now() + (d.expires_in || 3600) * 1000,
              email: d.user?.email ?? session.email };
  put(AUTH, session);
  return true;
}

async function api(path, opts = {}) {
  if (!session) throw new Error("signed out");
  if (Date.now() > session.expires_at - 60000) await refresh();
  if (!session) throw new Error("signed out");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`,
               "Content-Type": "application/json", ...(opts.headers || {}) } });

  if (r.status === 401) { if (await refresh()) return api(path, opts); throw new Error("signed out"); }

  // Never hand an empty body to JSON.parse. Safari throws
  // "The string did not match the expected pattern" and the real status is lost.
  const raw = await r.text().catch(() => "");
  let body = null;
  if (raw) { try { body = JSON.parse(raw); } catch { body = raw; } }

  if (!r.ok) {
    const detail = body && typeof body === "object"
      ? (body.message || body.hint || JSON.stringify(body)) : String(body || "");
    const err = new Error(`${r.status} ${detail}`.trim().slice(0, 200));
    err.status = r.status;
    throw err;
  }
  return body;
}

/* -- capture ----------------------------------------------- */
const uuid = () => crypto.randomUUID ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4))).toString(16));

function capture(text) {
  queue.unshift({ id: uuid(), text, said_at: new Date().toISOString() });
  put(QUEUE, queue);
  render();
  flush();
}

let flushing = false;
let retryAt = 0;

async function sendOne(item) {
  // A plain insert. NOT an upsert: `resolution=merge-duplicates` made PostgREST
  // answer 200 with Content-Range */* -- zero rows written -- while the client
  // believed it had succeeded. Captures vanished into a 200.
  //
  // `return=representation` makes the server hand back the row it actually
  // wrote, so success is something we verify rather than assume.
  try {
    const rows = await api("captures", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: item.id, text: item.text, said_at: item.said_at }),
    });
    const saved = Array.isArray(rows) ? rows[0] : rows;
    if (!saved || saved.id !== item.id) {
      throw new Error("server accepted the request but wrote no row");
    }
    return true;
  } catch (e) {
    // 409 = this id is already in the table. A previous attempt did land;
    // the acknowledgement just never made it back. Treat as saved.
    if (e.status === 409) return true;
    throw e;
  }
}

async function flush() {
  // Deliberately does NOT depend on knowing the user id. The captures table
  // defaults user_id to auth.uid(), so the token alone is enough. Requiring a
  // separate lookup is what used to strand captures on the phone forever.
  if (flushing || !navigator.onLine || !session || !queue.length) return;
  if (Date.now() < retryAt) return;
  flushing = true;
  try {
    while (queue.length) {
      const item = queue[queue.length - 1];   // oldest first
      await sendOne(item);                    // throws unless the row is confirmed
      queue.pop();
      put(QUEUE, queue);
      lastError = "";
    }
    await pull();
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("signed out")) { showGate(); return; }
    // Back off, but keep trying. A capture is never dropped.
    lastError = msg;
    retryAt = Date.now() + 15000;
    setTimeout(flush, 15000);
  } finally {
    flushing = false;
    render();
  }
}

let lastPull = 0;
let pulling = false;

async function pull() {
  // Used to swallow every error. When the laptop slept and the token expired,
  // this failed forever in silence and the app just showed yesterday.
  if (pulling) return;
  pulling = true;
  try {
    const [c, k, a] = await Promise.all([
      api("captures?select=*&order=said_at.desc&limit=100"),
      api("cards?select=*&done=eq.false&order=due.asc.nullslast&limit=80"),
      api(`agenda?select=*&day=gte.${isoPlus(todayISO(), -7)}&order=day.asc,starts_at.asc&limit=160`),
    ]);
    captures = c || []; cards = k || []; agenda = a || [];
    lastPull = Date.now();
    lastError = "";
    render();
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("signed out")) { showGate(); return; }
    lastError = `couldn't refresh -- ${msg}`;
    render();
  } finally {
    pulling = false;
  }
}

/* -- render ------------------------------------------------ */
const codeOf = (label) => (label.match(/^[A-Z]{4} \d{3}/) || [null])[0];

/* Building codes read as course codes. "ARTS 110" next to "COMM 150" is
   genuinely confusing, so anywhere there is room to spell it, spell it. */
const PLACES = {
  "SCI 240":   "Science Building 240",
  "SHOP 110":  "Machine Shop 110",
  "MATH 120":  "Mathematics 120",
  "MATH 015":  "Mathematics 015",
  "TECH 200":  "Technology Building 200",
  "ARTS 305":  "Arts Building 305",
  "ARTS 110":  "Arts Building 110",
  "LIB 220":   "Library 220",
};

/* A small marker on a class row when something is attached to it. Kept to a
   handful of glyphs so a glance is enough: is there an exam, is something due. */
function markFor(what) {
  const w = what.toLowerCase();
  if (/exam|midterm|quiz|test/.test(w))            return { g: "!", cls: "exam",  label: what };
  if (/competition|grading|presentation/.test(w))  return { g: "*", cls: "big",   label: what };
  if (/due|submission|report|assignment/.test(w))  return { g: "^", cls: "due",   label: what };
  return { g: "-", cls: "", label: what };
}

// Everything attached to one course within `days`, syllabus dates + agenda rows.
function forCourse(code, days) {
  const out = (COURSES[code]?.dates || [])
    .map((d) => ({ iso: d[0], what: d[1], note: d[2], away: daysUntil(d[0]) }))
    .filter((d) => d.away >= 0 && d.away <= days);
  for (const a of agenda) {
    if (a.course !== code || a.kind === "class") continue;
    const away = daysUntil(a.day);
    if (away >= 0 && away <= days) out.push({ iso: a.day, what: a.title, note: a.note, away });
  }
  return out.sort((a, b) => a.away - b.away);
}

// Everything on the calendar for one day that is not a timetabled class.
function agendaFor(dayISO) {
  return agenda.filter((a) => a.day === dayISO && a.kind !== "class");
}

// Minutes into the day for a timestamp, read in the app's timezone.
const minOf = (ts) => { const p = parts(new Date(ts)); return +p.hour * 60 + +p.minute; };
const hhmm = (ts) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ,
  hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));

/* Today is ONE list, in time order. It used to be two: the classes, then every
   calendar item appended underneath in whatever order the rows arrived - which
   is how a 21:00 reminder ended up sitting above an 11:40 one. Nothing ever
   left the list either, so the day only ever grew. Finished things now drop
   out; the count stays behind one tap on the rare occasion he wants it back. */
function entriesFor(dayISO) {
  const isToday = dayISO === todayISO();
  const n = nowMin();
  const out = rowsOn(dayISO).map((row) => ({ row }));
  // idx is the position within THAT DAY's rows - openSession indexes the same
  // filtered list, which is why it has to take the date as well as the index.
  out.forEach((e, i) => { e.idx = i; e.from = toMin(e.row[1]); e.to = toMin(e.row[2]);
                          e.code = codeOf(e.row[3]); });

  for (const a of agendaFor(dayISO)) {
    const from = a.starts_at ? minOf(a.starts_at) : null;
    // No end time means a moment, not a block. Half an hour is long enough to
    // still be useful and short enough that it clears itself off the screen.
    const to = a.ends_at ? minOf(a.ends_at) : from === null ? null : from + 30;
    out.push({ item: a, from, to });
  }

  // All-day entries have no time at all: they sort to the top and stay there,
  // because they are deadlines rather than appointments.
  out.sort((a, b) => (a.from ?? -1) - (b.from ?? -1));
  for (const e of out) {
    // Only TODAY has a live or a finished state. A Monday row read on a
    // Wednesday is reference, not a to-do, so it is never dimmed or hidden.
    e.live = isToday && e.from !== null && e.from <= n && n <= e.to;
    e.over = isToday && e.to !== null && e.to < n;
    e.day = dayISO;
  }
  return out;
}

/* The room is the largest text on the row.
 *
 * It used to be 13.5px dim underneath a 15.5px course name, which is exactly
 * backwards: he knows which class he has, he is trying to find the door. The
 * name shrinks to a code, the room grows and is spelled out through PLACES,
 * and the topic drops to one clamped line underneath. */
function entryHTML(e, isNext) {
  if (e.row) {
    const r = e.row;
    const c = e.code && COURSES[e.code];
    const attached = e.code ? forCourse(e.code, 14) : [];
    const soonest = attached[0];
    const mark = soonest ? markFor(soonest.what) : null;
    const cls = e.live ? "slot live" : e.over ? "slot gone" : isNext ? "slot now" : "slot";
    // "MECH 292 lab" -> kind "lab"; a bare code means a lecture.
    const kind = e.code ? (r[3].replace(e.code, "").trim() || "Lecture") : r[3];
    const topic = e.code ? topicFor(e.code, e.day) : null;
    return `<div class="${cls}"${e.code ? ` data-session="${esc(e.code)}|${esc(e.day)}|${e.idx}"` : ""}
        ${c ? ` style="--c:${c.colour}"` : ""}>
      <div class="slot-t"><b>${r[1]}</b><br>${r[2]}</div>
      <div>
        <div class="slot-code">${esc(e.code || r[3])}${
          e.live ? '<i class="live-tag">now</i>' : isNext ? '<i class="next-tag">next</i>' : ""}${
          mark && mark.g !== "-" ? `<i class="mark ${mark.cls}" title="${esc(mark.label)}">${mark.g}</i>` : ""}</div>
        <div class="slot-room">${esc(PLACES[r[4]] || r[4])}</div>
        <div class="slot-kind">${esc(kind)}${topic ? ` &middot; ${esc(topic)}` : ""}</div>
      </div>
      ${e.code ? '<span class="act-go" aria-hidden="true">&rsaquo;</span>' : ""}
    </div>`;
  }

  const a = e.item;
  const cls = e.live ? "slot other live" : e.over ? "slot other gone"
            : isNext ? "slot other now" : "slot other";
  return `<div class="${cls}">
    <div class="slot-t"><b>${a.starts_at ? hhmm(a.starts_at) : "&mdash;"}</b>${
      a.ends_at ? `<br>${hhmm(a.ends_at)}` : ""}</div>
    <div>
      <div class="slot-n">${esc(a.title)}${e.live ? '<i class="live-tag">now</i>' : ""}</div>
      ${a.location ? `<div class="slot-r"><b>${esc(a.location)}</b></div>`
        : !a.starts_at ? `<div class="slot-r">Any time today</div>` : ""}
      ${a.note ? `<div class="slot-due">${esc(a.note)}</div>` : ""}
    </div>
  </div>`;
}

let showEarlier = false;
let schoolSeg = "classes";   // always resets to Classes when School is opened
let schoolDay = null;        // ISO being viewed; null means pick automatically

// Monday of the current week. On a weekend, look forward to the next one.
function mondayOf(iso) {
  const wd = DAYS.indexOf(weekdayOf(iso));
  return isoPlus(iso, wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd);
}

/* Which day Classes opens on: today while it still has a class left, otherwise
   the next day that has any. The default is never an empty screen. */
function defaultDay() {
  const t = todayISO();
  const n = nowMin();
  if (rowsOn(t).some((r) => toMin(r[2]) >= n)) return t;
  for (let s = 1; s <= 16; s++) if (rowsOn(isoPlus(t, s)).length) return isoPlus(t, s);
  return t;
}

/* The week is a selector, not a wall of text. Five pills replace fifteen rows
   of 14px type he was never going to read, and every other day is one tap
   away with no scrolling. */
function renderDayStrip(sel) {
  const today = todayISO();
  const mon = mondayOf(today);
  $("daystrip").innerHTML = [0, 1, 2, 3, 4].map((i) => {
    const iso = isoPlus(mon, i);
    const n = rowsOn(iso).length;
    const off = NO_CLASS[iso];
    const cls = ["day", iso === sel && "on", iso === today && "istoday", off && "off"]
      .filter(Boolean).join(" ");
    return `<button class="${cls}" data-day="${iso}">
      <span class="day-w">${weekdayOf(iso)}</span>
      <span class="day-n">${+iso.slice(8)}</span>
      <span class="day-c">${n ? "&middot;".repeat(n) : "&mdash;"}</span>
      ${DAY_OVERRIDE[iso] ? `<i class="day-flag">${esc(DAY_OVERRIDE[iso])}</i>` : ""}
    </button>`;
  }).join("");
}

function renderChips() {
  $("chips").innerHTML = Object.entries(COURSES).map(([code, c]) => {
    const [dept, num] = code.split(" ");
    return `<button class="chip-c" data-course="${esc(code)}" style="--c:${c.colour}">
      <span>${esc(dept)}</span><b>${esc(num)}</b></button>`;
  }).join("");
}

/* A day with nothing on it points at the next real class instead of dead-ending. */
function nextClassRow(fromISO) {
  for (let s = 1; s <= 16; s++) {
    const iso = isoPlus(fromISO, s);
    const r = rowsOn(iso).sort((a, b) => toMin(a[1]) - toMin(b[1]))[0];
    if (!r) continue;
    const c = COURSES[codeOf(r[3])];
    return `<div class="slot ahead" data-day="${iso}"${c ? ` style="--c:${c.colour}"` : ""}>
      <div class="slot-t"><b>${weekdayOf(iso)} ${+iso.slice(8)}</b><br>${r[1]}</div>
      <div>
        <div class="slot-code">${esc(codeOf(r[3]) || r[3])}</div>
        <div class="slot-room">${esc(PLACES[r[4]] || r[4])}</div>
        <div class="slot-kind">back to class</div>
      </div>
      <span class="act-go" aria-hidden="true">&rsaquo;</span>
    </div>`;
  }
  return "";
}

function renderToday() {
  const host = $("today");
  const n = nowMin();
  const today = todayISO();
  const day = schoolDay || defaultDay();
  const isToday = day === today;
  const off = NO_CLASS[day];
  const all = entriesFor(day);
  const left = all.filter((e) => !e.over);
  const past = all.filter((e) => e.over);

  const nextI = isToday ? left.findIndex((e) => !e.live) : -1;
  let html = "";

  if (off) {
    html = `<div class="note-day"><b>${esc(off)}</b><span>No classes. Reading break runs Fri 9 &ndash; Wed 14 Oct.</span></div>`
         + nextClassRow(day);
  } else {
    if (DAY_OVERRIDE[day]) {
      html += `<div class="note-day amb"><b>${esc(DAY_OVERRIDE[day])} timetable today.</b></div>`;
    }
    html += left.map((e, i) => entryHTML(e, i === nextI)).join("");
    if (!left.length) {
      html += `<div class="note-day"><b>${past.length
        ? "Done for today." : "Nothing scheduled."}</b></div>` + nextClassRow(day);
    }
    if (past.length) {
      html += `<button class="earlier" id="earlier">${showEarlier
        ? "Hide" : `${past.length} earlier`}</button>`;
      if (showEarlier) html += past.map((e) => entryHTML(e, false)).join("");
    }
  }
  host.innerHTML = html;
  renderDayStrip(day);

  const rows = rowsOn(today);
  paintNext(rows, rows.findIndex((r) => toMin(r[1]) >= n), n);
}

/* The one thing he actually wants, made the biggest thing on the screen:
   what it is, what time, and the room. Never a dead end - after the last
   class of the day it rolls forward to the next day that has one. */
function paintNext(rows, nextIdx, n) {
  const live = rows.find((r) => toMin(r[1]) <= n && n <= toMin(r[2]));
  const setIt = (lbl, name, time, room, c) => {
    $("next-lbl").textContent = lbl;
    $("next-val").textContent = name;
    $("next-det").innerHTML = [time && `<b>${esc(time)}</b>`, room && esc(PLACES[room] || room)]
      .filter(Boolean).join(" &middot; ");
    $("next").style.setProperty("--c", c || "var(--hot)");
  };

  if (live) {
    const c = COURSES[codeOf(live[3])];
    setIt("In class now", live[3], `until ${live[2]}`, live[4], c && c.colour);
    return;
  }
  if (nextIdx >= 0) {
    const r = rows[nextIdx];
    const c = COURSES[codeOf(r[3])];
    const mins = toMin(r[1]) - n;
    const lead = mins <= 60 ? `Next, in ${mins} min` : "Next";
    setIt(lead, r[3], r[1], r[4], c && c.colour);
    return;
  }

  /* Nothing left today. Walk forward by DATE, not by weekday name, so reading
     break and holidays are skipped instead of being marched into. Two weeks is
     enough to clear the longest break in the term. */
  for (let step = 1; step <= 16; step++) {
    const iso = isoPlus(todayISO(), step);
    const next = rowsOn(iso).sort((a, b) => toMin(a[1]) - toMin(b[1]))[0];
    if (!next) continue;
    const c = COURSES[codeOf(next[3])];
    const lbl = step === 1 ? "Tomorrow"
              : step < 7 ? weekdayOf(iso)
              : `${weekdayOf(iso)} ${+iso.slice(8)}/${+iso.slice(5, 7)}`;
    setIt(lbl, next[3], next[1], next[4], c && c.colour);
    return;
  }
  setIt("Next", "Nothing scheduled", "", "", null);
}

const CAT_ORDER = ["school", "internships", "clubs", "sports", "money", "admin", "personal"];
const catRank = (c) => { const i = CAT_ORDER.indexOf(c); return i < 0 ? 99 : i; };

function inboxRow(c, unsent) {
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric",
    month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(c.said_at));
  const open = expanded.has(c.id);
  // Anything not 'new' is settled. 'skipped' is a legal status and used to
  // sit on "working" forever, keeping the unread dot lit with no way to clear it.
  const settled = c.status !== "new";
  const state = unsent ? "unsent" : settled ? "settled" : "wait";
  // Deliberately NOT the word "done" - that collides with a task being done.
  // This only means the routine read it and acted.
  const badge = unsent ? '<span class="state pend">sending</span>'
    : c.status === "skipped" ? '<span class="state">nothing to do</span>'
    : settled ? '<span class="state ok">filed</span>'
    : '<span class="state pend">working</span>';
  const hasMore = !!c.outcome;
  return `<div class="item ${state}${hasMore ? " tappable" : ""}"${hasMore ? ` data-id="${esc(c.id)}"` : ""}>
    <div class="item-t">${link(c.text)}</div>
    <div class="item-f"><span>${when}</span>${badge}${
      hasMore ? `<span class="more">${open ? "hide" : "what happened"}</span>` : ""}</div>
    ${hasMore && open ? `<div class="item-out">${link(c.outcome)}</div>` : ""}
  </div>`;
}

function cardRow(c) {
  const away = c.due ? daysUntil(c.due) : null;
  const urgent = away !== null && away <= 2;
  const soon = away !== null && away <= 7;
  const when = away === null ? ""
    : away < 0 ? `${-away} days overdue`
    : away === 0 ? "today" : away === 1 ? "tomorrow" : `in ${away} days`;
  // The section IS the label - the Tasks tab already means "needs you".
  // A title-text regex used to paint that pill onto School and Work cards too.
  const title = c.title.replace(/^needs you:\s*/i, "");
  const asks = /\?\s*$/.test(title);

  return `<div class="card${urgent ? " urgent" : soon ? " soon" : ""}" data-card="${esc(c.id)}">
    <button class="tick" aria-label="Mark done"></button>
    <div class="card-body">
      <div class="card-t">${c.url
        ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(title)}</a>`
        : esc(title)}</div>
      ${c.body ? `<div class="card-b">${link(c.body)}</div>` : ""}
      ${when ? `<div class="card-when${urgent ? " hot" : ""}">${when}</div>` : ""}
      ${asks ? `<button class="reply" data-reply="${esc(title)}">Answer this</button>` : ""}
    </div>
  </div>`;
}

/* Deadlines straight from the syllabi. "Due soon" used to read only from the
   cards table, so it said "nothing due" on the same screen where the course
   list said an assignment was due in 8 days. */
/* Everything with a date on it, from all three places it can come from.
 *
 * Syllabi are authoritative for wording, the calendar for times, and cards for
 * anything the agent found that no syllabus knows about. They overlap heavily,
 * so a collision MERGES rather than drops - losing "moved earlier in syllabus
 * v4" because the calendar row happened to be seen first would be a real
 * regression.
 *
 * `back` is how many days of already-passed deadlines to keep. Syllabus dates
 * can never be ticked off, so an unbounded overdue list turns into permanent
 * clutter within a month and he stops looking at the screen at all. */
function allDue(back = 7) {
  const norm = (s) => String(s || "").toLowerCase()
    .replace(/^[a-z]{4}\s*\d{3}\s*[-:]?\s*/, "")     // drop a leading course code
    .replace(/[^a-z0-9]/g, "");
  const out = [];

  const add = (item) => {
    const k = norm(item.what);
    const hit = out.find((o) => o.iso === item.iso &&
      (norm(o.what) === k || norm(o.what).startsWith(k) || k.startsWith(norm(o.what))));
    if (!hit) { out.push(item); return; }
    // Keep the earlier (higher-precedence) wording, adopt whatever it lacks.
    for (const f of ["note", "time", "url", "code"]) if (!hit[f] && item[f]) hit[f] = item[f];
  };

  for (const [code, c] of Object.entries(COURSES))
    for (const d of c.dates || [])
      add({ iso: d[0], code, what: d[1], note: d[2], away: daysUntil(d[0]) });

  for (const a of agenda) {
    if (a.kind === "class") continue;
    add({ iso: a.day, code: a.course || "", what: a.title, note: a.note,
          time: a.starts_at ? (a.ends_at ? `${hhmm(a.starts_at)}–${hhmm(a.ends_at)}`
                                         : hhmm(a.starts_at)) : "",
          away: daysUntil(a.day) });
  }

  // Only DATED school cards. An undated one is a task, not a deadline, and
  // belongs on Tasks where it can actually be ticked off.
  for (const c of cards)
    if (c.section === "school" && c.due)
      add({ iso: c.due, code: "", what: c.title.replace(/^needs you:\s*/i, ""),
            note: c.body, url: c.url, away: daysUntil(c.due) });

  return out
    .filter((d) => d.away >= -back)
    .sort((a, b) => a.away - b.away || String(a.what).localeCompare(String(b.what)));
}

// Kept for the Desk, which only ever asks "how much is coming up".
const syllabusDue = (withinDays) => allDue(0).filter((d) => d.away <= withinDays);

/* ONE row shape for everything in Due, whatever it came from. Nothing here is
   tickable: tick boxes live on Tasks and only on Tasks. Mixing read-only rows
   and tickable rows under one heading is the exact thing he complained about. */
function dueRow(d) {
  const c = COURSES[d.code];
  const m = markFor(d.what);
  const exam = m.cls === "exam";
  const late = d.away < 0;
  const urgent = late || d.away <= 3;
  const when = late ? `${-d.away}d late`
    : d.away === 0 ? "today" : d.away === 1 ? "tomorrow" : `${d.away}d`;
  const meta = [d.time, d.note].filter(Boolean).join(" · ");

  return `<div class="due-row${urgent ? " urgent" : ""}${exam ? " exam" : ""}${c ? " tappable" : ""}"${
      c ? ` data-course="${esc(d.code)}"` : ""} style="--c:${c ? c.colour : "var(--dim)"}">
    <span class="due-when"><b>${when}</b></span>
    <span class="due-body">
      <span class="due-code">${esc(d.code || "University")}${
        m.g !== "-" ? `<i class="mark ${m.cls}" title="${esc(m.label)}">${m.g}</i>` : ""}</span>
      <span class="due-what">${esc(d.what)}</span>
      ${meta ? `<span class="due-note">${esc(meta)}</span>` : ""}
    </span>
    ${c ? '<span class="act-go" aria-hidden="true">&rsaquo;</span>' : ""}
  </div>`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

/* Grouped by time, never by course. Grouping by course would mean scanning
   five lists to answer the only question this screen exists for. Headings
   render only when they have something under them. */
function renderDue() {
  const all = allDue(7);
  const groups = [
    ["Overdue",     (d) => d.away < 0],
    ["Today",       (d) => d.away === 0],
    ["Tomorrow",    (d) => d.away === 1],
    ["Next 7 days", (d) => d.away > 1 && d.away <= 7],
  ];
  let html = "";
  const used = new Set();
  for (const [name, test] of groups) {
    const rows = all.filter((d) => !used.has(d) && test(d));
    rows.forEach((d) => used.add(d));
    if (rows.length) html += `<h3 class="eyebrow">${name}</h3>` + rows.map(dueRow).join("");
  }
  // Everything past the first week gets a month heading - one word each, and
  // together they give him the shape of the term, which is what "show me all
  // the assignments" actually means.
  let month = "";
  for (const d of all.filter((x) => !used.has(x))) {
    const mth = MONTHS[+d.iso.slice(5, 7) - 1];
    if (mth !== month) { month = mth; html += `<h3 class="eyebrow">${mth}</h3>`; }
    html += dueRow(d);
  }
  fill("school-cards", html, "<b>Nothing due.</b> Nothing left on any syllabus.");
  const soon = all.filter((d) => d.away >= 0 && d.away <= 7).length;
  $("seg-due-n").textContent = soon || "";
}

/* One tap used to tick off a whole column of tasks.
 *
 * On a phone a tap fires a synthetic click roughly 300ms after your finger
 * leaves the glass. The old code removed the row and re-rendered the list as
 * soon as the server answered - which took less than that - so every row below
 * jumped up one position. The ghost click then landed on the same screen
 * coordinates, which now belonged to the NEXT card's checkbox. That removed
 * the next row, everything jumped again, and it walked down the list.
 *
 * Three guards, because each one alone still leaves a hole: never process the
 * same card twice, ignore every checkbox for a moment after one fires, and
 * collapse the row in place rather than yanking it out from under the finger.
 */
const ticking = new Set();
let tickLockUntil = 0;

async function completeCard(id, el) {
  if (ticking.has(id) || Date.now() < tickLockUntil) return;
  ticking.add(id);
  tickLockUntil = Date.now() + 600;

  // Freeze the current height so the collapse animates from a real number.
  el.style.height = `${el.offsetHeight}px`;
  el.classList.add("going");
  requestAnimationFrame(() => {
    el.style.height = "0px";
    el.style.paddingTop = "0px";
    el.style.paddingBottom = "0px";
    el.style.marginBottom = "-9px";      // absorb the stack gap
  });

  try {
    await api(`cards?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ done: true }),
    });
    // Let the collapse finish before the list reflows, so nothing jumps while
    // a stray click could still be in flight.
    await new Promise((r) => setTimeout(r, 200));
    cards = cards.filter((c) => c.id !== id);
    render();
  } catch (e) {
    el.style.cssText = "";
    el.classList.remove("going");
    toast(`Couldn't tick that off: ${e.message}`);
  } finally {
    ticking.delete(id);
  }
}

function fill(id, html, emptyMsg) {
  $(id).innerHTML = html || `<div class="empty">${emptyMsg}</div>`;
}

/* -- course list and detail -------------------------------- */
function nextFor(code) {
  const ds = (COURSES[code].dates || [])
    .map((d) => ({ iso: d[0], what: d[1], note: d[2], away: daysUntil(d[0]) }))
    .filter((d) => d.away >= 0)
    .sort((a, b) => a.away - b.away);
  return ds[0] || null;
}

function openCourse(code) {
  const c = COURSES[code];
  if (!c) return;
  const total = c.grading.reduce((s, g) => s + g[1], 0);
  const upcoming = (c.dates || []).map((d) => ({ iso: d[0], what: d[1], note: d[2], away: daysUntil(d[0]) }));

  // What this course means TODAY - the session, and anything attached to it.
  const n = nowMin();
  const todaySlots = rowsOn(todayISO()).filter((r) => codeOf(r[3]) === code);
  const attached = forCourse(code, 10);
  const todayBlock = todaySlots.length ? `
    <h3 class="eyebrow">Today</h3>
    <div class="stack">
      ${todaySlots.map((r) => {
        const live = toMin(r[1]) <= n && n <= toMin(r[2]);
        const gone = toMin(r[2]) < n;
        return `<div class="slot ${live ? "live" : gone ? "gone" : "now"}" style="--c:${c.colour}">
          <div class="slot-t"><b>${r[1]}</b><br>${r[2]}</div>
          <div><div class="slot-n">${esc(r[3].replace(code, "").trim() || "Lecture")}${
            live ? '<i class="live-tag">now</i>' : ""}</div>
            <div class="slot-r"><b>${esc(r[4])}</b></div></div>
        </div>`;
      }).join("")}
      ${attached.filter((d) => d.away <= 1).map((d) => {
        const m = markFor(d.what);
        return `<div class="flag-row ${m.cls}"><i class="mark ${m.cls}">${m.g}</i>
          <span><b>${esc(d.what)}</b>${d.away === 0 ? " - today" : " - tomorrow"}
          ${d.note ? `<em>${esc(d.note)}</em>` : ""}</span></div>`;
      }).join("")}
    </div>` : "";

  $("course-detail").innerHTML = `
    <button class="back" id="back">&lsaquo; School</button>
    <h2 class="ph" style="color:${c.colour}">${esc(code)}</h2>
    <p class="psub">${esc(c.name)}</p>
    ${todayBlock}

    <h3 class="eyebrow">When and where</h3>
    <div class="stack">${c.when.map((w) =>
      `<div class="slot"><div class="slot-t">${esc(w[0])}<br>${esc(w[1])}</div>
        <div><div class="slot-n">${esc(w[3])}</div><div class="slot-r">${esc(w[2])}</div></div></div>`
    ).join("")}</div>

    <h3 class="eyebrow">Who</h3>
    <div class="stack">${c.people.map((p) =>
      `<div class="item"><div class="item-t">${esc(p[0])}</div>
        ${p[1] ? `<div class="item-b">${link(p[1])}</div>` : ""}
        ${p[2] ? `<div class="item-f"><span>${esc(p[2])}</span></div>` : ""}</div>`
    ).join("")}</div>

    <h3 class="eyebrow">What you are graded on</h3>
    <div class="stack"><div class="gradebox">${c.grading.map((g) =>
      `<div class="grow"><span>${esc(g[0])}</span><b>${g[1]}%</b>
        <i style="--w:${g[1] / total * 100}%;--c:${c.colour}"></i></div>`
    ).join("")}</div></div>

    <h3 class="eyebrow">What is ahead</h3>
    <div class="stack">${
      upcoming.filter((d) => d.away >= 0).length
        ? upcoming.filter((d) => d.away >= 0).map((d) =>
            `<div class="item${d.away <= 7 ? " soon" : ""}">
              <div class="item-t">${esc(d.what)}</div>
              ${d.note ? `<div class="item-b">${esc(d.note)}</div>` : ""}
              <div class="item-f"><span class="${d.away <= 7 ? "due" : ""}">${
                d.away === 0 ? "today" : d.away === 1 ? "tomorrow" : `in ${d.away} days`
              }</span><span>${esc(d.iso)}</span></div>
            </div>`).join("")
        : `<div class="empty">Nothing left on the calendar for this course.</div>`
    }</div>

    ${upcoming.some((d) => d.away < 0) ? `<h3 class="eyebrow">Already gone</h3>
      <div class="stack">${upcoming.filter((d) => d.away < 0).map((d) =>
        `<div class="item" style="opacity:.5"><div class="item-t">${esc(d.what)}</div>
          <div class="item-f"><span>${esc(d.iso)}</span></div></div>`).join("")}</div>` : ""}

    <h3 class="eyebrow">Worth knowing</h3>
    <div class="stack">${c.notes.map((n) =>
      `<div class="note-row">${esc(n)}</div>`).join("")}</div>

    ${c.weeks ? `<h3 class="eyebrow">Week by week</h3>
      <div class="scroll"><table><thead><tr><th>Wk</th><th>Reading</th><th>Topic</th></tr></thead>
      <tbody>${c.weeks.map((w) =>
        `<tr><td class="w">${esc(w[0])}</td><td class="w">${esc(w[1])}</td><td>${esc(w[2])}</td></tr>`
      ).join("")}</tbody></table></div>` : ""}
  `;
  $("school-list").hidden = true;
  $("course-detail").hidden = false;
  $("back").addEventListener("click", closeCourse);
  scrollTo({ top: 0 });
}

/* Tapping a class in Today opens THIS session - what you'll be doing in that
   room, in that hour - not the whole syllabus. The syllabus is one tap further. */
/* Takes the DATE as well as the index. It used to index into today's rows no
   matter which day the row came from, which was harmless while only today was
   ever on screen - and wrong the moment the day strip let him tap Monday's
   class on a Wednesday. */
function openSession(code, day, idx) {
  const c = COURSES[code];
  const r = rowsOn(day)[idx];
  if (!c || !r) return;

  const n = nowMin();
  const isToday = day === todayISO();
  const live = isToday && toMin(r[1]) <= n && n <= toMin(r[2]);
  const gone = isToday && toMin(r[2]) < n;
  const topic = topicFor(code, day);
  const attached = forCourse(code, 14);
  const now = attached.filter((d) => d.away <= 2);
  const later = attached.filter((d) => d.away > 2).slice(0, 3);

  $("course-detail").innerHTML = `
    <button class="back" id="back">&lsaquo; School</button>
    <div class="sess-head" style="--c:${c.colour}">
      <span class="sess-code">${esc(code)}</span>
      <h2 class="sess-title">${esc(r[3].replace(code, "").trim() || "Lecture")}</h2>
      <div class="sess-where">
        <b>${r[1]}&ndash;${r[2]}</b>
        <span>${esc(PLACES[r[4]] || r[4])}</span>
        ${live ? '<i class="live-tag">now</i>' : gone ? '<i class="done-tag">finished</i>' : ""}
      </div>
    </div>

    <h3 class="eyebrow">${isToday ? "Today's class"
      : `${weekdayOf(day)} ${+day.slice(8)}/${+day.slice(5, 7)}`}</h3>
    <div class="stack">
      ${topic ? `<div class="topic">${esc(topic)}</div>`
              : `<div class="empty">No topic published for this session. ${
                  esc(c.name)} doesn't post a per-class schedule.</div>`}
    </div>

    ${now.length ? `<h3 class="eyebrow">Attached to this</h3><div class="stack">${
      now.map((d) => {
        const m = markFor(d.what);
        return `<div class="flag-row ${m.cls}"><i class="mark ${m.cls}">${m.g}</i>
          <span><b>${esc(d.what)}</b> ${d.away === 0 ? "today" : d.away === 1 ? "tomorrow" : `in ${d.away} days`}
          ${d.note ? `<em>${esc(d.note)}</em>` : ""}</span></div>`;
      }).join("")}</div>` : ""}

    ${later.length ? `<h3 class="eyebrow">Coming up</h3><div class="stack">${
      later.map((d) => `<div class="mini"><b>${d.away}d</b> ${esc(d.what)}</div>`).join("")
    }</div>` : ""}

    <button class="wide-btn" data-course="${esc(code)}">Everything about ${esc(code)} &rsaquo;</button>
  `;
  $("school-list").hidden = true;
  $("course-detail").hidden = false;
  $("back").addEventListener("click", closeCourse);
  scrollTo({ top: 0 });
}

function closeCourse() {
  $("course-detail").hidden = true;
  $("school-list").hidden = false;
  scrollTo({ top: 0 });
}

function render() {
  renderToday();

  /* Inbox -- newest first. Group headers cost more room than they save until
     there are a lot of rows, so they only appear past a threshold. Never
     group by `lane`: it is a two-value internal field, and it was putting a
     header reading "BEYOND" on screen -- a word used nowhere else in the app. */
  const rows = [
    ...queue.map((c) => ({ ...c, _unsent: true, status: "new" })),
    ...captures,
  ].filter((c) => (onlyOpen ? c.status === "new" : true));

  let inboxHTML;
  if (rows.length > 20) {
    const groups = new Map();
    for (const c of rows) {
      const key = c._unsent ? "sending" : (c.category || "unsorted");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    inboxHTML = [...groups.entries()]
      .sort((a, b) => (a[0] === "sending" ? -1 : b[0] === "sending" ? 1
                       : catRank(a[0]) - catRank(b[0])))
      .map(([cat, list]) => `<h3 class="grp">${esc(cat)}<span>${list.length}</span></h3>` +
        list.map((c) => inboxRow(c, c._unsent)).join("")).join("");
  } else {
    inboxHTML = rows.map((c) => inboxRow(c, c._unsent)).join("");
  }

  fill("inbox", inboxHTML, onlyOpen
    ? "Nothing in flight. Everything you've said has been dealt with."
    : "Nothing yet. Anything you say on the Desk lands here.");

  const working = queue.length + captures.filter((c) => c.status === "new").length;
  const filed = captures.filter((c) => c.status !== "new").length;
  $("inbox-sub").textContent = working ? `${working} working, ${filed} filed`
                                       : `${filed} filed`;
  $("dot-inbox").hidden = working === 0;
  paintInflight(working);

  /* Tasks is the one place with tick boxes, and now the ONLY one. School cards
     used to render underneath the deadline list, so "Due soon" mixed read-only
     dates with things you tick - two row shapes, one heading, and no way to
     tell which was which. Everything you act on is here; Due soon is a list of
     dates you read. The catch-all still matters: a card with section 'else' is
     legal in the schema and used to render on no screen at all. */
  /* Tasks is things you DO. A dated school deadline is not one of those - it
     is a fact about the term, and it lives in School > Due. What stays here is
     everything undated plus anything that is not school or internships, which
     also catches section 'else' - legal in the schema and previously rendered
     on no screen at all. */
  const tasks = cards.filter((c) =>
    c.section !== "internships" && !(c.section === "school" && c.due));
  fill("tasks", tasks.map(cardRow).join(""),
    "Nothing needs you right now. Anything I can't finish myself lands here.");
  $("dot-tasks").hidden = tasks.length === 0;

  renderDue();
  renderChips();

  /* Work. Once the internship agent is running this fills itself; until then
     it says so rather than looking broken. */
  const jobs = cards.filter((c) => c.section === "internships");
  fill("work-cards", jobs.map(cardRow).join(""),
    "Nothing yet. Ask me to go looking for internships and they'll land here.");
  $("work-sub").textContent = jobs.length
    ? `${jobs.length} open${jobs.length === 1 ? "" : "s"} worth a look`
    : "Internships and applications.";

  /* Honest sync state on the Desk. Never show nothing when something is wrong. */
  const s = $("sync");
  if (lastError) {
    s.className = "sync bad";
    s.textContent = queue.length
      ? `${queue.length} not sent -- retrying. ${lastError}`
      : `${lastError} -- tap to retry`;
  } else if (queue.length) {
    s.className = "sync"; s.textContent = `Sending ${queue.length}...`;
  } else if (lastPull) {
    const age = Math.round((Date.now() - lastPull) / 1000);
    s.className = "sync";
    s.textContent = age < 60 ? "Up to date | tap to refresh"
      : `Last checked ${Math.round(age / 60)} min ago | tap to refresh`;
  } else { s.className = "sync"; s.textContent = "Tap to refresh"; }
}

/* The 45-second wait used to be completely silent after 3.6 seconds, which is
   why the same capture got said three times in 17 minutes. This keeps a line
   on the Desk for the whole time, so he never has to leave it to find out. */
let lastWorking = 0;
function paintInflight(working) {
  const el = $("inflight");
  if (working > 0) {
    el.hidden = false;
    el.className = "inflight";
    el.textContent = working === 1 ? "Working on it..." : `Working on ${working}...`;
  } else if (lastWorking > 0) {
    el.hidden = false;
    el.className = "inflight ok";
    el.textContent = lastWorking === 1 ? "Done. Check the Inbox." : "All done. Check the Inbox.";
    setTimeout(() => { if (!$("inflight").textContent.startsWith("Working")) $("inflight").hidden = true; }, 6000);
  } else {
    el.hidden = true;
  }
  lastWorking = working;
}

function tick() {
  const p = parts();
  $("clock").textContent = `${p.weekday} ${p.day}/${p.month} | ${p.hour}:${p.minute}`;
}

let toastT;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("up");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("up"), 2800);
}

/* -- wiring ------------------------------------------------ */
const showGate = () => { $("gate").hidden = false; $("app").hidden = true; };
const showApp = () => { $("gate").hidden = true; $("app").hidden = false; };

$("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("signin"), msg = $("gate-msg");
  const email = $("email").value.trim(), password = $("password").value;
  if (!email || !password) {
    msg.className = "gate-msg bad";
    msg.textContent = "Enter your email and password.";
    return;
  }
  btn.disabled = true; msg.className = "gate-msg"; msg.textContent = "Signing in...";
  try {
    await signInWithPassword(email, password);
    $("password").value = "";
    showApp(); render();
    await flush(); await pull();
  } catch (err) { msg.className = "gate-msg bad"; msg.textContent = err.message; }
  finally { btn.disabled = false; }
});

$("resetpw").addEventListener("click", async () => {
  const msg = $("gate-msg"), email = $("email").value.trim();
  if (!email) {
    msg.className = "gate-msg bad"; msg.textContent = "Enter your email first.";
    return;
  }
  msg.className = "gate-msg"; msg.textContent = "Sending...";
  try {
    await sendReset(email);
    msg.className = "gate-msg good";
    msg.textContent = "Reset link sent. Tap it and the app will ask you for a new password.";
  } catch (err) { msg.className = "gate-msg bad"; msg.textContent = err.message; }
});

// Kept as the way back in if the password is forgotten or was never set.
$("uselink").addEventListener("click", async () => {
  const msg = $("gate-msg"), email = $("email").value.trim();
  if (!email) {
    msg.className = "gate-msg bad"; msg.textContent = "Enter your email first.";
    return;
  }
  msg.className = "gate-msg"; msg.textContent = "Sending...";
  try {
    await magicLink(email);
    msg.className = "gate-msg good";
    msg.textContent = "Check your email and tap the link.";
  } catch (err) { msg.className = "gate-msg bad"; msg.textContent = err.message; }
});

$("setpw").addEventListener("click", async () => {
  const out = $("testout");
  const pw = prompt("Choose a password (at least 6 characters).\nAfter this you can sign in with just email and password.");
  if (pw === null) return;
  if (pw.length < 6) {
    out.className = "sync bad"; out.textContent = "Too short - use at least 6 characters.";
    return;
  }
  out.className = "sync"; out.textContent = "Setting...";
  try {
    await setPassword(pw);
    out.className = "sync good";
    out.textContent = "Password set. You can sign in with email and password from now on.";
  } catch (err) {
    out.className = "sync bad"; out.textContent = `Failed: ${err.message}`;
  }
});

const say = $("say"), hint = $("say-hint");
const HINT = "Hit the mic on your keyboard and talk.";
let hintT;
say.addEventListener("input", () => {
  say.style.height = "auto";
  say.style.height = Math.min(say.scrollHeight, innerHeight * 0.38) + "px";
});
function submit() {
  const text = say.value.trim();
  if (!text) return;
  capture(text);
  say.value = ""; say.style.height = "auto";
  hint.className = "say-hint saved";
  hint.textContent = navigator.onLine ? "Saved. I'm on it."
                                      : "Saved on your phone. Sends when you're back online.";
  clearTimeout(hintT);   // two captures in a row used to wipe the second confirmation early
  hintT = setTimeout(() => { hint.className = "say-hint"; hint.textContent = HINT; }, 3600);
}
$("send").addEventListener("click", submit);
say.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
});

document.querySelectorAll(".act").forEach((b) => {
  b.addEventListener("click", () => {
    capture(COMMANDS[b.dataset.cmd]);
    b.disabled = true;
    toast(b.dataset.cmd === "granola" ? "Looking through Granola" : "Reading your notes");
    setTimeout(() => { b.disabled = false; }, 6000);
  });
});

$("filter").addEventListener("click", (e) => {
  onlyOpen = !onlyOpen;
  // Say what is being shown, not what the button might do - the old label
  // was ambiguous about whether it was a state or an action.
  e.currentTarget.textContent = onlyOpen ? "Showing: working" : "Showing: all";
  e.currentTarget.setAttribute("aria-pressed", String(onlyOpen));
  render();
});

// Classes / Due. Selection deliberately does NOT persist - opening School
// always lands on Classes, because predictable beats clever.
function setSeg(seg) {
  schoolSeg = seg;
  $("v-classes").hidden = seg !== "classes";
  $("v-due").hidden = seg !== "due";
  for (const b of document.querySelectorAll(".seg-b"))
    b.setAttribute("aria-selected", String(b.dataset.seg === seg));
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#earlier")) { showEarlier = !showEarlier; renderToday(); return; }

  const seg = e.target.closest(".seg-b");
  if (seg) { setSeg(seg.dataset.seg); return; }

  // Day pill, or the "back to class" pointer row - both just move the strip.
  const day = e.target.closest("[data-day]");
  if (day) { schoolDay = day.dataset.day; showEarlier = false; renderToday(); return; }

  const tick = e.target.closest(".tick");
  if (tick) {
    const card = tick.closest("[data-card]");
    if (card) completeCard(card.dataset.card, card);
    return;
  }
  const sess = e.target.closest("[data-session]");
  if (sess) {
    const [code, iso, idx] = sess.dataset.session.split("|");
    openSession(code, iso, +idx);
    return;
  }
  const course = e.target.closest("[data-course]");
  if (course) openCourse(course.dataset.course);
});

$("inbox").addEventListener("click", (e) => {
  const row = e.target.closest(".item[data-id]");
  if (!row) return;
  const id = row.getAttribute("data-id");
  expanded.has(id) ? expanded.delete(id) : expanded.add(id);
  render();
});

const PANELS = ["desk", "tasks", "inbox", "school", "work"];
function showPanel(want) {
  document.querySelectorAll(".tabs button").forEach((o) =>
    o.setAttribute("aria-selected", String(o.dataset.panel === want)));
  closeCourse();            // tapping School must land on School, not the last course
  if (want === "school") { setSeg("classes"); schoolDay = null; showEarlier = false; renderToday(); }
  PANELS.forEach((p) => { $("p-" + p).hidden = p !== want; });
  scrollTo({ top: 0 });
}
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => showPanel(b.dataset.panel)));

// The Log lost its place in the tab bar; this is how it is reached now.
$("golog").addEventListener("click", () => showPanel("inbox"));

/* Round-trip test: write a row, read it back, delete it. Proves the whole
   connection without waiting on the routine, and names the exact failure. */
$("selftest").addEventListener("click", async (e) => {
  const out = $("testout"), btn = e.currentTarget;
  btn.disabled = true;
  out.className = "sync"; out.textContent = "Testing";
  const id = uuid();
  try {
    const rows = await api("captures", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id, text: "connection test", said_at: new Date().toISOString(),
                             status: "skipped" }),
    });
    const saved = Array.isArray(rows) ? rows[0] : rows;
    if (!saved || saved.id !== id) throw new Error("wrote nothing");

    const back = await api(`captures?select=id&id=eq.${id}`);
    if (!back?.length) throw new Error("wrote a row but could not read it back");

    await api(`captures?id=eq.${id}`, { method: "DELETE" });
    out.className = "sync good";
    out.textContent = "Connection is good -- write, read and delete all worked.";
  } catch (err) {
    out.className = "sync bad";
    out.textContent = `Failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

$("signout").addEventListener("click", () => {
  session = null; captures = []; cards = []; put(AUTH, null); showGate();
});

function wakeUp(clearBackoff) {
  // Anything that means "the user is looking at this again". A closed laptop
  // suspends timers, and visibilitychange alone is not reliable on resume,
  // so every plausible signal refreshes.
  //
  // Only a real user-facing event clears the backoff. The poll used to reset
  // it too, which meant a failing capture retried every 4s forever and the
  // 15-second backoff never actually applied.
  if (!session) return;
  if (clearBackoff) retryAt = 0;
  flush();
  pull();
}
addEventListener("online", () => { toast("Back online -- syncing"); wakeUp(true); });
addEventListener("offline", () => toast("Offline. Captures are safe on your phone."));
addEventListener("focus", () => wakeUp(true));
addEventListener("pageshow", () => wakeUp(true));
document.addEventListener("visibilitychange", () => { if (!document.hidden) wakeUp(true); });
// 12s, not 4s. The routine takes 30-60s regardless, so polling faster bought
// nothing and cost two REST reads plus a full re-render every 4 seconds.
setInterval(() => { if (!document.hidden) wakeUp(false); }, 12000);

// Tapping the sync line forces a refresh -- a way out if it ever looks stuck.
$("sync").addEventListener("click", () => { toast("Refreshing"); wakeUp(true); });

// Long-press the clock for the debug controls, so they stop occupying the
// main screen permanently.
let holdT;
$("clock").addEventListener("pointerdown", () => {
  holdT = setTimeout(() => {
    const f = $("deskfoot");
    f.hidden = !f.hidden;
    $("ver").textContent = `v${VERSION}`;
  }, 600);
});
["pointerup", "pointerleave", "pointercancel"].forEach((e) =>
  $("clock").addEventListener(e, () => clearTimeout(holdT)));

// A card that asks a question needs an answer route, not just a tick.
document.addEventListener("click", (e) => {
  const r = e.target.closest("[data-reply]");
  if (!r) return;
  document.querySelector('.tabs button[data-panel="desk"]').click();
  say.value = `About "${r.dataset.reply}" - `;
  say.focus();
  say.setSelectionRange(say.value.length, say.value.length);
});

/* -- boot -------------------------------------------------- */
(async function boot() {
  tick(); setInterval(tick, 30000);
  tokensFromHash();
  if (!session) { showGate(); }
  else {
    showApp(); render();
    await flush();
    await pull();
    if (arrivedForReset) await askForNewPassword();
    else if (matchMedia("(display-mode: standalone)").matches) say.focus();
  }
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("/sw.js"); } catch {}
  }
})();

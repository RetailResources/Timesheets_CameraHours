// Parsing/formatting helpers shared by the browser app and the node tests.
export const BLANK = "—";

const isBlank = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/** "HH:MM[:SS]" (24h) or ISO datetime -> "h:MM AM/PM"; blank -> "—". */
export function formatClock(v) {
  if (isBlank(v)) return BLANK;
  const m = String(v).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
  if (!m) return BLANK;
  const h = Number(m[1]), min = m[2];
  if (h > 23 || Number(min) > 59) return BLANK;
  return `${h % 12 || 12}:${min} ${h < 12 ? "AM" : "PM"}`;
}

/** Camera times display as 24h "H:MM" like the workbook. */
export function formatCamera(v) {
  if (isBlank(v)) return BLANK;
  const m = String(v).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
  return m ? `${Number(m[1])}:${m[2]}` : BLANK;
}

/** "YYYY-MM-DD[...]" -> "MM/DD/YYYY". */
export function formatDate(v) {
  if (isBlank(v)) return BLANK;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : BLANK;
}

/** Number -> fixed decimals; blank/non-numeric -> "—". */
export function formatNumber(v, digits = 2) {
  if (isBlank(v)) return BLANK;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : BLANK;
}

/** Duration string "H:M" (minutes may be single digit, e.g. "0:0") -> minutes, or null. */
export function durationToMinutes(v) {
  if (isBlank(v)) return null;
  const m = String(v).trim().match(/^(\d+):(\d{1,2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Duration -> normalized "H:MM"; blank -> "—". */
export function formatDuration(v) {
  const mins = durationToMinutes(v);
  if (mins === null) return BLANK;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
}

/** Filter by employee substring and inclusive ISO date range. */
export function filterRows(rows, { employee = "", from = "", to = "" } = {}) {
  const q = employee.trim().toLowerCase();
  return rows.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    return (!q || (r.employee || "").toLowerCase().includes(q)) &&
      (!from || d >= from) && (!to || d <= to);
  });
}

/** Filter district summaries by their source row's district, store, title, and inclusive date range. */
export function filterDistrictRows(rows, { district = "", store = "", title = "", from = "", to = "" } = {}) {
  return rows.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    return (!district || r.district === district) &&
      (!store || r.store === store) &&
      (!title || r.title === title) &&
      (!from || d >= from) && (!to || d <= to);
  });
}

/** Sum time data across the selected rows for each employee. Durations are aggregated in minutes. */
export function summarizeEmployees(rows) {
  const employees = new Map();
  for (const row of rows) {
    if (!row.employee) continue;
    let summary = employees.get(row.employee);
    if (!summary) {
      summary = {
        employee: row.employee,
        hoursScheduled: 0,
        hoursWorked: 0,
        totalMinutes: 0,
        showroomMinutes: 0,
        backroomMinutes: 0,
      };
      employees.set(row.employee, summary);
    }
    summary.hoursScheduled += Number(row.hoursScheduled) || 0;
    summary.hoursWorked += Number(row.hoursWorked) || 0;
    summary.totalMinutes += durationToMinutes(row.totalTime) || 0;
    summary.showroomMinutes += durationToMinutes(row.showroomTime) || 0;
    summary.backroomMinutes += durationToMinutes(row.backroomTime) || 0;
  }
  return [...employees.values()].map((summary) => ({
    ...summary,
    totalTime: formatMinutes(summary.totalMinutes),
    showroomTime: formatMinutes(summary.showroomMinutes),
    showroomPercent: summary.totalMinutes ? summary.showroomMinutes / summary.totalMinutes * 100 : null,
    backroomTime: formatMinutes(summary.backroomMinutes),
    backroomPercent: summary.totalMinutes ? summary.backroomMinutes / summary.totalMinutes * 100 : null,
  }));
}

function formatMinutes(minutes) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Sort a copy by key; blanks always last. Dates/durations/numbers compared numerically. */
export function sortRows(rows, key, dir = "asc") {
  const val = (r) => {
    const v = r[key];
    if (isBlank(v)) return null;
    if (typeof v === "number") return v;
    const d = durationToMinutes(v);
    return d !== null ? d : String(v).toLowerCase();
  };
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * sign;
  });
}

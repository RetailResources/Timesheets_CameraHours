import { filterRows, filterDistrictRows, summarizeEmployees, totalRows, sortRows, formatClock, formatCamera, formatDate, formatNumber, formatDuration } from "./lib.js?v=4";
import { filterScheduleRows, scheduleWeeks, summarizeSchedules, scheduleCounts } from "./schedules.js?v=1";

const COLUMNS = [
  ["employee", "Employee", (v) => v || "—"],
  ["date", "Date", formatDate],
  ["store", "Store", (v) => v || "—"],
  ["scheduledIn", "Scheduled In", formatClock],
  ["scheduledOut", "Scheduled Out", formatClock],
  ["actualIn", "Actual In", formatClock],
  ["actualOut", "Actual Out", formatClock],
  ["hoursScheduled", "Hours Scheduled", formatNumber],
  ["hoursWorked", "Hours Worked", formatNumber],
  ["breakMinutes", "Break Minutes", (v) => formatNumber(v, 1)],
  ["cameraIn", "Camera In", formatCamera],
  ["cameraOut", "Camera Out", formatCamera],
  ["totalTime", "Total Time", formatDuration],
  ["showroomTime", "Showroom Time", formatDuration],
  ["backroomTime", "Backroom Time", formatDuration],
  ["breakTime", "Break", formatDuration],
];
const NUMERIC = new Set(["hoursScheduled", "hoursWorked", "breakMinutes"]);
const DISTRICT_COLUMNS = [
  ["title", "Title", (v) => v || "—"],
  ["employee", "Employee", (v) => v || "—"],
  ["hoursScheduled", "Hours Scheduled", formatNumber],
  ["hoursWorked", "Hours Worked", formatNumber],
  ["totalTime", "Total Time", formatDuration],
  ["showroomTime", "Showroom Time", formatDuration],
  ["showroomPercent", "Showroom %", (v) => v === null ? "—" : `${formatNumber(v, 1)}%`],
  ["backroomTime", "Backroom Time", formatDuration],
  ["backroomPercent", "Backroom %", (v) => v === null ? "—" : `${formatNumber(v, 1)}%`],
];
const DISTRICT_NUMERIC = new Set(["hoursScheduled", "hoursWorked", "showroomPercent", "backroomPercent"]);
const LIMIT = 1000;

const $ = (id) => document.getElementById(id);
const state = { rows: [], mode: "employee", key: "date", dir: "asc" };

function populateSelect(id, key, label) {
  const select = $(id);
  for (const value of [...new Set(state.rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b))) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.options[0].textContent = `All ${label}`;
}

function setMode(mode) {
  state.mode = mode;
  const district = mode === "district";
  const schedules = mode === "schedule";
  $("employee-mode").setAttribute("aria-pressed", String(mode === "employee"));
  $("district-mode").setAttribute("aria-pressed", String(district));
  $("schedule-mode").setAttribute("aria-pressed", String(schedules));
  $("employee-filter").hidden = mode !== "employee";
  for (const id of ["district-filter", "store-filter", "title-filter"]) $(id).hidden = !district;
  for (const id of ["schedule-district-filter", "schedule-store-filter", "schedule-title-filter", "schedule-note"]) $(id).hidden = !schedules;
  for (const id of ["from-filter", "to-filter"]) $(id).hidden = schedules;
  $("title").textContent = schedules ? "Weekly Schedule Summary" : district ? "Employee Hours Summary" : "Employee Timesheets & Camera Hours";
  state.key = mode === "employee" ? "date" : "employee";
  state.dir = "asc";
  render();
}

function render() {
  document.querySelectorAll(".schedule-subhead").forEach((row) => row.remove());
  if (state.mode === "schedule") {
    renderSchedules();
    return;
  }
  const district = state.mode === "district";
  const filtered = district
    ? filterDistrictRows(state.rows, {
      district: $("district").value,
      store: $("store").value,
      title: $("job-title").value,
      from: $("from").value,
      to: $("to").value,
    })
    : filterRows(state.rows, { employee: $("employee").value, from: $("from").value, to: $("to").value });
  const rows = sortRows(district ? summarizeEmployees(filtered) : filtered, state.key, state.dir);
  const columns = district ? DISTRICT_COLUMNS : COLUMNS;
  $("count").textContent = district
    ? `${rows.length} employees` + (rows.length > LIMIT ? ` (showing first ${LIMIT}; refine filters)` : "")
    : `${rows.length} of ${state.rows.length} rows` +
    (rows.length > LIMIT ? ` (showing first ${LIMIT}; refine filters)` : "");
  $("head").innerHTML = "";
  for (const [key, label] of columns) {
    const th = document.createElement("th");
    th.textContent = label + (key === state.key ? (state.dir === "asc" ? " ▲" : " ▼") : "");
    th.onclick = () => {
      state.dir = state.key === key && state.dir === "asc" ? "desc" : "asc";
      state.key = key;
      render();
    };
    $("head").appendChild(th);
  }
  const frag = document.createDocumentFragment();
  for (const r of rows.slice(0, LIMIT)) {
    const tr = document.createElement("tr");
    for (const [key, , fmt] of columns) {
      const td = document.createElement("td");
      const text = fmt(r[key]);
      td.textContent = text;
      if (text === "—") td.className = "blank";
      if ((district ? DISTRICT_NUMERIC : NUMERIC).has(key)) td.classList.add("num");
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  }
  $("body").replaceChildren(frag);
  const foot = $("foot");
  foot.classList.remove("schedule-footer");
  foot.replaceChildren();
  if (!district) {
    const totals = totalRows(rows);
    const tr = document.createElement("tr");
    columns.forEach(([key, , fmt], i) => {
      const td = document.createElement("td");
      if (key in totals) {
        td.textContent = fmt(totals[key]);
        td.classList.add("num");
      } else if (i === 0) td.textContent = "Total";
      tr.appendChild(td);
    });
    foot.appendChild(tr);
  }
}

function selectedValues(id) {
  return [...$(id).querySelectorAll('input:checked')].map((input) => input.value);
}

function populateMultiSelect(id, key) {
  const container = $(id).querySelector(".multi-options");
  const values = [...new Set(state.rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const value of values) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.addEventListener("change", render);
    label.append(input, document.createTextNode(value));
    container.appendChild(label);
  }
}

function renderSchedules() {
  const weeks = scheduleWeeks();
  for (const [id, label] of [["schedule-district-filter", "Districts"], ["schedule-store-filter", "Stores"], ["schedule-title-filter", "Titles"]]) {
    const count = selectedValues(id).length;
    $(id).querySelector("summary").textContent = count ? `${label} (${count})` : label;
  }
  const dates = state.rows.map((row) => (row.date || "").slice(0, 10)).filter(Boolean).sort();
  const coverage = { from: dates[0], to: dates.at(-1) };
  const filtered = filterScheduleRows(state.rows, {
    districts: selectedValues("schedule-district-filter"),
    stores: selectedValues("schedule-store-filter"),
    titles: selectedValues("schedule-title-filter"),
  });
  const rows = summarizeSchedules(filtered, weeks, coverage);
  $("count").textContent = `${rows.length} district/employee rows`;
  $("schedule-note").textContent = `Attendance report dates: ${formatDate(coverage.from)}–${formatDate(coverage.to)}. Weeks or days outside the report are shown as — and excluded from counts. Employees and filters come from the available report.`;
  const head = $("head");
  head.replaceChildren();
  const header = (text, span, parent) => {
    const th = document.createElement("th");
    th.textContent = text;
    if (span) th.colSpan = span;
    parent.appendChild(th);
    return th;
  };
  header("District", 1, head);
  header("Employee", 1, head);
  for (const week of weeks) header(`${formatDate(week.start)} – ${formatDate(week.end)}`, 4, head).className = "week-head";
  const sub = document.createElement("tr");
  sub.className = "schedule-subhead";
  header("", 1, sub);
  header("", 1, sub);
  for (const week of weeks) {
    for (const label of ["Hours Scheduled", "Hours Worked", "Scheduled Friday", "Scheduled Saturday"]) header(label, 1, sub);
  }
  head.after(sub);
  const frag = document.createDocumentFragment();
  const addCell = (row, value, kind) => {
    const td = document.createElement("td");
    td.textContent = value === null ? "—" : kind === "day" ? (value ? "Yes" : "No") : kind === "hours" ? formatNumber(value) : value || "—";
    if (value === null || value === "") td.classList.add("blank");
    if (kind && value !== null) td.classList.add((kind === "day" ? value : value >= 45) ? "schedule-good" : "schedule-bad");
    row.appendChild(td);
  };
  for (const item of rows) {
    const tr = document.createElement("tr");
    addCell(tr, item.district);
    addCell(tr, item.employee);
    for (const week of item.weeks) {
      addCell(tr, week.scheduled, "hours");
      addCell(tr, week.worked, "hours");
      addCell(tr, week.friday, "day");
      addCell(tr, week.saturday, "day");
    }
    frag.appendChild(tr);
  }
  $("body").replaceChildren(frag);
  const foot = $("foot");
  foot.classList.add("schedule-footer");
  foot.replaceChildren();
  const labels = document.createElement("tr");
  const totals = document.createElement("tr");
  const label = (row, text, span = 1) => {
    const td = document.createElement("td");
    td.textContent = text;
    td.colSpan = span;
    row.appendChild(td);
  };
  label(labels, "Weekly summary", 2);
  label(totals, "Count", 2);
  weeks.forEach((week, i) => {
    const counts = scheduleCounts(rows, i);
    const covered = (date) => Boolean(coverage.from && coverage.to && date >= coverage.from && date <= coverage.to);
    const allWeek = covered(week.start) && covered(week.end);
    for (const text of ["Under 45 scheduled", "Under 45 worked", "Not scheduled Friday", "Not scheduled Saturday"]) label(labels, text);
    for (const value of [allWeek ? counts.scheduled : "—", allWeek ? counts.worked : "—", covered(week.friday) ? counts.friday : "—", covered(week.saturday) ? counts.saturday : "—"]) label(totals, String(value));
  });
  foot.append(labels, totals);
}

async function init() {
  try {
    const res = await fetch("data/timesheets.json");
    if (!res.ok) throw new Error(res.statusText);
    state.rows = await res.json();
  } catch (e) {
    $("count").textContent = "Could not load data/timesheets.json: " + e.message;
    return;
  }
  try {
    const res = await fetch("data/report-dates.json");
    if (res.ok) {
      const dates = await res.json();
      $("data-through").textContent = `Attendance Data Thru ${formatDate(dates.attendance)} · Camera Data Thru ${formatDate(dates.camera)}`;
      $("data-through").hidden = false;
    }
  } catch {}
  for (const id of ["employee", "from", "to"]) $(id).addEventListener("input", render);
  for (const id of ["district", "store", "job-title"]) $(id).addEventListener("change", render);
  populateSelect("district", "district", "districts");
  populateSelect("store", "store", "stores");
  populateSelect("job-title", "title", "titles");
  populateMultiSelect("schedule-district-filter", "district");
  populateMultiSelect("schedule-store-filter", "store");
  populateMultiSelect("schedule-title-filter", "title");
  $("employee-mode").onclick = () => setMode("employee");
  $("district-mode").onclick = () => setMode("district");
  $("schedule-mode").onclick = () => setMode("schedule");
  $("clear").onclick = () => {
    for (const id of ["employee", "district", "store", "job-title", "from", "to"]) $(id).value = "";
    document.querySelectorAll(".multi-options input").forEach((input) => { input.checked = false; });
    render();
  };
  setInterval(() => { if (state.mode === "schedule") render(); }, 60000);
  render();
}
init();

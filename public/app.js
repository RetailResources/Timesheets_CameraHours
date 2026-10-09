import { filterRows, filterDistrictRows, summarizeEmployees, sortRows, formatClock, formatCamera, formatDate, formatNumber, formatDuration } from "./lib.js?v=2";

const COLUMNS = [
  ["employee", "Employee", (v) => v || "—"],
  ["date", "Date", formatDate],
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
  $("employee-mode").setAttribute("aria-pressed", String(!district));
  $("district-mode").setAttribute("aria-pressed", String(district));
  $("employee-filter").hidden = district;
  for (const id of ["district-filter", "store-filter", "title-filter"]) $(id).hidden = !district;
  $("title").textContent = district ? "District Timesheets & Camera Hours" : "Employee Timesheets & Camera Hours";
  state.key = district ? "employee" : "date";
  state.dir = "asc";
  render();
}

function render() {
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
  for (const id of ["employee", "from", "to"]) $(id).addEventListener("input", render);
  for (const id of ["district", "store", "job-title"]) $(id).addEventListener("change", render);
  populateSelect("district", "district", "districts");
  populateSelect("store", "store", "stores");
  populateSelect("job-title", "title", "titles");
  $("employee-mode").onclick = () => setMode("employee");
  $("district-mode").onclick = () => setMode("district");
  $("clear").onclick = () => {
    for (const id of ["employee", "district", "store", "job-title", "from", "to"]) $(id).value = "";
    render();
  };
  render();
}
init();

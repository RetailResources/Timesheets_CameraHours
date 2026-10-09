import { filterRows, sortRows, formatClock, formatCamera, formatDate, formatNumber, formatDuration } from "./lib.js";

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
const LIMIT = 1000;

const $ = (id) => document.getElementById(id);
const state = { rows: [], key: "date", dir: "asc" };

function render() {
  const rows = sortRows(
    filterRows(state.rows, { employee: $("employee").value, from: $("from").value, to: $("to").value }),
    state.key, state.dir);
  $("count").textContent = `${rows.length} of ${state.rows.length} rows` +
    (rows.length > LIMIT ? ` (showing first ${LIMIT}; refine filters)` : "");
  $("head").innerHTML = "";
  for (const [key, label] of COLUMNS) {
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
    for (const [key, , fmt] of COLUMNS) {
      const td = document.createElement("td");
      const text = fmt(r[key]);
      td.textContent = text;
      if (text === "—") td.className = "blank";
      if (NUMERIC.has(key)) td.classList.add("num");
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  }
  $("body").replaceChildren(frag);
}

async function init() {
  try {
    const res = await fetch("/data/timesheets.json");
    if (!res.ok) throw new Error(res.statusText);
    state.rows = await res.json();
  } catch (e) {
    $("count").textContent = "Could not load data/timesheets.json: " + e.message;
    return;
  }
  for (const id of ["employee", "from", "to"]) $(id).addEventListener("input", render);
  $("clear").onclick = () => { for (const id of ["employee", "from", "to"]) $(id).value = ""; render(); };
  render();
}
init();

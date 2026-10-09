import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { formatClock, formatCamera, formatDate, formatNumber, formatDuration, durationToMinutes, filterRows, sortRows } from "../public/lib.js";

test("formatClock", () => {
  assert.equal(formatClock("09:30:00"), "9:30 AM");
  assert.equal(formatClock("18:00:00"), "6:00 PM");
  assert.equal(formatClock("00:05:00"), "12:05 AM");
  assert.equal(formatClock("12:00:00"), "12:00 PM");
  assert.equal(formatClock(null), "—");
  assert.equal(formatClock("garbage"), "—");
});

test("formatCamera / formatDate / formatNumber", () => {
  assert.equal(formatCamera("2026-10-01T09:40:00"), "9:40");
  assert.equal(formatCamera(null), "—");
  assert.equal(formatDate("2026-10-01"), "10/01/2026");
  assert.equal(formatDate(""), "—");
  assert.equal(formatNumber(7.366944, 2), "7.37");
  assert.equal(formatNumber(34.9667, 1), "35.0");
  assert.equal(formatNumber(null), "—");
});

test("durations", () => {
  assert.equal(durationToMinutes("7:36"), 456);
  assert.equal(formatDuration("0:0"), "0:00");
  assert.equal(formatDuration("6:4"), "6:04");
  assert.equal(formatDuration(undefined), "—");
});

test("filter and sort", () => {
  const rows = [
    { employee: "B", date: "2026-10-02", hoursWorked: 5 },
    { employee: "A", date: "2026-10-01", hoursWorked: null },
    { employee: "AB", date: "2026-10-03", hoursWorked: 7 },
  ];
  assert.equal(filterRows(rows, { employee: "a" }).length, 2);
  assert.equal(filterRows(rows, { from: "2026-10-02", to: "2026-10-02" }).length, 1);
  assert.deepEqual(sortRows(rows, "hoursWorked", "desc").map((r) => r.employee), ["AB", "B", "A"]);
  assert.deepEqual(sortRows(rows, "hoursWorked", "asc").map((r) => r.employee), ["B", "AB", "A"]);
});

test("generated data is well formed", () => {
  const data = JSON.parse(fs.readFileSync(new URL("../data/timesheets.json", import.meta.url)));
  assert.ok(data.length > 0);
  assert.equal(data[0].employee, "JYE PECHACEK");
  assert.equal(formatClock(data[0].actualIn), "9:38 AM");
  assert.equal(formatDuration(data[0].totalTime), "7:36");
});

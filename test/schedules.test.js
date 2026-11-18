import test from "node:test";
import assert from "node:assert/strict";
import { filterScheduleRows, scheduleWeeks, summarizeSchedules, scheduleCounts } from "../public/schedules.js";

test("weeks start Sunday and cross month and year boundaries", () => {
  const weeks = scheduleWeeks(new Date(2026, 11, 31, 12));
  assert.deepEqual(weeks.map(({ start, end }) => [start, end]), [
    ["2026-12-20", "2026-12-26"],
    ["2026-12-27", "2027-01-02"],
    ["2027-01-03", "2027-01-09"],
  ]);
  assert.equal(weeks[1].friday, "2027-01-01");
  assert.equal(scheduleWeeks(new Date(2026, 10, 15, 12))[1].start, "2026-11-15");
});

test("multi-select filters combine selections and dimensions", () => {
  const rows = [
    { district: "A", store: "One", title: "RSM" },
    { district: "B", store: "Two", title: "RSM" },
    { district: "C", store: "One", title: "RSM" },
    { district: "A", store: "One", title: "Lead" },
  ];
  assert.deepEqual(filterScheduleRows(rows, { districts: ["A", "B"], stores: ["One", "Two"], titles: ["RSM"] }), rows.slice(0, 2));
  assert.deepEqual(filterScheduleRows(rows), rows);
});

test("summarizes weeks, avoids duplicate worked shifts, and distinguishes missing coverage", () => {
  const weeks = scheduleWeeks(new Date(2026, 10, 25, 12));
  const rows = [
    { employee: "A", district: "North", store: "One", date: "2026-11-20", hoursScheduled: 5, hoursWorked: 8, actualIn: "08:00", actualOut: "16:00" },
    { employee: "A", district: "North", store: "One", date: "2026-11-20", hoursScheduled: 3, hoursWorked: 8, actualIn: "08:00", actualOut: "16:00" },
    { employee: "A", district: "North", store: "Two", date: "2026-11-21", hoursScheduled: 4, hoursWorked: 4, actualIn: "13:00", actualOut: "17:00" },
    { employee: "B", district: "North", store: "One", date: "2026-11-17", hoursScheduled: 45, hoursWorked: 45 },
    { employee: "A", district: "South", store: "Three", date: "2026-11-17", hoursScheduled: 2 },
  ];
  const summaries = summarizeSchedules(rows, weeks, { from: "2026-11-15", to: "2026-11-21" });
  assert.equal(summaries.length, 3);
  assert.deepEqual(summaries[0].weeks[0], { scheduled: 12, worked: 12, friday: true, saturday: true });
  assert.deepEqual(summaries[1].weeks[0], { scheduled: 45, worked: 45, friday: false, saturday: false });
  assert.deepEqual(summaries[0].weeks[1], { scheduled: null, worked: null, friday: null, saturday: null });
  assert.deepEqual(scheduleCounts(summaries, 0), { scheduled: 2, worked: 2, friday: 2, saturday: 2 });
  assert.deepEqual(scheduleCounts(summaries, 1), { scheduled: 0, worked: 0, friday: 0, saturday: 0 });
});

function dateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** Previous week, current week, and next week; weeks run Sunday through Saturday. */
export function scheduleWeeks(today = new Date()) {
  const sunday = addDays(today, -today.getDay());
  return [-7, 0, 7].map((offset) => {
    const start = addDays(sunday, offset);
    return {
      start: dateString(start),
      end: dateString(addDays(start, 6)),
      friday: dateString(addDays(start, 5)),
      saturday: dateString(addDays(start, 6)),
    };
  });
}

export function filterScheduleRows(rows, { districts = [], stores = [], titles = [] } = {}) {
  return rows.filter((row) =>
    (!districts.length || districts.includes(row.district)) &&
    (!stores.length || stores.includes(row.store)) &&
    (!titles.length || titles.includes(row.title)));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Coverage describes dates in the source report, not whether an employee has a shift.
export function summarizeSchedules(rows, weeks, coverage) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.employee) continue;
    const key = JSON.stringify([row.district || "", row.employee]);
    if (!groups.has(key)) groups.set(key, { district: row.district || "", employee: row.employee, rows: [] });
    groups.get(key).rows.push(row);
  }
  const covered = (date) => Boolean(coverage.from && coverage.to && date >= coverage.from && date <= coverage.to);
  return [...groups.values()].map(({ rows: employeeRows, ...group }) => ({
    ...group,
    weeks: weeks.map((week) => {
      const selected = employeeRows.filter((row) => {
        const date = (row.date || "").slice(0, 10);
        return date >= week.start && date <= week.end;
      });
      const scheduled = selected.reduce((sum, row) => sum + (numberOrNull(row.hoursScheduled) ?? 0), 0);
      const workedShifts = new Set();
      const worked = selected.reduce((sum, row) => {
        const hours = numberOrNull(row.hoursWorked);
        if (hours === null) return sum;
        if (row.actualIn && row.actualOut) {
          const key = JSON.stringify([(row.date || "").slice(0, 10), row.store, row.actualIn, row.actualOut, hours]);
          if (workedShifts.has(key)) return sum;
          workedShifts.add(key);
        }
        return sum + hours;
      }, 0);
      const isScheduled = (date) => {
        if (!covered(date)) return null;
        return selected.some((row) => (row.date || "").slice(0, 10) === date &&
          (Boolean(row.scheduledIn && row.scheduledOut) || (numberOrNull(row.hoursScheduled) ?? 0) > 0));
      };
      return {
        scheduled: covered(week.start) && covered(week.end) ? scheduled : null,
        worked: covered(week.start) && covered(week.end) ? worked : null,
        friday: isScheduled(week.friday),
        saturday: isScheduled(week.saturday),
      };
    }),
  })).sort((a, b) => a.district.localeCompare(b.district) || a.employee.localeCompare(b.employee));
}

export function scheduleCounts(summaries, weekIndex) {
  const result = { scheduled: 0, worked: 0, friday: 0, saturday: 0 };
  for (const { weeks } of summaries) {
    const week = weeks[weekIndex];
    if (week.scheduled !== null && week.scheduled < 45) result.scheduled++;
    if (week.worked !== null && week.worked < 45) result.worked++;
    if (week.friday === false) result.friday++;
    if (week.saturday === false) result.saturday++;
  }
  return result;
}

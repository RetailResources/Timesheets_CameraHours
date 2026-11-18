# Timesheets & Camera Hours

Web app for reviewing employee timesheets and camera hours from two raw reports: `AttendanceReport.xlsx` (shift lab data) and `CameraReport.xlsx` or `.xls` (camera data, employee shown as `NAME (number)`). Camera columns are matched by employee name, date, and store; the location code before `:` in camera reports is ignored. Missing or ambiguous matches leave camera data blank, rather than assigning data from another store.

## Run

Requires Node 18+. No npm dependencies.

```
npm start        # http://localhost:3000
npm test         # parsing/formatting tests
```

The app reads `data/timesheets.json`, which is already generated from the two reports. Click a column header to sort; filter by employee name and date range. Blank values show as `—`.

The employee summary shows each employee's distinct titles from the filtered rows in its first column, while retaining one summary row per employee.

The Schedules tab uses the attendance report for the previous Sunday–Saturday week, the current week, and the next week. Column headings wrap onto multiple lines so columns fit their longest word. District, store, and title filters allow multiple selections; an empty selection includes all values. Rows group the report's employees by district, and the footer counts employees below 45 hours and not scheduled on Friday or Saturday. Days and full weeks outside the report's date range show `—` and are excluded from counts, rather than being treated as zero. Duplicate attendance rows with identical actual clock times, date, store, and worked hours count those worked hours once.

## Refresh data from the two reports

```
pip install openpyxl xlrd   # put AttendanceReport.xlsx and CameraReport.xlsx or .xls in the repo root
npm run convert
```

Run converter tests with `python3 -m unittest discover -s test -p 'test_*.py'`.

## Deploy

Pushing to `main` deploys `public/` + `data/` to GitHub Pages via `.github/workflows/pages.yml`:
https://retailresources.github.io/Timesheets_CameraHours/ (set Settings → Pages → Source to "GitHub Actions").

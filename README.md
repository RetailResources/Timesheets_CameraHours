# Timesheets & Camera Hours

Web app for reviewing employee timesheets and camera hours from two raw reports: `AttendanceReport.xlsx` (shift lab data) and `CameraReport.xlsx` (camera data, employee shown as `NAME (number)`). Camera columns are matched to attendance rows by employee name + date.

## Run

Requires Node 18+. No npm dependencies.

```
npm start        # http://localhost:3000
npm test         # parsing/formatting tests
```

The app reads `data/timesheets.json`, which is already generated from the two reports. Click a column header to sort; filter by employee name and date range. Blank values show as `—`.

## Refresh data from the two reports

```
pip install openpyxl   # put AttendanceReport.xlsx and CameraReport.xlsx in the repo root
npm run convert
```

## Deploy

Pushing to `main` deploys `public/` + `data/` to GitHub Pages via `.github/workflows/pages.yml`:
https://retailresources.github.io/Timesheets_CameraHours/ (set Settings → Pages → Source to "GitHub Actions").

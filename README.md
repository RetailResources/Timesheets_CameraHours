# Timesheets & Camera Hours

Web app for reviewing employee timesheets and camera hours from `Employee_Timesheets_App.xlsx` (sheet `Shiftlab`).

## Run

Requires Node 18+. No npm dependencies.

```
npm start        # http://localhost:3000
npm test         # parsing/formatting tests
```

The app reads `data/timesheets.json`, which is already generated from the workbook. Click a column header to sort; filter by employee name and date range. Blank values show as `—`.

## Refresh data from the workbook

```
pip install openpyxl
npm run convert
```

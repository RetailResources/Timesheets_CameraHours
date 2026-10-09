#!/usr/bin/env python3
"""Convert the Shiftlab sheet of Employee_Timesheets_App.xlsx to data/timesheets.json.

Usage: pip install openpyxl && python3 scripts/convert_workbook.py
"""
import datetime as dt
import json
import pathlib
import warnings

import openpyxl

warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "Employee_Timesheets_App.xlsx"
OUT = ROOT / "data" / "timesheets.json"

FIELDS = {
    "Area Name": "area", "District Name": "district", "Store": "store",
    "Employee": "employee", "Title": "title", "Date": "date",
    "Scheduled In": "scheduledIn", "Scheduled Out": "scheduledOut",
    "Actual In": "actualIn", "Actual Out": "actualOut",
    "Hours Scheduled": "hoursScheduled", "Hours Worked": "hoursWorked",
    "Breaks": "breaks", "Break Minutes": "breakMinutes", "Event": "event",
    "Camera In": "cameraIn", "Camera Out": "cameraOut",
    "Total Time": "totalTime", "Showroom Time": "showroomTime",
    "Backroom Time": "backroomTime", "Break": "breakTime", "Monitored": "monitored",
}


def conv(v):
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, dt.datetime):
        return v.isoformat(timespec="seconds") if (v.hour or v.minute or v.second) else v.date().isoformat()
    if isinstance(v, dt.time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, str):
        return v.strip()
    return v


def main():
    ws = openpyxl.load_workbook(SRC, data_only=True)["Shiftlab"]
    rows = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h else "" for h in next(rows)]
    out = []
    for r in rows:
        rec = {FIELDS[h]: conv(v) for h, v in zip(headers, r) if h in FIELDS}
        if rec.get("employee") and rec.get("date"):
            out.append(rec)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"Wrote {len(out)} rows to {OUT}")


if __name__ == "__main__":
    main()

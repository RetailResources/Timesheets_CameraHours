#!/usr/bin/env python3
"""Build data/timesheets.json from two raw reports in the repo root:

  AttendanceReport.xlsx - shift lab data (no camera columns)
  CameraReport.xlsx/.xls - camera data; Employee looks like "NAME (12345)"

Camera columns are matched to attendance rows by employee name, date, and store.

Usage: pip install openpyxl && python3 scripts/convert_workbook.py [attendance.xlsx camera.xlsx]
"""
import datetime as dt
import json
import pathlib
import re
import sys
import warnings

import openpyxl

warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).resolve().parent.parent
ATTENDANCE = ROOT / "AttendanceReport.xlsx"
CAMERA = next((p for p in (ROOT / "CameraReport.xlsx", ROOT / "CameraReport.xls") if p.exists()), ROOT / "CameraReport.xlsx")
OUT = ROOT / "data" / "timesheets.json"
REPORT_DATES = ROOT / "data" / "report-dates.json"

FIELDS = {
    "Area Name": "area", "District Name": "district", "Store": "store",
    "Employee": "employee", "Title": "title", "Date": "date",
    "Scheduled In": "scheduledIn", "Scheduled Out": "scheduledOut",
    "Actual In": "actualIn", "Actual Out": "actualOut",
    "Hours Scheduled": "hoursScheduled", "Hours Worked": "hoursWorked",
    "Breaks": "breaks", "Break Minutes": "breakMinutes", "Event": "event",
    "Break": "breakTime", "Monitored": "monitored",
}
CAMERA_FIELDS = {
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


def norm_name(v):
    """'DANA GLASS (112301)' -> 'DANA GLASS' (case/space-insensitive)."""
    name = re.sub(r"\s*\(\s*\d+\s*\)\s*$", "", str(v or ""))
    return " ".join(name.split()).upper()


def norm_store(v):
    """Normalize a store name, removing the camera report's location code."""
    name = re.sub(r"^\s*[^:]+:\s*", "", str(v or ""))
    return " ".join(name.split()).casefold()


def read_xls(path):
    """Legacy .xls: yield rows with dates/times converted like openpyxl does."""
    import xlrd

    book = xlrd.open_workbook(path)
    sheet = book.sheet_by_index(0)
    for i in range(sheet.nrows):
        row = []
        for c in sheet.row(i):
            if c.ctype == xlrd.XL_CELL_DATE:
                d = xlrd.xldate_as_datetime(c.value, book.datemode)
                row.append(d.time() if c.value < 1 else d)
            elif c.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK, xlrd.XL_CELL_ERROR):
                row.append(None)
            else:
                row.append(c.value)
        yield tuple(row)


def read_sheet(path):
    if str(path).lower().endswith(".xls"):
        rows = read_xls(path)
        headers = [str(h).strip() if h else "" for h in next(rows)]
        return headers, rows
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    rows = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h else "" for h in next(rows)]
    return headers, rows


def latest_report_date(path):
    headers, rows = read_sheet(path)
    date_col = headers.index("Date")
    dates = (str(value)[:10] for row in rows if (value := conv(row[date_col])))
    return max(dates, default=None)


def read_camera(path):
    headers, rows = read_sheet(path)
    name_cols = [i for i, h in enumerate(headers) if h.lower().startswith("employee")]
    date_col = headers.index("Date")
    location_col = headers.index("Location")
    lookup = {}
    for r in rows:
        rec = {CAMERA_FIELDS[h]: conv(v) for h, v in zip(headers, r) if h in CAMERA_FIELDS}
        date = conv(r[date_col])
        store = norm_store(r[location_col])
        names = {norm_name(r[i]) for i in name_cols if r[i]}
        if not names or not date or not store:
            continue
        for name in names:
            key = (name, str(date)[:10], store)
            # Multiple camera records for the same key cannot be matched safely.
            lookup[key] = rec if key not in lookup else None
    return lookup


def main():
    att = pathlib.Path(sys.argv[1]) if len(sys.argv) > 2 else ATTENDANCE
    cam = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else CAMERA
    camera = read_camera(cam)
    headers, rows = read_sheet(att)
    out = []
    ambiguous = 0
    for r in rows:
        rec = {FIELDS[h]: conv(v) for h, v in zip(headers, r) if h in FIELDS}
        if rec.get("employee") and rec.get("date"):
            key = (norm_name(rec["employee"]), str(rec["date"])[:10], norm_store(rec.get("store")))
            match = camera.get(key)
            if key in camera and match is None:
                ambiguous += 1
            for k, v in (match or {}).items():
                rec.setdefault(k, v)
            for k in CAMERA_FIELDS.values():
                rec.setdefault(k, None)
            out.append(rec)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    REPORT_DATES.write_text(json.dumps({
        "attendance": latest_report_date(att),
        "camera": latest_report_date(cam),
    }, separators=(",", ":")))
    print(f"Wrote {len(out)} rows to {OUT} ({sum(1 for r in out if r.get('cameraIn')) } with camera data)")
    if ambiguous:
        print(f"Warning: {ambiguous} attendance rows have ambiguous camera matches; camera data was left blank.", file=sys.stderr)


if __name__ == "__main__":
    main()

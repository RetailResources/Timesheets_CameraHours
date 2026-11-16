import contextlib
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

import openpyxl

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import convert_workbook as converter


def workbook(path, rows):
    book = openpyxl.Workbook()
    sheet = book.active
    for row in rows:
        sheet.append(row)
    book.save(path)


class ConversionTests(unittest.TestCase):
    def test_matches_store_and_leaves_ambiguous_or_missing_data_blank(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            attendance = root / "attendance.xlsx"
            camera = root / "camera.xlsx"
            output = root / "timesheets.json"
            dates = root / "dates.json"
            workbook(attendance, [
                ["Employee", "Date", "Store", "Hours Worked"],
                ["Example Person", "2026-11-05", "First Store", 4],
                ["Example Person", "2026-11-05", "Second Store", 3],
                ["Example Person", "2026-11-05", "Third Store", 2],
                ["Example Person", "2026-11-05", "Other Store", 1],
            ])
            workbook(camera, [
                ["Employee", "Employee Name", "Date", "Location", "Camera In", "Total Time"],
                ["EXAMPLE PERSON (123)", "EXAMPLE PERSON", "2026-11-05", "ABC: Second Store", "13:00", "3:00"],
                ["EXAMPLE PERSON (123)", "EXAMPLE PERSON", "2026-11-05", "XYZ: First Store", "08:00", "4:00"],
                ["EXAMPLE PERSON (123)", "EXAMPLE PERSON", "2026-11-05", "123: Third Store", "10:00", "1:00"],
                ["EXAMPLE PERSON (123)", "EXAMPLE PERSON", "2026-11-05", "123: Third Store", "11:00", "1:00"],
            ])
            errors = io.StringIO()
            with patch.object(converter, "OUT", output), patch.object(converter, "REPORT_DATES", dates), \
                    patch.object(sys, "argv", ["convert_workbook.py", str(attendance), str(camera)]), \
                    contextlib.redirect_stderr(errors), contextlib.redirect_stdout(io.StringIO()):
                converter.main()
            rows = json.loads(output.read_text())
            self.assertEqual([(r["store"], r["cameraIn"], r["totalTime"]) for r in rows], [
                ("First Store", "08:00", "4:00"),
                ("Second Store", "13:00", "3:00"),
                ("Third Store", None, None),
                ("Other Store", None, None),
            ])
            self.assertIn("1 attendance rows have ambiguous camera matches", errors.getvalue())

    def test_store_normalization(self):
        self.assertEqual(converter.norm_store("  1234:  MARKET   PLACE  "), "market place")
        self.assertEqual(converter.norm_store("Market Place"), "market place")
        self.assertEqual(converter.norm_store(None), "")


if __name__ == "__main__":
    unittest.main()

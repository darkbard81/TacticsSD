"""Build a four-frame geometric sample using exact pixel batches."""
from pathlib import Path
import copy
from pixel_tool import DEFAULT_PALETTE, paint, save, render

ROOT = Path(__file__).resolve().parent
project = {"version": 1, "size": [24, 32], "anchor": [12, 31],
           "palette": copy.deepcopy(DEFAULT_PALETTE), "frames": []}
shape = [
    "......OOOO......",
    "....OOLLLLOO....",
    "...OLLLLLLTTO...",
    "..OLLWWLLLTTTO..",
    ".OLLWWLLLTTTBBO.",
    "OLLLWLLLLTTTBBBO",
    "OLLLLLLLTTTTBBBO",
    "OLLLLLLTTTTBBBBO",
    ".OLLLLTTTTBBBBO.",
    "..OLLTTTTBBBBO..",
    "...OLTTTBBBBO...",
    "....OTTBBBBO....",
    ".....OTBBBO.....",
    "......OBBO......",
    ".......OO.......",
]
assert all(len(row) == 16 for row in shape)
for index in range(4):
    name = f"gem_{index:02d}"
    project["frames"].append({"name": name, "duration_ms": 180,
                              "rows": ["." * 24 for _ in range(32)]})
    edits = [[x + 4, y + 9, symbol] for y, row in enumerate(shape)
             for x, symbol in enumerate(row) if symbol != "."]
    if index == 0:
        edits += [[20, 6, "L"]]
    elif index == 1:
        edits += [[20, 6, "W"], [19, 6, "W"], [21, 6, "W"], [20, 5, "W"], [20, 7, "W"],
                  [18, 6, "L"], [22, 6, "L"], [20, 4, "L"], [20, 8, "L"]]
    elif index == 2:
        edits += [[20, 6, "L"], [2, 22, "L"]]
    else:
        edits += [[2, 22, "W"], [1, 22, "L"], [3, 22, "L"], [2, 21, "L"], [2, 23, "L"]]
    project = paint(project, name, edits)
save(ROOT / "example.json", project)
print(render(project, ROOT / "example_output", columns=4, scale=12))

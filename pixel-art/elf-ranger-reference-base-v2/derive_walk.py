#!/usr/bin/env python3
"""Derive a compact walk cycle from the pixelized canonical Base using pixel_tool."""
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
REPO = ROOT.parents[1]
sys.path.insert(0, str(REPO / "tools" / "pixel_sprite_tool"))
import pixel_tool

PROJECT_PATH = ROOT / "elf-ranger.json"
LEFT_X = range(8, 11)
RIGHT_X = range(13, 17)
LEG_Y = range(27, 31)
POSES = [
    ("walk_00_contact_right", (-1, -1), (0, 0), 130),
    ("walk_01_passing_right", (0, 0), (1, -1), 100),
    ("walk_02_contact_left", (1, 0), (0, -1), 130),
    ("walk_03_passing_left", (0, -1), (-1, 0), 100),
]


def main():
    project = pixel_tool.load(PROJECT_PATH)
    if [frame["name"] for frame in project["frames"]] != ["base"]:
        raise SystemExit("Expected a fresh project containing only the generated Base frame")
    base = copy.deepcopy(project["frames"][0])
    base_rows = base["rows"]

    for name, left_offset, right_offset, duration in POSES:
        frame = copy.deepcopy(base)
        frame["name"] = name
        frame["duration_ms"] = duration
        project["frames"].append(frame)
        edits = []
        for xs in (LEFT_X, RIGHT_X):
            for y in LEG_Y:
                for x in xs:
                    if base_rows[y][x] != ".":
                        edits.append([x, y, "."])
        for xs, (dx, dy) in ((LEFT_X, left_offset), (RIGHT_X, right_offset)):
            for y in LEG_Y:
                for x in xs:
                    symbol = base_rows[y][x]
                    if symbol != ".":
                        edits.append([x + dx, y + dy, symbol])
        edits_path = ROOT / f"{name}-edits.json"
        edits_path.write_text(json.dumps(edits, indent=2) + "\n", encoding="utf-8")
        project = pixel_tool.paint(project, name, edits)

    pixel_tool.save(PROJECT_PATH, project)
    pixel_tool.validate(pixel_tool.load(PROJECT_PATH))
    print("frames:", ", ".join(frame["name"] for frame in project["frames"]))
    print("durations_ms:", ", ".join(str(frame["duration_ms"]) for frame in project["frames"]))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Exact 24x32 pixel authoring. Source JSON -> review PNGs -> sprite sheet.

The program renders images; the calling agent must OPEN the review PNGs and
decide the next edit. No browser, API key, or image generation service is used.
"""
from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 24, 32
DEFAULT_PALETTE = {
    ".": [0, 0, 0, 0],
    "O": [27, 33, 57, 255],
    "B": [47, 82, 129, 255],
    "T": [44, 147, 158, 255],
    "L": [102, 216, 197, 255],
    "W": [232, 255, 227, 255],
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(project):
    require(isinstance(project, dict), "Project must be a JSON object")
    require(project.get("version") == 1, "Expected project version 1")
    require(project.get("size") == [WIDTH, HEIGHT], "Frame size must be [24, 32]")
    palette = project.get("palette")
    require(isinstance(palette, dict) and palette, "Palette must be a nonempty object")
    for symbol, color in palette.items():
        require(isinstance(symbol, str) and len(symbol) == 1 and 33 <= ord(symbol) <= 126,
                "Palette symbols must be single printable ASCII characters")
        require(isinstance(color, list) and len(color) == 4
                and all(type(v) is int and 0 <= v <= 255 for v in color),
                f"Palette {symbol!r} must be [R,G,B,A] integers from 0 to 255")
    require(palette.get(".") == [0, 0, 0, 0], "'.' must be transparent [0,0,0,0]")
    anchor = project.get("anchor")
    require(isinstance(anchor, list) and len(anchor) == 2
            and all(type(v) is int for v in anchor)
            and 0 <= anchor[0] < WIDTH and 0 <= anchor[1] < HEIGHT,
            "Anchor must be an integer pixel coordinate inside the frame")
    frames = project.get("frames")
    require(isinstance(frames, list) and frames, "Project needs at least one frame")
    names = set()
    for frame in frames:
        require(isinstance(frame, dict), "Each frame must be an object")
        name = frame.get("name")
        require(isinstance(name, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", name),
                "Frame names: 1-64 letters, numbers, underscores, or hyphens")
        require(name not in names, f"Duplicate frame name: {name}")
        names.add(name)
        duration = frame.get("duration_ms")
        require(type(duration) is int and duration > 0, f"{name}: duration_ms must be positive")
        rows = frame.get("rows")
        require(isinstance(rows, list) and len(rows) == HEIGHT, f"{name}: expected 32 rows")
        for y, row in enumerate(rows):
            require(isinstance(row, str) and len(row) == WIDTH, f"{name}: row {y} needs 24 symbols")
            require(all(symbol in palette for symbol in row), f"{name}: unknown palette symbol in row {y}")
    return project


def load(path):
    return validate(json.loads(Path(path).read_text(encoding="utf-8")))


def save(path, project):
    """Validate first, then replace the source atomically; preserve its old bytes."""
    validate(project)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    backup = None
    if path.exists():
        history = path.parent / (path.stem + "_history")
        history.mkdir(exist_ok=True)
        backup = history / f"{time.time_ns()}.json"
        shutil.copyfile(path, backup)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(project, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return str(backup.resolve()) if backup else None


def get_frame(project, name):
    for frame in project["frames"]:
        if frame["name"] == name:
            return frame
    raise ValueError(f"No frame named {name!r}")


def paint(project, name, edits):
    """Apply an entire pixel batch to a copy, never partially mutate the input."""
    result = copy.deepcopy(project)
    frame = get_frame(result, name)
    require(isinstance(edits, list), "Edits must be [[x, y, symbol], ...]")
    rows = [list(row) for row in frame["rows"]]
    for edit in edits:
        require(isinstance(edit, list) and len(edit) == 3, "Each edit must be [x, y, symbol]")
        x, y, symbol = edit
        require(type(x) is int and type(y) is int and 0 <= x < WIDTH and 0 <= y < HEIGHT,
                f"Coordinate outside x=0..23, y=0..31: {(x, y)}")
        require(isinstance(symbol, str) and symbol in result["palette"], f"Unknown palette symbol: {symbol!r}")
        rows[y][x] = symbol
    frame["rows"] = ["".join(row) for row in rows]
    return validate(result)


def frame_image(project, frame):
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = image.load()
    for y, row in enumerate(frame["rows"]):
        for x, symbol in enumerate(row):
            pixels[x, y] = tuple(project["palette"][symbol])
    return image


def review_image(image, name, scale, grid):
    """Review decorations are separate from the exact RGBA image."""
    if grid:
        scale = max(4, scale)  # At 1x a grid would cover every source pixel.
    margin, header = 28, 44
    canvas = Image.new("RGB", (WIDTH * scale + margin * 2, HEIGHT * scale + header + margin), "#151c28")
    backdrop = Image.new("RGBA", (WIDTH, HEIGHT))
    for y in range(HEIGHT):
        for x in range(WIDTH):
            backdrop.putpixel((x, y), (52, 63, 78, 255) if (x // 4 + y // 4) % 2 else (65, 77, 91, 255))
    zoom = Image.alpha_composite(backdrop, image).resize((WIDTH * scale, HEIGHT * scale), Image.Resampling.NEAREST)
    canvas.paste(zoom.convert("RGB"), (margin, header))
    draw = ImageDraw.Draw(canvas)
    draw.text((margin, 9), name[:30], fill="#eef5ff")
    draw.text((margin, 23), f"24x32 | {scale}x | " + ("GRID" if grid else "CLEAN"), fill="#93a9bd")
    if grid:
        for x in range(WIDTH + 1):
            px = margin + x * scale
            draw.line((px, header, px, header + HEIGHT * scale), fill="#293441")
            if x < WIDTH and x % 4 == 0:
                draw.text((px + 2, header - 12), str(x), fill="#a9bfd0")
        for y in range(HEIGHT + 1):
            py = header + y * scale
            draw.line((margin, py, margin + WIDTH * scale, py), fill="#293441")
            if y < HEIGHT and y % 4 == 0:
                draw.text((4, py + 1), str(y), fill="#a9bfd0")
    return canvas


def render(project, output, columns=4, scale=12):
    validate(project)
    require(type(columns) is int and 1 <= columns <= 64, "Columns must be 1..64")
    require(type(scale) is int and 1 <= scale <= 32, "Scale must be an integer from 1 to 32")
    output = Path(output).resolve()
    for folder in [output, output / "frames", output / "review"]:
        folder.mkdir(parents=True, exist_ok=True)
    frames = project["frames"]
    columns = min(columns, len(frames))
    row_count = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * WIDTH, row_count * HEIGHT), (0, 0, 0, 0))
    metadata = {"format": "pixel-sprite-sheet-v1", "image": "spritesheet.png",
                "size": list(sheet.size), "frame_size": [WIDTH, HEIGHT],
                "anchor_px": project["anchor"], "coordinate_origin": "top-left",
                "padding": 0, "frames": []}
    contact = None
    for index, frame in enumerate(frames):
        image = frame_image(project, frame)
        name = frame["name"]
        image.save(output / "frames" / f"{name}.png")
        x, y = index % columns * WIDTH, index // columns * HEIGHT
        # Copy all RGBA values exactly. An alpha mask here would change alpha.
        sheet.paste(image, (x, y))
        metadata["frames"].append({"name": name, "x": x, "y": y, "w": WIDTH, "h": HEIGHT,
                                   "duration_ms": frame["duration_ms"]})
        panel = review_image(image, name, scale, False)
        panel.save(output / "review" / f"{name}_zoom.png")
        review_image(image, name, scale, True).save(output / "review" / f"{name}_grid.png")
        if contact is None:
            contact = Image.new("RGB", (panel.width * columns, panel.height * row_count), "#151c28")
        contact.paste(panel, (index % columns * panel.width, index // columns * panel.height))
    sheet.save(output / "spritesheet.png")
    (output / "spritesheet.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    contact.save(output / "contact.png")
    return {"sheet": str(output / "spritesheet.png"), "metadata": str(output / "spritesheet.json"),
            "contact": str(output / "contact.png"), "review_directory": str(output / "review"),
            "sheet_size": list(sheet.size), "frames": len(frames)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    new = commands.add_parser("new", help="Create a transparent project")
    new.add_argument("project", type=Path)
    new.add_argument("--frames", nargs="+", default=["idle_00"])
    check = commands.add_parser("validate", help="Check dimensions, palette, names, durations")
    check.add_argument("project", type=Path)
    patch = commands.add_parser("paint", help="Apply [[x,y,symbol],...] from a JSON file")
    patch.add_argument("project", type=Path)
    patch.add_argument("frame")
    patch.add_argument("edits", type=Path)
    clone = commands.add_parser("clone", help="Append an independent copy of a frame")
    clone.add_argument("project", type=Path)
    clone.add_argument("source")
    clone.add_argument("target")
    export = commands.add_parser("render", help="Export exact PNGs, review PNGs, sheet, metadata")
    export.add_argument("project", type=Path)
    export.add_argument("--out", type=Path, required=True)
    export.add_argument("--columns", type=int, default=4)
    export.add_argument("--scale", type=int, default=12)
    args = parser.parse_args()
    try:
        if args.command == "new":
            require(not args.project.exists(), f"Project already exists: {args.project}")
            project = {"version": 1, "size": [WIDTH, HEIGHT], "anchor": [12, 31],
                       "palette": copy.deepcopy(DEFAULT_PALETTE),
                       "frames": [{"name": name, "duration_ms": 150, "rows": ["." * WIDTH for _ in range(HEIGHT)]}
                                  for name in args.frames]}
            save(args.project, project)
            result = {"project": str(args.project.resolve()), "frames": args.frames}
        else:
            project = load(args.project)
            if args.command == "validate":
                result = {"valid": True, "size": project["size"], "frames": [f["name"] for f in project["frames"]]}
            elif args.command == "paint":
                edits = json.loads(args.edits.read_text(encoding="utf-8"))
                changed = paint(project, args.frame, edits)
                before, after = get_frame(project, args.frame), get_frame(changed, args.frame)
                count = sum(a != b for row_a, row_b in zip(before["rows"], after["rows"])
                            for a, b in zip(row_a, row_b))
                result = {"changed_pixels": count, "backup": save(args.project, changed)}
            elif args.command == "clone":
                frame = copy.deepcopy(get_frame(project, args.source))
                frame["name"] = args.target
                project["frames"].append(frame)
                result = {"frame": args.target, "backup": save(args.project, project)}
            else:
                result = render(project, args.out, args.columns, args.scale)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(2, f"error: {error}\n")


if __name__ == "__main__":
    main()

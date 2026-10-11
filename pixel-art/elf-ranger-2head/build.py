#!/usr/bin/env python3
"""Draw a 24x32 two-head elf walk cycle and adapt it to the TacticsSD CLI format."""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, "/home/deck/.codex/skills/pixel-art-studio/scripts")
from pixelstudio import Sprite

ROOT = Path(__file__).parent
PALETTE = {
    ".": [0, 0, 0, 0],
    "O": [34, 31, 53, 255],   # cool plum outline
    "s": [183, 103, 104, 255],
    "S": [239, 166, 137, 255],
    "P": [255, 211, 170, 255],
    "h": [70, 48, 78, 255],
    "H": [121, 75, 112, 255],
    "L": [205, 137, 169, 255],
    "c": [31, 68, 61, 255],
    "C": [48, 112, 83, 255],
    "g": [72, 151, 101, 255],
    "G": [126, 194, 119, 255],
    "Y": [238, 193, 102, 255],
    "b": [55, 62, 89, 255],
    "B": [104, 112, 145, 255],
    "D": [86, 55, 64, 255],
    "W": [247, 238, 202, 255],
}
P = {key: "#%02x%02x%02x" % tuple(color[:3]) for key, color in PALETTE.items() if key != "."}


def poly(sprite, coords, color):
    sprite.polygon(coords, P[color])


def draw_head(sprite, y):
    # Pointed ears extend beyond the compact head silhouette.
    poly(sprite, [(7, y + 6), (3, y + 5), (5, y + 8), (7, y + 9)], "O")
    poly(sprite, [(7, y + 6), (4, y + 6), (6, y + 8), (7, y + 8)], "S")
    poly(sprite, [(16, y + 6), (20, y + 5), (18, y + 8), (16, y + 9)], "O")
    poly(sprite, [(16, y + 6), (19, y + 6), (17, y + 8), (16, y + 8)], "S")

    # Hair mass and face are stepped deliberately for a readable 2-head silhouette.
    poly(sprite, [(9, y), (14, y), (17, y + 3), (17, y + 9), (15, y + 12),
                  (8, y + 12), (6, y + 9), (6, y + 3)], "O")
    poly(sprite, [(9, y + 2), (14, y + 2), (16, y + 4), (16, y + 8),
                  (14, y + 10), (9, y + 10), (7, y + 8), (7, y + 4)], "S")
    poly(sprite, [(8, y + 2), (10, y + 1), (14, y + 1), (17, y + 4),
                  (16, y + 6), (14, y + 5), (12, y + 6), (10, y + 5),
                  (8, y + 7), (7, y + 6)], "H")
    # Bobbed side locks frame the face while keeping both eyes visible.
    poly(sprite, [(7, y + 5), (9, y + 6), (9, y + 10), (8, y + 12), (7, y + 10)], "h")
    poly(sprite, [(15, y + 5), (16, y + 5), (17, y + 8), (16, y + 11), (14, y + 11)], "h")
    sprite.px(9, y + 3, P["L"]).px(10, y + 2, P["L"]).px(11, y + 2, P["H"])
    # Eyes, nose, smile: high contrast at native size.
    sprite.px(9, y + 7, P["O"]).px(14, y + 7, P["O"])
    sprite.px(10, y + 7, P["W"]).px(15, y + 7, P["W"])
    sprite.px(12, y + 8, P["s"]).px(12, y + 10, P["h"])


def draw_frame(sprite, frame_index):
    # Contact / passing poses alternate the lead foot and opposite arm.
    poses = [
        {"bob": 0, "left_foot": (8, 29), "right_foot": (15, 27), "arm": -1, "cape": 0},
        {"bob": -1, "left_foot": (9, 27), "right_foot": (14, 29), "arm": 1, "cape": 1},
        {"bob": 0, "left_foot": (8, 27), "right_foot": (15, 29), "arm": 1, "cape": 0},
        {"bob": -1, "left_foot": (9, 29), "right_foot": (14, 27), "arm": -1, "cape": -1},
    ]
    q = poses[frame_index]
    bob = q["bob"]
    left_x, left_y = q["left_foot"]
    right_x, right_y = q["right_foot"]

    # Short leaf-green cloak behind the limbs; its hem lags slightly during passing.
    cx = q["cape"]
    poly(sprite, [(9, 16 + bob), (14, 16 + bob), (16 + cx, 20 + bob),
                  (15 + cx, 25 + bob), (12, 23 + bob), (9 - cx, 25 + bob),
                  (8 - cx, 20 + bob)], "c")
    poly(sprite, [(10, 17 + bob), (14, 17 + bob), (15 + cx, 20 + bob),
                  (13, 22 + bob), (9, 21 + bob)], "C")
    sprite.px(10, 18 + bob, P["G"]).px(11, 19 + bob, P["G"])

    # Legs: compact, opposite-phase strides under a stable belt/hip anchor.
    hip_y = 23 + bob
    for x, foot_y, side in ((left_x, left_y, "left"), (right_x, right_y, "right")):
        # Outline-backed trouser leg with a single cool highlight pixel.
        ankle_x = x
        top_x = 9 if side == "left" else 13
        poly(sprite, [(top_x, hip_y), (top_x + 3, hip_y), (ankle_x + 1, foot_y - 1),
                      (ankle_x - 1, foot_y - 1), (top_x + (1 if side == "left" else 2), hip_y + 2)], "O")
        poly(sprite, [(top_x + 1, hip_y), (top_x + 2, hip_y), (ankle_x, foot_y - 2),
                      (ankle_x - 1, foot_y - 2)], "b")
        sprite.px(ankle_x, foot_y - 3, P["B"])
        # Leather boots include a forward toe, varied to show the stride.
        toe = -1 if side == "left" else 1
        poly(sprite, [(ankle_x - 1, foot_y - 1), (ankle_x + 1, foot_y - 1),
                      (ankle_x + 2 * toe, foot_y), (ankle_x + 2 * toe, foot_y + 1),
                      (ankle_x - 1, foot_y + 1)], "O")
        sprite.rect(ankle_x - 1, foot_y - 1, ankle_x, foot_y, P["D"])
        sprite.px(ankle_x - 1, foot_y - 1, P["Y"])

    # Tunic and belt sit over the hips. Gold edging marks the ranger's collar.
    poly(sprite, [(9, 16 + bob), (14, 16 + bob), (16, 19 + bob),
                  (15, 24 + bob), (8, 24 + bob), (7, 19 + bob)], "O")
    poly(sprite, [(10, 17 + bob), (13, 17 + bob), (15, 19 + bob),
                  (14, 23 + bob), (9, 23 + bob), (8, 19 + bob)], "C")
    poly(sprite, [(10, 17 + bob), (12, 17 + bob), (11, 20 + bob), (9, 19 + bob)], "G")
    sprite.px(10, 17 + bob, P["Y"]).px(13, 17 + bob, P["Y"])
    sprite.rect(9, 22 + bob, 14, 22 + bob, P["Y"])
    sprite.px(12, 22 + bob, P["O"])
    sprite.line(11, 18 + bob, 12, 20 + bob, P["W"])

    # Arms counter-swing with the lead leg. Hands remain visible beyond the sleeves.
    arm = q["arm"]
    left_hand_y = 22 + bob + arm
    right_hand_y = 22 + bob - arm
    poly(sprite, [(8, 18 + bob), (10, 18 + bob), (9, left_hand_y),
                  (7, left_hand_y), (6, left_hand_y - 1)], "O")
    poly(sprite, [(14, 18 + bob), (16, 18 + bob), (18, right_hand_y - 1),
                  (17, right_hand_y + 1), (15, 21 + bob)], "O")
    sprite.line(8, 19 + bob, 7, left_hand_y - 1, P["g"])
    sprite.line(15, 19 + bob, 17, right_hand_y - 1, P["g"])
    sprite.px(7, left_hand_y, P["S"]).px(17, right_hand_y, P["S"])
    sprite.px(7, left_hand_y + 1, P["s"]).px(17, right_hand_y + 1, P["s"])

    draw_head(sprite, 3 + bob)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    sprite = Sprite(24, 32, palette=["#%02x%02x%02x" % tuple(v[:3]) for k, v in PALETTE.items() if k != "."])
    durations = [120, 100, 120, 100]
    for i in range(4):
        if i:
            sprite.add_frame(copy=False, duration=durations[i])
        else:
            sprite.set_duration(durations[i])
        draw_frame(sprite, i)
    sprite.tag("walk", 1, 4, "forward")
    sprite.save_png(ROOT / "walk-preview.png", frame=1, scale=8)

    project = {
        "version": 1,
        "size": [24, 32],
        "anchor": [12, 30],
        "palette": PALETTE,
        "frames": [],
    }
    names = ["walk_00_contact_right", "walk_01_passing", "walk_02_contact_left", "walk_03_passing"]
    for i, name in enumerate(names):
        image_path = ROOT / "frames" / f"{name}.png"
        image_path.parent.mkdir(exist_ok=True)
        sprite.save_png(image_path, frame=i + 1, scale=1)
        with Image.open(image_path).convert("RGBA") as image:
            rows = []
            for y in range(32):
                row = []
                for x in range(24):
                    rgba = image.getpixel((x, y))
                    if rgba[3] == 0:
                        row.append(".")
                    else:
                        key = next((k for k, v in PALETTE.items() if tuple(v) == rgba), None)
                        if key is None:
                            raise ValueError(f"Unmapped color {rgba} in {name} at {(x, y)}")
                        row.append(key)
                rows.append("".join(row))
        project["frames"].append({"name": name, "duration_ms": durations[i], "rows": rows})
    (ROOT / "elf-ranger-walk.json").write_text(json.dumps(project, indent=2) + "\n", encoding="utf-8")
    sprite.save_silhouette(ROOT / "silhouette.png", frame=1, scale=8)
    print("palette colors:", len(PALETTE) - 1)
    print("frame count:", sprite.n_frames)
    print("walk cycle duration:", sum(durations), "ms")


if __name__ == "__main__":
    main()

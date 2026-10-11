#!/usr/bin/env python3
"""Pixelize the ImageGen base once, then write a pixel_sprite_tool project."""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
BASE = ROOT / "base-imagegen.png"
FRAME_W, FRAME_H = 24, 32
CHAR_W, CHAR_H = 16, 30
SYMBOLS = "ABCDEFGHIJKLMNO"


def main():
    source = Image.open(BASE).convert("RGBA")
    alpha = source.getchannel("A")
    # Drop faint transparency noise from the generated edge, retaining the opaque silhouette.
    solid = alpha.point(lambda value: 255 if value >= 128 else 0)
    bbox = solid.getbbox()
    if bbox is None:
        raise ValueError("The generated base has no visible subject")
    subject = source.crop(bbox)
    subject_alpha = solid.crop(bbox)

    scale = min(CHAR_W / subject.width, CHAR_H / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    mask = subject_alpha.resize(size, Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= 128 else 0
    )
    rgb = subject.convert("RGB").resize(size, Image.Resampling.LANCZOS)
    # Fill transparent holes with the outline color before palette selection so
    # their hidden RGB values cannot waste palette slots on black noise.
    outline = (34, 31, 53)
    rgb = Image.composite(rgb, Image.new("RGB", size, outline), mask)
    quantized = rgb.quantize(colors=15, method=Image.Quantize.MEDIANCUT,
                             dither=Image.Dither.NONE).convert("RGB")

    colors = [color for count, color in sorted(quantized.getcolors(maxcolors=1 << 20), reverse=True)]
    if len(colors) > len(SYMBOLS):
        raise ValueError("Quantized palette exceeds the supported 15 opaque colors")
    color_to_symbol = {color: SYMBOLS[index] for index, color in enumerate(colors)}
    palette = {".": [0, 0, 0, 0]}
    for color, symbol in color_to_symbol.items():
        palette[symbol] = [*color, 255]
    palette.update({
        "P": [232, 164, 55, 255],   # amber iris, retained from the base illustration
        "Q": [255, 225, 177, 255],  # eye catchlight
        "R": [77, 43, 44, 255],     # mouth / deepest facial detail
    })
    color_to_symbol.update({tuple(palette[symbol][:3]): symbol for symbol in "PQR"})

    native = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    x = (FRAME_W - size[0]) // 2
    y = FRAME_H - 1 - size[1]
    native.paste(quantized.convert("RGBA"), (x, y), mask)
    # Restore the base illustration's large eyes and small smile at native scale.
    for point, symbol in {
        (9, 8): "R", (10, 8): "P", (10, 7): "Q",
        (14, 7): "Q", (14, 8): "P", (15, 8): "R",
        (12, 11): "R",
    }.items():
        native.putpixel(point, tuple(palette[symbol]))
    native.save(ROOT / "base.png")
    native.resize((FRAME_W * 10, FRAME_H * 10), Image.Resampling.NEAREST).save(ROOT / "base-preview.png")

    pixels = native.load()
    rows = []
    for py in range(FRAME_H):
        row = []
        for px in range(FRAME_W):
            rgba = pixels[px, py]
            if rgba[3] == 0:
                row.append(".")
            else:
                color = rgba[:3]
                if color not in color_to_symbol:
                    raise ValueError(f"Unmapped color {color} at {(px, py)}")
                row.append(color_to_symbol[color])
        rows.append("".join(row))

    project = {
        "version": 1,
        "size": [FRAME_W, FRAME_H],
        "anchor": [12, 30],
        "palette": palette,
        "frames": [{"name": "base", "duration_ms": 300, "rows": rows}],
    }
    (ROOT / "elf-ranger.json").write_text(json.dumps(project, indent=2) + "\n", encoding="utf-8")
    print(f"source={source.size} crop={subject.size} pixelized={size} offset={(x, y)} colors={len(colors)}")


if __name__ == "__main__":
    main()

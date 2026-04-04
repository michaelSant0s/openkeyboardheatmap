#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "src" / "assets"
BUILD_ICONS_DIR = ROOT / "build" / "icons"


def lerp_channel(start: int, end: int, t: float) -> int:
    return int(round(start + (end - start) * t))


def lerp_color(start: tuple[int, int, int], end: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        lerp_channel(start[0], end[0], t),
        lerp_channel(start[1], end[1], t),
        lerp_channel(start[2], end[2], t),
    )


def draw_background(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    width, height = image.size
    top = (31, 41, 60)
    bottom = (8, 14, 27)
    for y in range(height):
        t = y / (height - 1)
        draw.line([(0, y), (width, y)], fill=(*lerp_color(top, bottom, t), 255))

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    center = (int(width * 0.56), int(height * 0.42))
    max_radius = int(width * 0.45)
    for radius in range(max_radius, 0, -8):
        t = radius / max_radius
        alpha = int(64 * (1 - t) * (1 - t))
        glow_draw.ellipse(
            (
                center[0] - radius,
                center[1] - radius,
                center[0] + radius,
                center[1] + radius,
            ),
            fill=(73, 189, 114, alpha),
        )

    image.alpha_composite(glow)


def rounded_rect(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int] | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_keyboard_icon(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)

    # App tile
    rounded_rect(
        draw,
        (70, 70, 954, 954),
        radius=180,
        fill=(14, 21, 34, 236),
        outline=(62, 80, 104, 255),
        width=6,
    )

    # Keyboard shell
    rounded_rect(
        draw,
        (170, 230, 854, 790),
        radius=72,
        fill=(17, 25, 39, 255),
        outline=(74, 94, 120, 255),
        width=4,
    )

    key_colors = [
        (42, 57, 79),
        (57, 77, 106),
        (75, 101, 135),
        (102, 135, 173),
        (127, 163, 198),
        (86, 122, 83),
        (140, 180, 78),
        (92, 203, 107),
        (58, 190, 110),
    ]
    key_size = 96
    gap = 24
    start_x = 228
    start_y = 292

    palette_index = 0
    for row in range(3):
        for col in range(5):
            fill = key_colors[min(palette_index, len(key_colors) - 1)]
            if row < 2:
                fill = key_colors[min(col + row * 2, len(key_colors) - 1)]
            if row == 2:
                fill = key_colors[min(5 + col, len(key_colors) - 1)]
            x = start_x + col * (key_size + gap)
            y = start_y + row * (key_size + gap)
            rounded_rect(
                draw,
                (x, y, x + key_size, y + key_size),
                radius=20,
                fill=(*fill, 255),
            )
            palette_index += 1

    # Space row
    rounded_rect(draw, (228, 652, 500, 714), radius=18, fill=(45, 61, 84, 255))
    rounded_rect(draw, (524, 652, 620, 714), radius=18, fill=(45, 61, 84, 255))
    rounded_rect(draw, (644, 652, 740, 714), radius=18, fill=(45, 61, 84, 255))

    # Subtle gloss
    gloss = Image.new("RGBA", image.size, (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss)
    gloss_draw.ellipse((120, 96, 820, 540), fill=(255, 255, 255, 22))
    image.alpha_composite(gloss.filter(ImageFilter.GaussianBlur(radius=10)))


def save_sizes(base: Image.Image, outputs: Iterable[tuple[Path, int]]) -> None:
    for path, size in outputs:
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        path.parent.mkdir(parents=True, exist_ok=True)
        resized.save(path)


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_ICONS_DIR.mkdir(parents=True, exist_ok=True)

    base = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_background(base)
    draw_keyboard_icon(base)

    save_sizes(
        base,
        [
            (ASSETS_DIR / "app-icon-1024.png", 1024),
            (ASSETS_DIR / "app-icon-512.png", 512),
            (ASSETS_DIR / "app-icon-256.png", 256),
            (ASSETS_DIR / "app-icon-64.png", 64),
            (BUILD_ICONS_DIR / "icon.png", 512),
        ],
    )

    base.save(
        BUILD_ICONS_DIR / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    try:
        base.save(BUILD_ICONS_DIR / "icon.icns", format="ICNS")
    except Exception:
        # Optional convenience output; mac builds can still set a custom icon later.
        pass


if __name__ == "__main__":
    main()

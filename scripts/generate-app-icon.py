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


def rounded_rect(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int] | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_icon(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    width, height = image.size
    center_x = width // 2
    center_y = height // 2
    outer_radius = int(min(width, height) * 0.40)

    # Circular badge base with slight radial depth.
    for radius in range(outer_radius, 0, -3):
        t = 1 - (radius / outer_radius)
        color = lerp_color((49, 55, 63), (62, 69, 78), t)
        draw.ellipse(
            (
                center_x - radius,
                center_y - radius,
                center_x + radius,
                center_y + radius,
            ),
            fill=(*color, 255),
        )

    key_size = int(width * 0.205)
    key_gap = int(width * 0.032)
    key_radius = int(width * 0.032)
    keys_total = key_size * 2 + key_gap
    start_x = center_x - (keys_total // 2)
    start_y = center_y - (keys_total // 2)

    key_rects: list[tuple[int, int, int, int]] = []
    for row in range(2):
        for col in range(2):
            x0 = start_x + col * (key_size + key_gap)
            y0 = start_y + row * (key_size + key_gap)
            key_rects.append((x0, y0, x0 + key_size, y0 + key_size))

    # Soft key shadows
    shadows = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadows)
    for x0, y0, x1, y1 in key_rects:
        rounded_rect(
            shadow_draw,
            (x0, y0 + int(width * 0.006), x1, y1 + int(width * 0.006)),
            radius=key_radius,
            fill=(0, 0, 0, 62),
        )
    image.alpha_composite(shadows.filter(ImageFilter.GaussianBlur(radius=int(width * 0.008))))

    key_light = (217, 222, 228, 255)
    key_green = (117, 185, 130, 255)
    key_colors = [key_light, key_green, key_light, key_light]
    for rect, fill in zip(key_rects, key_colors):
        rounded_rect(draw, rect, radius=key_radius, fill=fill)

    # Faint top highlight over badge.
    gloss = Image.new("RGBA", image.size, (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss)
    highlight_radius = int(width * 0.26)
    gloss_draw.ellipse(
        (
            center_x - highlight_radius,
            center_y - int(width * 0.28),
            center_x + highlight_radius,
            center_y,
        ),
        fill=(255, 255, 255, 20),
    )
    image.alpha_composite(gloss.filter(ImageFilter.GaussianBlur(radius=int(width * 0.02))))


def save_sizes(base: Image.Image, outputs: Iterable[tuple[Path, int]]) -> None:
    for path, size in outputs:
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        path.parent.mkdir(parents=True, exist_ok=True)
        resized.save(path)


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_ICONS_DIR.mkdir(parents=True, exist_ok=True)

    base = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_icon(base)

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

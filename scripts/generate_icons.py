"""Generate InkNote app icons matching the in-app SVG logo."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "src-tauri" / "icons"
PUBLIC = ROOT / "public"


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def draw_logo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size / 32.0

    c1 = (122, 162, 247)  # #7AA2F7
    c2 = (91, 141, 239)  # #5B8DEF
    c3 = (59, 107, 199)  # #3B6BC7
    radius = max(2, int(round(8 * s)))
    pad = max(1, int(round(1.5 * s)))
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius, fill=255)

    grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = grad.load()
    assert px is not None
    for y in range(y0, y1):
        for x in range(x0, x1):
            tx = (x - x0) / max(1, (x1 - x0))
            ty = (y - y0) / max(1, (y1 - y0))
            t = (tx + ty) / 2
            if t < 0.55:
                c = lerp(c1, c2, t / 0.55)
            else:
                c = lerp(c2, c3, (t - 0.55) / 0.45)
            px[x, y] = (*c, 255)

    img = Image.composite(grad, img, mask)
    draw = ImageDraw.Draw(img)
    white = (244, 247, 255, 255)
    stroke = max(1, int(round(1.7 * s)))

    def p(x: float, y: float) -> tuple[float, float]:
        return (x * s, y * s)

    # Main stroke points (scaled from 32x32 logo)
    pts = [
        p(10.0, 21.5),
        p(11.2, 20.2),
        p(12.4, 18.0),
        p(13.3, 15.8),
        p(14.2, 14.0),
        p(15.5, 12.6),
        p(17.0, 11.6),
        p(18.6, 11.2),
        p(20.0, 11.8),
        p(20.8, 13.0),
        p(20.5, 14.4),
        p(19.2, 15.4),
        p(17.6, 15.6),
    ]
    draw.line(pts, fill=white, width=stroke, joint="curve")

    tip = [p(18.2, 9.2), p(22.8, 7.4), p(21.6, 12.5)]
    draw.line(tip[:2], fill=white, width=stroke, joint="curve")
    draw.line(tip[1:], fill=white, width=stroke, joint="curve")

    r = max(1.0, 1.35 * s)
    cx, cy = p(12.2, 22.2)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=white)
    return img


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    sizes_map = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }

    for name, sz in sizes_map.items():
        path = ICONS / name
        draw_logo(sz).save(path, "PNG")
        print(f"wrote {path}")

    # Multi-size ICO for Windows taskbar / exe
    ico_path = ICONS / "icon.ico"
    base = draw_logo(256)
    base.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"wrote {ico_path}")

    # Keep icns placeholder by also writing a large png-based copy if needed later
    # Public assets for web / about
    draw_logo(64).save(PUBLIC / "logo.png", "PNG")
    draw_logo(256).save(PUBLIC / "icon-256.png", "PNG")
    print("public logos ok")


if __name__ == "__main__":
    main()

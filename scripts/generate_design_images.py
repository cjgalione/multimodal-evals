#!/usr/bin/env python3
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path("public/eval-images/design")


def load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def vertical_gradient(
    width: int,
    height: int,
    start: Tuple[int, int, int],
    end: Tuple[int, int, int],
) -> Image.Image:
    image = Image.new("RGB", (width, height), start)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(int(start[i] * (1 - t) + end[i] * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return image


def save_image(image: Image.Image, filename: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image.save(OUT_DIR / filename, format="PNG")


def hero_title_slide() -> None:
    image = vertical_gradient(1280, 720, (15, 37, 84), (67, 56, 202))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 720), outline=(120, 138, 255), width=2)
    draw.line((120, 252, 940, 252), fill=(22, 198, 198), width=6)
    draw.text((120, 170), "Scale Your Marketing With AI", fill="white", font=load_font(54))
    draw.text((120, 286), "Automate creative workflows and accelerate campaign output.", fill=(214, 223, 255), font=load_font(28))
    draw.ellipse((1080, 70, 1180, 170), outline=(200, 220, 255), width=4)
    draw.text((1098, 110), "LOGO", fill=(223, 238, 255), font=load_font(18))
    save_image(image, "hero-title-slide.png")


def marketing_infographic() -> None:
    image = Image.new("RGB", (800, 1200), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((40, 40, 760, 190), fill=(27, 152, 152))
    draw.text((84, 92), "3 Reasons Brands Trust AI", fill="white", font=load_font(40))

    stats = [
        ("47%", "Cost Reduction"),
        ("3x", "Faster Output"),
        ("89%", "Satisfaction"),
    ]
    y = 250
    for value, label in stats:
        draw.rounded_rectangle((80, y, 720, y + 250), radius=30, fill=(245, 131, 61))
        draw.ellipse((116, y + 70, 216, y + 170), outline="white", width=4)
        draw.text((260, y + 88), value, fill="white", font=load_font(56))
        draw.text((260, y + 160), label, fill=(255, 246, 238), font=load_font(26))
        y += 300

    draw.rectangle((40, 40, 760, 1160), outline=(210, 217, 226), width=3)
    save_image(image, "marketing-infographic.png")


def social_product_card() -> None:
    image = Image.new("RGB", (1080, 1080), (246, 129, 120))
    draw = ImageDraw.Draw(image)
    draw.rectangle((200, 170, 880, 650), fill=(208, 214, 220))
    draw.rectangle((260, 240, 820, 590), outline=(160, 170, 178), width=4)

    draw.rounded_rectangle((84, 86, 324, 164), radius=30, fill=(245, 216, 94))
    draw.text((114, 114), "NEW LAUNCH", fill=(62, 61, 49), font=load_font(24))

    draw.text((120, 720), "ProMax Wireless Earbuds", fill="white", font=load_font(52))
    draw.rounded_rectangle((120, 840, 420, 928), radius=34, fill="white")
    draw.text((174, 874), "Shop Now →", fill=(79, 94, 106), font=load_font(30))

    save_image(image, "social-product-card.png")


def split_layout_slide() -> None:
    image = Image.new("RGB", (1280, 720), (37, 42, 48))
    draw = ImageDraw.Draw(image)
    right = vertical_gradient(640, 720, (33, 95, 205), (60, 132, 240))
    image.paste(right, (640, 0))
    draw = ImageDraw.Draw(image)

    draw.text((90, 120), "Why Choose Us", fill=(244, 248, 255), font=load_font(52))
    bullets = [
        "• Trusted by top operators",
        "• Fast onboarding and support",
        "• Proven performance outcomes",
    ]
    for idx, bullet in enumerate(bullets):
        draw.text((95, 235 + idx * 90), bullet, fill=(210, 219, 232), font=load_font(28))

    draw.rectangle((822, 180, 1170, 520), outline=(188, 221, 255), width=4)
    draw.line((640, 70, 640, 650), fill=(152, 167, 188), width=2)
    save_image(image, "split-layout-slide.png")


def metrics_dashboard() -> None:
    image = Image.new("RGB", (1280, 720), (23, 29, 37))
    draw = ImageDraw.Draw(image)

    draw.text((66, 52), "Q4 2024 Performance", fill=(229, 235, 243), font=load_font(44))

    kpis = [
        ("Revenue", "$2.4M"),
        ("Users", "127K"),
        ("Churn", "3.2%"),
    ]
    x = 66
    for name, value in kpis:
        draw.rounded_rectangle((x, 124, x + 350, 240), radius=16, fill=(35, 44, 55))
        draw.text((x + 26, 152), f"{name}: {value}", fill=(222, 230, 239), font=load_font(30))
        x += 390

    chart_left = 90
    chart_top = 320
    chart_height = 300
    chart_width = 1100
    for i in range(6):
        y = chart_top + (chart_height // 5) * i
        draw.line((chart_left, y, chart_left + chart_width, y), fill=(54, 63, 75), width=1)

    months = ["Aug", "Sep", "Oct", "Nov", "Dec"]
    values = [120, 170, 210, 260, 300]
    bar_width = 130
    gap = 80
    for idx, month in enumerate(months):
        x0 = chart_left + idx * (bar_width + gap)
        x1 = x0 + bar_width
        bar_height = values[idx]
        y0 = chart_top + chart_height - bar_height
        y1 = chart_top + chart_height
        draw.rectangle((x0, y0, x1, y1), fill=(80, 139, 255))
        draw.text((x0 + 35, y1 + 14), month, fill=(202, 212, 224), font=load_font(22))

    save_image(image, "metrics-dashboard.png")


def main() -> None:
    hero_title_slide()
    marketing_infographic()
    social_product_card()
    split_layout_slide()
    metrics_dashboard()
    print(f"Generated 5 design images in {OUT_DIR}")


if __name__ == "__main__":
    main()

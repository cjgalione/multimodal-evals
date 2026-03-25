"""
Generate 5 design images styled like Canva/Gamma output.
Output: public/eval-images/design/
Usage: python scripts/generate_design_images.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "eval-images", "design")
os.makedirs(OUT_DIR, exist_ok=True)


def out(filename: str) -> str:
    return os.path.join(OUT_DIR, filename)


def default_font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        # Older Pillow: load_default() takes no args, scale manually
        return ImageFont.load_default()


def draw_text_wrapped(draw, text, x, y, max_width, font, fill):
    """Draw text, wrapping at max_width pixels."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), line, font=font)
        y += (bbox[3] - bbox[1]) + 6
    return y


# ── 1. Hero Title Slide (Gamma-style) ────────────────────────────────────────
def make_hero_title_slide():
    W, H = 1280, 720
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Navy → purple gradient background
    for y in range(H):
        t = y / H
        r = int(15 + t * 60)
        g = int(23 + t * 10)
        b = int(80 + t * 100)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Subtle diagonal highlight (top-right)
    for x in range(W):
        for y in range(int(H * 0.35)):
            t = 1.0 - (x / W + y / (H * 0.35)) / 2
            if t > 0.6:
                alpha = int((t - 0.6) * 80)
                px = img.getpixel((x, y))
                img.putpixel((x, y), (
                    min(255, px[0] + alpha),
                    min(255, px[1] + alpha // 2),
                    min(255, px[2] + alpha // 3),
                ))

    draw = ImageDraw.Draw(img)

    # Logo circle placeholder (top-left)
    draw.ellipse([40, 28, 80, 68], outline=(255, 255, 255, 180), width=2)
    draw.text((51, 37), "L", font=default_font(22), fill=(255, 255, 255))

    # Teal accent line
    draw.rectangle([80, 240, 540, 246], fill=(20, 184, 166))

    # Headline
    headline_font = default_font(72)
    draw.text((80, 260), "Scale Your Marketing", font=headline_font, fill=(255, 255, 255))
    draw.text((80, 345), "With AI", font=headline_font, fill=(255, 255, 255))

    # Subtitle
    sub_font = default_font(28)
    draw.text((82, 445), "Leverage data-driven insights to 10x your growth", font=sub_font,
              fill=(180, 220, 215))

    # CTA hint text (bottom-right)
    small_font = default_font(18)
    draw.text((W - 220, H - 50), "gamma.app  ·  2025", font=small_font, fill=(120, 160, 155))

    img.save(out("hero-title-slide.png"))
    print("  ✓ hero-title-slide.png")


# ── 2. Marketing Infographic (Canva-style) ────────────────────────────────────
def make_marketing_infographic():
    W, H = 800, 1200
    img = Image.new("RGB", (W, H), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Teal header band
    draw.rectangle([0, 0, W, 140], fill=(15, 118, 110))

    # Header text
    h1 = default_font(38)
    draw.text((40, 30), "3 Reasons Brands Trust AI", font=h1, fill=(255, 255, 255))
    draw.text((40, 85), "The data behind the shift to intelligent marketing", font=default_font(20),
              fill=(180, 230, 225))

    stat_blocks = [
        ("47%", "Cost Reduction", "Brands report lower creative production costs\nafter integrating AI workflows.", (255, 107, 53)),
        ("3x", "Faster Output", "AI-assisted teams ship campaigns three\ntimes faster than manual processes.", (234, 88, 12)),
        ("89%", "Satisfaction", "Marketing leaders say AI tools improved\ntheir team's overall satisfaction scores.", (220, 60, 10)),
    ]

    block_h = 290
    for i, (stat, label, desc, color) in enumerate(stat_blocks):
        y0 = 180 + i * (block_h + 28)

        # Block background
        draw.rectangle([30, y0, W - 30, y0 + block_h], fill=(255, 250, 248),
                       outline=(230, 220, 215), width=1)

        # Colored left accent bar
        draw.rectangle([30, y0, 56, y0 + block_h], fill=color)

        # Icon circle
        cx, cy = 100, y0 + 55
        draw.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=color)
        draw.text((cx - 8, cy - 13), "★", font=default_font(22), fill=(255, 255, 255))

        # Stat numeral
        big_font = default_font(88)
        draw.text((70, y0 + 90), stat, font=big_font, fill=color)

        # Label
        draw.text((70, y0 + 185), label.upper(), font=default_font(26),
                  fill=(50, 50, 60))

        # Description (two lines)
        for j, line in enumerate(desc.split("\n")):
            draw.text((70, y0 + 222 + j * 28), line, font=default_font(19), fill=(100, 110, 120))

    # Footer
    draw.rectangle([0, H - 60, W, H], fill=(15, 118, 110))
    draw.text((40, H - 42), "Powered by Canva  ·  canva.com", font=default_font(18),
              fill=(180, 230, 225))

    img.save(out("marketing-infographic.png"))
    print("  ✓ marketing-infographic.png")


# ── 3. Social Product Card (Canva-style) ─────────────────────────────────────
def make_social_product_card():
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), color=(255, 99, 90))  # Coral
    draw = ImageDraw.Draw(img)

    # Subtle texture stripes
    for y in range(0, H, 8):
        alpha = 8
        draw.line([(0, y), (W, y)], fill=(255, 80, 70), width=1)

    # Product image placeholder (rounded-rect feel)
    px0, py0, px1, py1 = 90, 90, W - 90, 580
    draw.rectangle([px0, py0, px1, py1], fill=(220, 215, 210), outline=(200, 195, 190), width=2)
    draw.text((px0 + 20, py0 + 20), "[ Product Image ]", font=default_font(28), fill=(160, 155, 150))
    # Simple product silhouette
    draw.ellipse([430, 200, 650, 480], fill=(180, 175, 170))
    draw.rectangle([480, 320, 600, 520], fill=(140, 135, 130))

    # "NEW LAUNCH" badge
    draw.rectangle([90, 88, 268, 134], fill=(255, 220, 0))
    draw.text((98, 96), "NEW LAUNCH", font=default_font(30), fill=(50, 40, 0))

    # Headline
    draw.text((90, 610), "ProMax Wireless", font=default_font(68), fill=(255, 255, 255))
    draw.text((90, 685), "Earbuds", font=default_font(68), fill=(255, 255, 255))

    # Subtext
    draw.text((90, 775), "Experience Sound Like Never Before", font=default_font(30),
              fill=(255, 220, 215))

    # Price
    draw.text((90, 825), "$149  ·  Free shipping", font=default_font(26), fill=(255, 240, 220))

    # CTA button
    btn_x0, btn_y0, btn_x1, btn_y1 = 90, 890, 360, 954
    draw.rounded_rectangle([btn_x0, btn_y0, btn_x1, btn_y1], radius=30, fill=(255, 255, 255))
    draw.text((btn_x0 + 38, btn_y0 + 14), "Shop Now  →", font=default_font(32), fill=(200, 50, 40))

    # Brand footer stripe
    draw.rectangle([0, H - 54, W, H], fill=(180, 40, 30))
    draw.text((90, H - 38), "promax.audio", font=default_font(22), fill=(255, 200, 195))

    img.save(out("social-product-card.png"))
    print("  ✓ social-product-card.png")


# ── 4. Split-Layout Slide (Gamma-style) ───────────────────────────────────────
def make_split_layout_slide():
    W, H = 1280, 720
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Left half — dark gray
    draw.rectangle([0, 0, W // 2, H], fill=(28, 32, 38))

    # Right half — blue gradient
    for x in range(W // 2, W):
        t = (x - W // 2) / (W // 2)
        r = int(14 + t * 20)
        g = int(60 + t * 50)
        b = int(160 + t * 80)
        draw.line([(x, 0), (x, H)], fill=(r, g, b))

    # Divider line
    draw.line([(W // 2, 0), (W // 2, H)], fill=(80, 90, 100), width=2)

    # Right half: image placeholder text + camera icon
    draw.text((W // 2 + 80, H // 2 - 60), "[ Image ]", font=default_font(36), fill=(120, 160, 200))
    draw.ellipse([W // 2 + 200, H // 2 - 10, W // 2 + 280, H // 2 + 70],
                 outline=(100, 150, 200), width=3)
    draw.ellipse([W // 2 + 220, H // 2 + 8, W // 2 + 260, H // 2 + 50],
                 fill=(100, 150, 200))

    # Left half: section header
    draw.text((60, 80), "Why Choose Us", font=default_font(52), fill=(255, 255, 255))

    # Teal accent underline
    draw.rectangle([60, 142, 340, 148], fill=(20, 184, 166))

    # Bullet points
    bullets = [
        ("Speed", "Ship 3× faster with AI-driven workflows"),
        ("Quality", "Consistent brand voice across all channels"),
        ("Insight", "Real-time analytics on every campaign"),
    ]
    y = 190
    for title, detail in bullets:
        draw.ellipse([60, y + 4, 80, y + 24], fill=(20, 184, 166))
        draw.text((95, y), title, font=default_font(30), fill=(255, 255, 255))
        draw.text((95, y + 36), detail, font=default_font(20), fill=(160, 175, 190))
        y += 110

    # Slide number
    draw.text((W - 60, H - 36), "04", font=default_font(20), fill=(100, 130, 160))

    img.save(out("split-layout-slide.png"))
    print("  ✓ split-layout-slide.png")


# ── 5. Metrics Dashboard Slide (Gamma-style) ─────────────────────────────────
def make_metrics_dashboard():
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), color=(18, 22, 30))
    draw = ImageDraw.Draw(img)

    # Title
    draw.text((60, 40), "Q4 2024 Performance", font=default_font(48), fill=(240, 245, 255))
    draw.text((60, 98), "Key metrics vs. Q3 targets", font=default_font(22), fill=(120, 140, 170))
    draw.rectangle([60, 130, 520, 134], fill=(99, 102, 241))  # indigo accent

    # KPI boxes
    kpis = [
        ("Revenue", "$2.4M", "+18% YoY", (99, 102, 241)),
        ("Users", "127K", "+34% YoY", (34, 197, 94)),
        ("Churn", "3.2%", "-0.8pp YoY", (251, 113, 133)),
    ]
    box_w = 240
    box_gap = 30
    boxes_total = len(kpis) * box_w + (len(kpis) - 1) * box_gap
    bx0 = 60
    by0 = 155

    for i, (label, value, change, color) in enumerate(kpis):
        x0 = bx0 + i * (box_w + box_gap)
        y0 = by0
        draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + 145], radius=12,
                                fill=(28, 34, 46), outline=color, width=1)
        draw.text((x0 + 16, y0 + 14), label.upper(), font=default_font(16),
                  fill=(120, 140, 170))
        draw.text((x0 + 16, y0 + 42), value, font=default_font(44), fill=(240, 245, 255))
        draw.text((x0 + 16, y0 + 96), change, font=default_font(20), fill=color)

    # Bar chart area
    chart_x0, chart_y0 = 60, 340
    chart_w, chart_h = W - 120, 290

    # Grid background
    draw.rounded_rectangle([chart_x0, chart_y0, chart_x0 + chart_w, chart_y0 + chart_h],
                            radius=12, fill=(24, 30, 42))

    # Grid lines
    for i in range(1, 5):
        y = chart_y0 + chart_h - int(i * chart_h * 0.22)
        draw.line([(chart_x0 + 20, y), (chart_x0 + chart_w - 20, y)],
                  fill=(40, 50, 65), width=1)

    # Bars (5 monthly bars)
    months = ["Aug", "Sep", "Oct", "Nov", "Dec"]
    values = [0.55, 0.72, 0.61, 0.85, 0.94]
    bar_area_w = chart_w - 60
    bar_w = int(bar_area_w / (len(months) * 2))
    bar_color = (99, 102, 241)
    bar_color_latest = (129, 140, 248)

    for i, (month, val) in enumerate(zip(months, values)):
        spacing = bar_area_w // len(months)
        bx = chart_x0 + 30 + i * spacing + spacing // 4
        bar_h_px = int(val * (chart_h - 60))
        by1 = chart_y0 + chart_h - 20
        by0_bar = by1 - bar_h_px
        color = bar_color_latest if i == len(months) - 1 else bar_color
        draw.rounded_rectangle([bx, by0_bar, bx + bar_w, by1], radius=4, fill=color)
        # Month label
        draw.text((bx + 2, by1 + 6), month, font=default_font(17), fill=(100, 120, 150))
        # Value label above bar
        pct = f"{int(val * 100)}%"
        draw.text((bx, by0_bar - 22), pct, font=default_font(16), fill=(180, 190, 220))

    # Chart label
    draw.text((chart_x0 + 10, chart_y0 + 8), "Monthly Revenue Index", font=default_font(18),
              fill=(100, 120, 150))

    img.save(out("metrics-dashboard.png"))
    print("  ✓ metrics-dashboard.png")


if __name__ == "__main__":
    print(f"Generating design images into: {os.path.abspath(OUT_DIR)}")
    make_hero_title_slide()
    make_marketing_infographic()
    make_social_product_card()
    make_split_layout_slide()
    make_metrics_dashboard()
    print("Done.")

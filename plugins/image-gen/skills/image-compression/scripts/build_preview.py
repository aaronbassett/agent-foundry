#!/usr/bin/env python3
"""Build a self-contained HTML comparison page for image compression results.

Copies the original image and one or more compressed variants into an output
directory alongside an ``index.html`` rendered from ``assets/compare-template.html``.
The page supports four comparison views (side-by-side, press-and-hold, alpha
slider, before/after slider) and a variant picker when multiple variants are
given.

Examples
--------
Single comparison (original vs one compressed image)::

    build_preview.py --original photo.jpg --variant photo.webp \
        --out-dir /tmp/preview-1 --title "photo.jpg → WebP q80"

Multiple variants (let the user pick a compression level/format)::

    build_preview.py --original hero.png \
        --variant hero-q90.webp --label "WebP q90" \
        --variant hero-q75.webp --label "WebP q75" \
        --variant hero.avif      --label "AVIF q60" \
        --out-dir /tmp/preview-2 --title "hero.png variants"

Labels align with --variant by order. If fewer labels than variants are given,
remaining variants are auto-labelled from their filename.
"""

import argparse
import json
import os
import shutil
import sys


def fmt_format(path):
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    aliases = {"jpg": "JPEG", "jpeg": "JPEG", "jxl": "JPEG-XL"}
    return aliases.get(ext, ext.upper() or "?")


def copy_in(src, images_dir, used):
    """Copy src into images_dir, avoiding filename collisions. Returns rel path."""
    base = os.path.basename(src)
    name = base
    i = 1
    while name in used:
        stem, ext = os.path.splitext(base)
        name = "{}-{}{}".format(stem, i, ext)
        i += 1
    used.add(name)
    shutil.copy2(src, os.path.join(images_dir, name))
    return "images/" + name


def main():
    p = argparse.ArgumentParser(description="Build an HTML image-compression comparison page.")
    p.add_argument("--original", required=True, help="Path to the original (uncompressed) image.")
    p.add_argument("--variant", action="append", default=[], required=True,
                   help="Path to a compressed variant. Repeatable.")
    p.add_argument("--label", action="append", default=[],
                   help="Label for the corresponding --variant (aligned by order). Repeatable.")
    p.add_argument("--out-dir", required=True, help="Output directory for the preview (created if missing).")
    p.add_argument("--title", default=None, help="Page title.")
    args = p.parse_args()

    # Validate inputs.
    if not os.path.isfile(args.original):
        sys.exit("error: original not found: " + args.original)
    for v in args.variant:
        if not os.path.isfile(v):
            sys.exit("error: variant not found: " + v)

    template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "..", "assets", "compare-template.html")
    if not os.path.isfile(template_path):
        sys.exit("error: template missing: " + template_path)

    out_dir = os.path.abspath(args.out_dir)
    images_dir = os.path.join(out_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    used = set()
    orig_rel = copy_in(args.original, images_dir, used)
    data = {
        "title": args.title or (os.path.basename(args.original) + " — compression preview"),
        "original": {
            "name": os.path.basename(args.original),
            "src": orig_rel,
            "bytes": os.path.getsize(args.original),
            "format": fmt_format(args.original),
        },
        "variants": [],
    }

    for i, v in enumerate(args.variant):
        label = args.label[i] if i < len(args.label) else None
        data["variants"].append({
            "name": os.path.basename(v),
            "label": label or (fmt_format(v) + " · " + os.path.basename(v)),
            "src": copy_in(v, images_dir, used),
            "bytes": os.path.getsize(v),
            "format": fmt_format(v),
        })

    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read()
    # Inject JSON into the <script type="application/json"> placeholder.
    html = html.replace("__PREVIEW_DATA__", json.dumps(data))
    index_path = os.path.join(out_dir, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Report savings to stdout for the agent.
    print("Preview written to: " + index_path)
    o = data["original"]["bytes"]
    for v in data["variants"]:
        saved = (1 - v["bytes"] / o) * 100 if o else 0
        print("  {:<28} {:>10}  ({:+.1f}%)".format(
            v["label"][:28], _h(v["bytes"]), -saved))
    print("  {:<28} {:>10}".format("(original)", _h(o)))
    print("\nServe it with:  start-preview.sh --dir " + out_dir + " --open")


def _h(n):
    units = ["B", "KB", "MB", "GB"]
    f = float(n)
    i = 0
    while f >= 1024 and i < len(units) - 1:
        f /= 1024
        i += 1
    return ("{:.1f} {}".format(f, units[i])) if i else ("{} {}".format(int(f), units[i]))


if __name__ == "__main__":
    main()

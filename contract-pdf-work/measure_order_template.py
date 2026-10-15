#!/usr/bin/env python3
"""Measure the PDF template of the order contract for src/order-contract-pdf.js.

Run after the owner sends a new export of the template:

    python3 contract-pdf-work/measure_order_template.py \
        contract-pdf-work/templates/Umowa_Zamowienia_Pojazdu_AG_wzor.pdf

Prints, for page 1:
  - every checkbox with the text printed right of it (BOXES in the generator),
  - every text field with the label on its line: baseline, size, colour
    (CELLS: a value sits on the baseline of its label's last line),
  - the "……" placeholders with their x-range (INLINE, HEADER, FOOTER),
  - the shaded cell rectangles (cell bounds for wrapped lines).
Needs PyMuPDF (`pip install pymupdf`); not used at runtime.
"""
import sys

import fitz  # PyMuPDF


def spans_of(page):
    return [
        span
        for block in page.get_text("dict")["blocks"]
        for line in block.get("lines", [])
        for span in line["spans"]
        if span["text"].strip()
    ]


def main(path: str) -> None:
    doc = fitz.open(path)
    page = doc[0]
    spans = spans_of(page)
    print(f"{path}: {len(doc)} pages, page 1 height {page.rect.height:.2f}")

    print("\n== checkboxes")
    for widget in page.widgets():
        if widget.field_type_string != "CheckBox":
            continue
        r = widget.rect
        right = [s for s in spans if abs((s["bbox"][1] + s["bbox"][3]) / 2 - (r.y0 + r.y1) / 2) < 7 and s["bbox"][0] >= r.x1 - 1]
        label = min(right, key=lambda s: s["bbox"][0])["text"].strip()[:45] if right else "?"
        print(f"  {widget.field_name:7} x={r.x0:6.1f} y={r.y0:6.1f} value={widget.field_value!s:4} -> {label!r}")

    print("\n== text fields (label on the same line)")
    for widget in page.widgets():
        if widget.field_type_string != "Text":
            continue
        r = widget.rect
        left = [s for s in spans if s["bbox"][1] < r.y1 and s["bbox"][3] > r.y0 and s["bbox"][2] <= r.x0 + 2]
        label = max(left, key=lambda s: s["bbox"][2]) if left else None
        described = f"{label['text'].strip()[-32:]!r} base={label['origin'][1]:.2f} size={label['size']}" if label else "(no label on the line)"
        print(f"  {widget.field_name:17} x={r.x0:6.2f}-{r.x1:6.2f} y={r.y0:6.2f}-{r.y1:6.2f} DA={widget.text_fontsize} | {described}")

    print("\n== placeholders and their lines")
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                chars = span["chars"]
                text = "".join(c["c"] for c in chars)
                if "…" not in text:
                    continue
                print(f"  base={span['origin'][1]:.2f} size={span['size']} colour=#{span['color']:06x} {text[:70]!r}")
                runs, current = [], None
                for c in chars:
                    kind = "dots" if c["c"] == "…" else "text"
                    if current and current[0] == kind:
                        current[2] = c["bbox"][2]
                    else:
                        current = [kind, c["bbox"][0], c["bbox"][2]]
                        runs.append(current)
                for kind, x0, x1 in runs:
                    print(f"      {kind:4} x={x0:7.2f}-{x1:7.2f}")

    print("\n== shaded cells")
    seen = set()
    for drawing in page.get_drawings():
        r, fill = drawing["rect"], drawing.get("fill")
        key = (round(r.x0), round(r.y0), round(r.x1), round(r.y1))
        if fill and r.width > 30 and r.height > 8 and key not in seen:
            seen.add(key)
            colour = "#%02x%02x%02x" % tuple(int(v * 255) for v in fill)
            print(f"  {colour} x={r.x0:6.1f}-{r.x1:6.1f} y={r.y0:6.1f}-{r.y1:6.1f}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "contract-pdf-work/templates/Umowa_Zamowienia_Pojazdu_AG_wzor.pdf")

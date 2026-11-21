#!/usr/bin/env bash
# Raise Your Hands receipts (already covered with opaque boxes) → two WebP files, no metadata:
#   <output-base>-full.webp   width ≤ 1400 px (never enlarged), full height: the zoom viewer
#   <output-base>-thumb.webp  360 px wide; tall receipts cropped to the top (store logo) at 360×470
# Usage: scripts/ryh-fotos/encode-receipt.sh <covered-receipt.png> public/ryh/contas/<cidade>-<nn>
# Prints "w h" of the full file (for contas.json). Needs macOS `sips`, `cwebp` and Python with Pillow.
set -euo pipefail
src="$1"; out="$2"
mkdir -p "$(dirname "$out")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w, h}')

# Full: cap the width at 1400 px (receipts are 1300–1800 px wide originals)
full_w=$(( w > 1400 ? 1400 : w ))
sips -s format png --resampleWidth "$full_w" "$src" --out "$tmp/full.png" >/dev/null
cwebp -quiet -q 80 -m 6 -metadata none "$tmp/full.png" -o "$out-full.webp"

# Thumb: 360 px wide; portrait receipts keep only the top 470 px (logo + first lines)
# (sips -c crops around the centre, so the top crop is done with Python/PIL)
python3 -c '
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB")
im = im.resize((360, round(im.height * 360 / im.width)), Image.LANCZOS)
if im.height > 470: im = im.crop((0, 0, 360, 470))
im.save(sys.argv[2])
' "$src" "$tmp/thumb.png"
cwebp -quiet -q 80 -m 6 -metadata none "$tmp/thumb.png" -o "$out-thumb.webp"

node -e '
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const b = fs.readFileSync(f);
  for (let i = 12; i + 8 <= b.length; ) {
    const id = b.toString("latin1", i, i + 4), size = b.readUInt32LE(i + 4);
    if (id === "EXIF" || id === "XMP ") { console.error(f + ": metadata chunk " + id); process.exit(1); }
    i += 8 + size + (size & 1);
  }
}' "$out-full.webp" "$out-thumb.webp"
sips -g pixelWidth -g pixelHeight "$out-full.webp" | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w, h}'

#!/usr/bin/env bash
# Raise Your Hands photos → WebP 640 + 1280 (same format as the logbook photos).
# Usage: scripts/ryh-fotos/encode.sh <source-image> <output-base>
#   e.g. scripts/ryh-fotos/encode.sh ~/faturas/dia-2-a.jpg public/ryh/contas/dia-2/01
# Writes <output-base>-640.webp and <output-base>-1280.webp and prints "w h" of the 1280 file
# for contas.json. Re-encoding drops all metadata: cwebp writes no EXIF/XMP/ICC unless asked
# (-metadata defaults to "none"); the check at the end fails if any slipped through.
# Needs macOS `sips` and `cwebp` (brew install webp).
set -euo pipefail
src="$1"; out="$2"
mkdir -p "$(dirname "$out")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
for size in 640 1280; do
  # Longest side = size, JPEG intermediate, then WebP quality 82 without metadata
  sips -s format jpeg -Z "$size" "$src" --out "$tmp/$size.jpg" >/dev/null
  cwebp -quiet -q 82 -metadata none "$tmp/$size.jpg" -o "$out-$size.webp"
done
node -e '
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const b = fs.readFileSync(f);
  for (let i = 12; i + 8 <= b.length; ) {
    const id = b.toString("latin1", i, i + 4), size = b.readUInt32LE(i + 4);
    if (id === "EXIF" || id === "XMP ") { console.error(f + ": metadata chunk " + id); process.exit(1); }
    i += 8 + size + (size & 1);
  }
}' "$out-640.webp" "$out-1280.webp"
sips -g pixelWidth -g pixelHeight "$out-1280.webp" | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w, h}'

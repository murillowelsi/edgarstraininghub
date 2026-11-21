#!/usr/bin/env bash
# Raise Your Hands photos → WebP in two sizes (longest side), without metadata.
# Usage: [SIZES="1000 2000"] scripts/ryh-fotos/encode.sh <source-image> <output-base>
#   logbook photos (default): scripts/ryh-fotos/encode.sh foto.jpg public/ryh/diario/dia-2/01   → -640 / -1280
#   receipts:                 SIZES="1000 2000" scripts/ryh-fotos/encode.sh chaves-01.png public/ryh/contas/chaves-01
# Prints "w h" of the larger file (for contas.json). Re-encoding drops all metadata: cwebp writes no EXIF/XMP/ICC unless asked
# (-metadata defaults to "none"); the check at the end fails if any slipped through.
# Needs macOS `sips` and `cwebp` (brew install webp).
set -euo pipefail
src="$1"; out="$2"
read -r small large <<< "${SIZES:-640 1280}"
mkdir -p "$(dirname "$out")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
for size in "$small" "$large"; do
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
}' "$out-$small.webp" "$out-$large.webp"
sips -g pixelWidth -g pixelHeight "$out-$large.webp" | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w, h}'

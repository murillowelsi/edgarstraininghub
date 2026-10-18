import type { WorkoutSummary } from "@/types/timeline";
import type { SummaryStat } from "@/utils/workoutSummaryStats";
import { modalityGradient } from "@/utils/workoutSummaryStats";

export type PostAspect = "original" | "4:5" | "1:1";

const ASPECT_RATIO: Record<Exclude<PostAspect, "original">, number> = { "4:5": 4 / 5, "1:1": 1 };
const MAX_WIDTH = 1440;
const QUALITY = 0.85;

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type = "image/jpeg", quality = QUALITY): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), type, quality)
  );

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const FONT = `"Montserrat", "Inter", system-ui, -apple-system, sans-serif`;

export interface OverlayContent {
  summary: WorkoutSummary;
  stats: SummaryStat[];
  typeLabel: string;
}

/**
 * Strava-style stats band over the bottom of a photo: workout name, modality
 * and up to 4 headline numbers on a dark gradient.
 */
const drawStatsOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number, content: OverlayContent) => {
  const unit = w / 100;
  const bandHeight = Math.min(h * 0.42, unit * 46);
  const gradient = ctx.createLinearGradient(0, h - bandHeight, 0, h);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, h - bandHeight, w, bandHeight);

  const accent = (modalityGradient[content.summary.workoutType] ?? modalityGradient.strength).accent;
  const pad = unit * 5;
  const stats = content.stats.slice(0, 4);
  const colWidth = (w - pad * 2) / Math.max(1, stats.length);
  const valueY = h - pad - unit * 4.5;
  // Narrower columns need smaller numbers so "8.450 kg" doesn't touch its neighbour
  const valueSize = stats.length >= 4 ? 4.8 : stats.length === 3 ? 5.8 : 7;

  ctx.textBaseline = "alphabetic";
  stats.forEach((stat, i) => {
    const x = pad + colWidth * i;
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${unit * valueSize}px ${FONT}`;
    ctx.fillText(stat.value, x, valueY, colWidth - unit * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `600 ${unit * 2.9}px ${FONT}`;
    ctx.fillText(stat.label.toUpperCase(), x, valueY + unit * 4.3, colWidth - unit * 2);
  });

  // Workout name + modality above the numbers
  const nameY = valueY - unit * 10.5;
  ctx.fillStyle = accent;
  ctx.font = `700 ${unit * 3.2}px ${FONT}`;
  ctx.fillText(content.typeLabel.toUpperCase(), pad, nameY - unit * 5.2, w - pad * 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${unit * 5}px ${FONT}`;
  ctx.fillText(content.summary.workoutName, pad, nameY, w - pad * 2 - unit * 12);

  // EZ mark, top-right of the band
  ctx.fillStyle = "#e1b506";
  ctx.font = `900 ${unit * 5}px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("EZ", w - pad, nameY);
  ctx.textAlign = "left";
};

/**
 * Prepares a picked photo for the feed: optional centre crop (4:5 / 1:1),
 * downscale, and optional stats overlay baked in. Returns a JPEG blob.
 */
export const renderPostImage = async (
  objectUrl: string,
  options: { aspect: PostAspect; overlay?: OverlayContent }
): Promise<Blob> => {
  const img = await loadImage(objectUrl);
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (options.aspect !== "original") {
    const target = ASPECT_RATIO[options.aspect];
    if (sw / sh > target) {
      const newW = sh * target;
      sx = (sw - newW) / 2;
      sw = newW;
    } else {
      const newH = sw / target;
      sy = (sh - newH) / 2;
      sh = newH;
    }
  }

  const scale = Math.min(1, MAX_WIDTH / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  if (options.overlay) drawStatsOverlay(ctx, canvas.width, canvas.height, options.overlay);
  return canvasToBlob(canvas);
};

/** Uploads to Cloudinary with progress (XHR — fetch has no upload progress). */
export const uploadPostImage = (
  blob: Blob,
  onProgress?: (fraction: number) => void,
  folder = "timeline"
): Promise<string> =>
  new Promise((resolve, reject) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName) return reject(new Error("Cloudinary cloud name is not configured"));

    const formData = new FormData();
    formData.append("file", blob, "post.jpg");
    formData.append("upload_preset", uploadPreset || "ml_default");
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).secure_url);
        } catch {
          reject(new Error("Invalid Cloudinary response"));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });

export interface StoryContent extends OverlayContent {
  highlightsTitle: string;
  footer: string;
  authorName: string;
  photoUrl?: string;
}

/**
 * 1080×1920 image for Instagram Stories: photo (or modality gradient) in the
 * background, big numbers, the session's highlights and the EZ brand.
 */
export const renderStoryImage = async (content: StoryContent): Promise<Blob> => {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const palette = modalityGradient[content.summary.workoutType] ?? modalityGradient.strength;

  // Background: cover-fit photo, else a modality gradient
  let hasPhoto = false;
  if (content.photoUrl) {
    try {
      const img = await loadImage(content.photoUrl);
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      hasPhoto = true;
    } catch {
      // CORS or network — fall back to the gradient
    }
  }
  if (!hasPhoto) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b0f1a");
    bg.addColorStop(0.55, palette.from);
    bg.addColorStop(1, palette.to);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0.55)");
  shade.addColorStop(0.4, "rgba(0,0,0,0.15)");
  shade.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  const pad = 88;
  ctx.textBaseline = "alphabetic";

  // Brand
  ctx.fillStyle = "#e1b506";
  ctx.font = `900 96px ${FONT}`;
  ctx.fillText("EZ", pad, 230);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(content.authorName, pad, 290, W - pad * 2);

  // Workout title
  let y = H - 980;
  ctx.fillStyle = palette.accent;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(content.typeLabel.toUpperCase(), pad, y);
  y += 84;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 72px ${FONT}`;
  ctx.fillText(content.summary.workoutName, pad, y, W - pad * 2);

  // Stats grid (2 columns)
  y += 70;
  const colW = (W - pad * 2 - 32) / 2;
  content.stats.slice(0, 4).forEach((stat, i) => {
    const x = pad + (i % 2) * (colW + 32);
    const top = y + Math.floor(i / 2) * 200;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, x, top, colW, 172, 36);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(stat.label.toUpperCase(), x + 40, top + 62, colW - 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText(stat.value, x + 40, top + 136, colW - 80);
  });
  y += Math.ceil(Math.min(4, content.stats.length) / 2) * 200 + 30;

  // Highlights (strength)
  const highlights = content.summary.highlights?.slice(0, 3) ?? [];
  if (highlights.length) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(content.highlightsTitle.toUpperCase(), pad, y);
    y += 56;
    highlights.forEach((h) => {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText(`${h.pr ? "🏆 " : ""}${h.name}`, pad, y, W - pad * 2 - 300);
      ctx.textAlign = "right";
      ctx.font = `800 40px ${FONT}`;
      ctx.fillText(h.value, W - pad, y);
      ctx.textAlign = "left";
      y += 62;
    });
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 32px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(content.footer, W / 2, H - 110);
  ctx.textAlign = "left";

  return canvasToBlob(canvas, "image/png");
};

/** Opens the native share sheet with the image (Instagram is there on phones), else downloads it. */
export const shareOrDownloadImage = async (blob: Blob, fileName: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> => {
  const file = new File([blob], fileName, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
};

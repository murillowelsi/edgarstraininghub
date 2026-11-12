import type { WorkoutSummary } from "@/types/timeline";
import type { SummaryStat } from "@/utils/workoutSummaryStats";
import { formatDuration, workoutCardModel } from "@/utils/workoutSummaryStats";
import { vizModel } from "@/components/timeline/workout-viz/vizModel";

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

  const accent = sportFill(content.summary.workoutType);
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

export type ShareImageFormat = "story" | "post";

export interface StoryContent extends OverlayContent {
  highlightsTitle: string;
  footer: string;
  authorName: string;
  photoUrl?: string;
  /** "story" = 1080×1920 (Stories 9:16), "post" = 1080×1350 (feed 4:5) */
  format?: ShareImageFormat;
  /** Labels and locale for the card numbers (same as the feed card) */
  labels: Parameters<typeof workoutCardModel>[1];
  locale: string;
  badges: { pr: string; records: string; rpe?: string; percentDone?: string };
  viz: { reps: string; best: string; stages: string; lanes: string; sets: string; setsDone: string };
}

/** Sport colour from the --sport-* token, as a canvas colour. */
const sportFill = (type: string, alpha = 1) => {
  const key = type === "running" ? "run" : type === "cycling" ? "bike" : type === "swimming" ? "swim" : type === "strength" ? "strength" : "other";
  const raw = typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(`--sport-${key}`).trim() : "";
  const [h, sat, l] = (raw || "215 16% 47%").split(/\s+/);
  return `hsla(${h}, ${sat}, ${l}, ${alpha})`;
};

const CARD_BG = "#131415"; // dark --workout-card
const YELLOW = "#e1b506";
const NAVY_TEXT = "#161718";

const pill = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, opts: { fill: string; color: string }) => {
  ctx.font = `800 30px ${FONT}`;
  const w = ctx.measureText(text).width + 44;
  ctx.fillStyle = opts.fill;
  roundRect(ctx, x - w, y - 40, w, 54, 27);
  ctx.fill();
  ctx.fillStyle = opts.color;
  ctx.fillText(text, x - w + 22, y - 3);
  return w;
};

/**
 * Shareable workout image in the same layout as the feed card (FD-8):
 * sport + badges, workout name, hero number, up to 3 numbers, the mini chart,
 * highlights and the EZ mark. Photo (with the card on a dark panel) or the
 * dark card surface with the sport glow.
 */
export const renderStoryImage = async (content: StoryContent): Promise<Blob> => {
  const W = 1080;
  const post = content.format === "post";
  const H = post ? 1350 : 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  try {
    await document.fonts?.load(`800 100px Montserrat`);
  } catch {
    // fall back to the system font
  }

  const { summary } = content;
  const type = summary.workoutType;
  const model = workoutCardModel(summary, content.labels, content.locale);
  const viz = vizModel(summary);
  const pad = 80;

  // Background
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
      // CORS or network: card background instead
    }
  }
  if (!hasPhoto) {
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W, 0, 0, W, 0, W * 1.1);
    glow.addColorStop(0, sportFill(type, 0.34));
    glow.addColorStop(0.55, sportFill(type, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  } else {
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0.45)");
    shade.addColorStop(0.35, "rgba(0,0,0,0.05)");
    shade.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.textBaseline = "alphabetic";

  // Header: brand + author
  ctx.fillStyle = YELLOW;
  ctx.font = `900 88px ${FONT}`;
  ctx.fillText("EZ", pad, post ? 150 : 210);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(content.authorName, pad, post ? 205 : 265, W - pad * 2);

  // Card block height (measured first so it can sit at the bottom)
  const secRows = model.secondary.length ? 1 : 0;
  const highlights = summary.highlights?.slice(0, post ? 2 : 3) ?? [];
  const blockH =
    60 + 96 + (model.hero ? (post ? 250 : 290) : 0) + secRows * 190 + (viz ? 150 : 0) + highlights.length * 62 + 60;
  const bottom = H - (post ? 110 : 170);
  let y = Math.max(post ? 260 : 340, bottom - blockH);

  if (hasPhoto) {
    ctx.fillStyle = "rgba(19,20,21,0.82)";
    roundRect(ctx, pad - 40, y - 30, W - (pad - 40) * 2, bottom - y + 40, 48);
    ctx.fill();
    ctx.strokeStyle = sportFill(type, 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Sport + badges
  ctx.fillStyle = sportFill(type);
  ctx.font = `800 34px ${FONT}`;
  y += 34;
  ctx.fillText(content.typeLabel.toUpperCase(), pad, y);
  let right = W - pad;
  if (content.badges.rpe) right -= pill(ctx, right, y, content.badges.rpe, { fill: "rgba(255,255,255,0.12)", color: "#fff" }) + 14;
  if (content.badges.percentDone) right -= pill(ctx, right, y, content.badges.percentDone, { fill: "rgba(255,255,255,0.12)", color: "#fff" }) + 14;
  if (summary.records) pill(ctx, right, y, summary.records > 1 ? `${summary.records} ${content.badges.records}` : content.badges.pr, { fill: YELLOW, color: NAVY_TEXT });

  // Name
  y += 96;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 60px ${FONT}`;
  ctx.fillText(summary.workoutName, pad, y, W - pad * 2);

  // Hero number
  if (model.hero) {
    y += post ? 190 : 220;
    ctx.font = `800 ${post ? 180 : 210}px Montserrat, ${FONT}`;
    ctx.fillText(model.hero.value, pad, y);
    const hw = ctx.measureText(model.hero.value).width;
    if (model.hero.unit) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = `700 64px ${FONT}`;
      ctx.fillText(model.hero.unit, pad + hw + 18, y);
    }
    y += 60;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(model.hero.label.toUpperCase(), pad, y);
  }

  // Secondary numbers
  if (model.secondary.length) {
    y += 40;
    const n = model.secondary.length;
    const gap = 24;
    const bw = (W - pad * 2 - gap * (n - 1)) / n;
    model.secondary.forEach((m, i) => {
      const x = pad + i * (bw + gap);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      roundRect(ctx, x, y, bw, 150, 32);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(m.label.toUpperCase(), x + 30, y + 50, bw - 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 56px ${FONT}`;
      const text = m.value;
      ctx.fillText(text, x + 30, y + 118, bw - 60);
      if (m.unit) {
        const tw = Math.min(ctx.measureText(text).width, bw - 60);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `700 28px ${FONT}`;
        ctx.fillText(m.unit, x + 30 + tw + 8, y + 118, Math.max(0, bw - 60 - tw - 8));
      }
    });
    y += 150;
  }

  // Mini chart (same model as the card)
  if (viz) {
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `700 26px ${FONT}`;
    const vw = W - pad * 2;
    if (viz.kind === "reps") {
      const best = formatDuration(viz.best);
      ctx.fillText(content.viz.reps.toUpperCase(), pad, y);
      ctx.textAlign = "right";
      ctx.fillText(content.viz.best.replace("{{t}}", best), W - pad, y);
      ctx.textAlign = "left";
      const gap = 10;
      const bw = (vw - gap * (viz.values.length - 1)) / viz.values.length;
      viz.values.forEach((v, i) => {
        const h = Math.max(0.3, viz.best / v) * 90;
        ctx.fillStyle = v === viz.best ? sportFill(type) : sportFill(type, 0.35);
        roundRect(ctx, pad + i * (bw + gap), y + 110 - h, bw, h, 8);
        ctx.fill();
      });
    } else if (viz.kind === "sets") {
      ctx.fillText(content.viz.sets.toUpperCase(), pad, y);
      ctx.textAlign = "right";
      ctx.fillText(content.viz.setsDone.replace("{{done}}", String(viz.done)).replace("{{total}}", String(viz.total)), W - pad, y);
      ctx.textAlign = "left";
      const gap = 8;
      const bw = (vw - gap * (viz.total - 1)) / viz.total;
      for (let i = 0; i < viz.total; i++) {
        ctx.fillStyle = i < viz.done ? sportFill(type) : "rgba(255,255,255,0.12)";
        roundRect(ctx, pad + i * (bw + gap), y + 30, bw, 26, 7);
        ctx.fill();
      }
    } else if (viz.kind === "lanes") {
      ctx.fillText(content.viz.lanes.toUpperCase(), pad, y);
      const cols = Math.min(viz.blocks.length, 10);
      const gap = 8;
      const bw = (vw - gap * (cols - 1)) / cols;
      viz.blocks.forEach((b, i) => {
        const x = pad + (i % cols) * (bw + gap);
        const top = y + 30 + Math.floor(i / cols) * 64;
        ctx.fillStyle = b === "main" ? sportFill(type) : b === "drill" ? sportFill(type, 0.55) : sportFill(type, 0.3);
        roundRect(ctx, x, top, bw, 52, 10);
        ctx.fill();
      });
    } else {
      ctx.fillText(content.viz.stages.toUpperCase(), pad, y);
      const total = viz.segments.reduce((a, b) => a + b.seconds, 0);
      let x = pad;
      viz.segments.forEach((seg, i) => {
        const w = (seg.seconds / total) * vw - 6;
        ctx.fillStyle = sportFill(type, i % 2 ? 0.45 : 0.9);
        roundRect(ctx, x, y + 30, Math.max(8, w), 30, 15);
        ctx.fill();
        x += w + 6;
      });
    }
    y += 110;
  }

  // Highlights (strength)
  if (highlights.length) {
    y += 30;
    highlights.forEach((h) => {
      y += 62;
      let x = pad;
      if (h.pr) {
        // "PR" tag before the exercise name (pill() draws right-aligned at its x)
        const tagRight = pad + 96;
        pill(ctx, tagRight, y + 4, "PR", { fill: YELLOW, color: NAVY_TEXT });
        x = tagRight + 18;
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 40px ${FONT}`;
      ctx.fillText(h.name, x, y, W - pad - x - 280);
      ctx.textAlign = "right";
      ctx.font = `800 40px ${FONT}`;
      ctx.fillText(h.value, W - pad, y);
      ctx.textAlign = "left";
    });
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(content.footer, W / 2, H - (post ? 50 : 90));
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

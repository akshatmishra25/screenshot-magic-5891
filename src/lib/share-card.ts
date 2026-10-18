import type { Album } from "@/lib/albums";
import type { TierId } from "@/lib/tiers";
import { tierById } from "@/lib/tiers";

const W = 1080;
const H = 1080;

export type ShareCardData = {
  album: Album;
  tier: TierId;
  body: string | null;
  profile: { display_name: string | null; username: string; avatar_url: string | null };
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/** Resolve a Tailwind tier text class to a concrete CSS color for canvas drawing. */
function tierColor(tier: TierId): string {
  const probe = document.createElement("span");
  probe.className = tierById(tier).text;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || "#1DB954";
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    const last = lines[maxLines - 1];
    if (last) lines[maxLines - 1] = `${last.replace(/[\s,.;:]+$/, "")}…`;
  }
  return lines;
}

function drawCenteredLines(ctx: CanvasRenderingContext2D, lines: string[], centerX: number, startY: number, lineHeight: number) {
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, centerX, startY + i * lineHeight));
}

/** Renders the 1080x1080 share card. Returns null if the card cannot be drawn. */
export async function renderShareCard(data: ShareCardData): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }

  const [hueA, hueB] = data.album.hues;
  const accent = tierColor(data.tier);
  const tier = tierById(data.tier);

  // Background: dark base with a soft wash derived from the album hues
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, `oklch(0.22 0.06 ${hueA})`);
  bg.addColorStop(1, `oklch(0.14 0.04 ${hueB})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 140, 0, W / 2, 140, 700);
  glow.addColorStop(0, `oklch(0.7 0.15 ${hueA} / 0.35)`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Album cover (falls back to a gradient placeholder if the artwork can't load)
  const coverSize = 520;
  const coverX = (W - coverSize) / 2;
  const coverY = 110;
  const coverImg = data.album.coverUrl ? await loadImage(data.album.coverUrl) : null;
  if (coverImg) {
    ctx.save();
    roundRectPath(ctx, coverX, coverY, coverSize, coverSize, 40);
    ctx.clip();
    const scale = Math.max(coverSize / coverImg.naturalWidth, coverSize / coverImg.naturalHeight);
    const w = coverImg.naturalWidth * scale;
    const h = coverImg.naturalHeight * scale;
    ctx.drawImage(coverImg, coverX + (coverSize - w) / 2, coverY + (coverSize - h) / 2, w, h);
    ctx.restore();
  } else {
    const ph = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
    ph.addColorStop(0, `oklch(0.55 0.18 ${hueA})`);
    ph.addColorStop(1, `oklch(0.25 0.12 ${hueB})`);
    ctx.fillStyle = ph;
    ctx.save();
    roundRectPath(ctx, coverX, coverY, coverSize, coverSize, 40);
    ctx.fill();
    ctx.restore();
  }

  let y = coverY + coverSize + 78;

  // Tier chip
  ctx.font = "800 30px Manrope, sans-serif";
  const chipLabel = `${tier.emoji}  ${tier.name.toUpperCase()}`;
  // Emoji and bold fallback fonts render wider than measureText reports, so pad generously
  const chipW = Math.max(ctx.measureText(chipLabel).width * 1.08, 200) + 96;
  const chipH = 58;
  ctx.fillStyle = accent;
  ctx.save();
  roundRectPath(ctx, (W - chipW) / 2, y - 40, chipW, chipH, chipH / 2);
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.textBaseline = "middle";
  ctx.fillText(chipLabel, W / 2, y - 40 + chipH / 2 + 1);
  ctx.textBaseline = "alphabetic";

  y += 66;

  // Album title + artist
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "800 62px Manrope, sans-serif";
  drawCenteredLines(ctx, wrapText(ctx, data.album.title, W - 160, 1), W / 2, y, 68);
  y += 58;
  ctx.fillStyle = "rgba(245,245,245,0.6)";
  ctx.font = "500 36px Manrope, sans-serif";
  ctx.fillText(`${data.album.artist} · ${data.album.year}`, W / 2, y);

  y += 66;

  // Review quote
  if (data.body) {
    ctx.fillStyle = "rgba(245,245,245,0.85)";
    ctx.font = "italic 500 40px Manrope, sans-serif";
    const quoteLines = wrapText(ctx, `“${data.body}”`, W - 220, 2);
    drawCenteredLines(ctx, quoteLines, W / 2, y, 52);
    y += quoteLines.length * 52 + 8;
  }

  // Footer: reviewer + branding
  const footY = H - 96;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, footY - 58);
  ctx.lineTo(W - 96, footY - 58);
  ctx.stroke();

  const name = data.profile.display_name || data.profile.username;
  ctx.textAlign = "left";
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "700 34px Manrope, sans-serif";
  ctx.fillText(name, 96, footY);
  ctx.fillStyle = "rgba(245,245,245,0.55)";
  ctx.font = "500 28px Manrope, sans-serif";
  ctx.fillText(`@${data.profile.username}`, 96, footY + 40);

  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.font = "800 34px Manrope, sans-serif";
  ctx.fillText("LYNIV", W - 96, footY + 14);
  ctx.fillStyle = "rgba(245,245,245,0.5)";
  ctx.font = "500 24px Manrope, sans-serif";
  ctx.fillText("Rate the vibe, not the stars", W - 96, footY + 48);

  return canvas;
}

export async function shareCardToBlob(data: ShareCardData): Promise<Blob | null> {
  const canvas = await renderShareCard(data);
  if (!canvas) return null;
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildShareCaption(data: ShareCardData): string {
  const tier = tierById(data.tier);
  return `${tier.emoji} ${tier.name}: ${data.album.title} — ${data.album.artist}. Rate the vibe, not the stars. Lyniv`;
}

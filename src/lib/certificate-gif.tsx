import "server-only";
import sharp from "sharp";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { renderCertificateImage, type CertificateImageInput } from "@/lib/certificate-image";

const FRAME_COUNT = 26;
const FRAME_DELAY_MS = 65;
const CONFETTI_COUNT = 150;

// Zeni brand colors, plus a couple of near-white sparkle pieces for contrast
// against the dark header band.
const CONFETTI_COLORS: [number, number, number][] = [
  [151, 195, 185], // jade
  [54, 97, 112], // sapphire
  [238, 186, 125], // gold
  [173, 88, 74], // ruby
  [201, 171, 199], // opal
  [250, 250, 250], // pearl
];

type ConfettiPiece = {
  x: number;
  startY: number;
  fallSpeed: number;
  size: number;
  color: [number, number, number];
  swayAmplitude: number;
  swayFrequency: number;
  swayPhase: number;
  shape: "rect" | "circle";
};

function makeConfetti(width: number, height: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    pieces.push({
      x: Math.random() * width,
      // Staggered start above the frame so pieces don't all fall in lockstep —
      // kept fairly tight so a good number are always on-screen at once.
      startY: -Math.random() * height * 0.45 - 12,
      fallSpeed: ((height * 1.35) / FRAME_COUNT) * (0.7 + Math.random() * 0.6),
      size: 5 + Math.random() * 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      swayAmplitude: 10 + Math.random() * 18,
      swayFrequency: 0.15 + Math.random() * 0.15,
      swayPhase: Math.random() * Math.PI * 2,
      shape: Math.random() < 0.5 ? "rect" : "circle",
    });
  }
  return pieces;
}

/** Draws one confetti piece directly into a raw RGBA pixel buffer at the
 *  given animation frame. No canvas/rotation — small squares/circles read
 *  fine as confetti at this scale and keep this dependency-free. */
function drawPiece(
  buffer: Buffer,
  width: number,
  height: number,
  piece: ConfettiPiece,
  frame: number
) {
  const y = piece.startY + piece.fallSpeed * frame;
  if (y < -piece.size || y > height + piece.size) return;
  const x = piece.x + Math.sin(frame * piece.swayFrequency + piece.swayPhase) * piece.swayAmplitude;

  const half = piece.size / 2;
  const [r, g, b] = piece.color;

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      if (piece.shape === "circle" && dx * dx + dy * dy > half * half) continue;
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const idx = (py * width + px) * 4;
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = 255;
    }
  }
}

/** Renders the certificate once, then composites falling confetti over it
 *  frame by frame and encodes the sequence as an animated GIF. */
export async function renderCertificateCelebrationGif(input: CertificateImageInput): Promise<Buffer> {
  const basePng = await renderCertificateImage(input);
  const { data, info } = await sharp(basePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;

  const pieces = makeConfetti(width, height);
  const gif = GIFEncoder();

  let palette: number[][] | null = null;

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const frameBuffer = Buffer.from(data);
    for (const piece of pieces) {
      drawPiece(frameBuffer, width, height, piece, frame);
    }

    if (!palette) {
      palette = quantize(frameBuffer, 200);
    }
    const index = applyPalette(frameBuffer, palette);

    gif.writeFrame(index, width, height, {
      palette: frame === 0 ? palette : undefined,
      delay: FRAME_DELAY_MS,
      repeat: frame === 0 ? 0 : undefined,
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

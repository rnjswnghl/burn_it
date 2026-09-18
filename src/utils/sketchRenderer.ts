/**
 * Hand-drawn Pencil & Charcoal Sketch Rendering Engine
 * Recreates authentic graphite strokes, paper tooth textures,
 * charred burning paper edges, and dynamic charcoal sketch flames.
 */
import { BurnTool } from '../types';

// Procedural paper grain pattern cache
let paperPatternCanvas: HTMLCanvasElement | null = null;

export function getPaperPattern(): HTMLCanvasElement {
  if (paperPatternCanvas) return paperPatternCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Base warm sketch paper tone (antique sketchbook cream-white)
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle paper fibers and tooth noise
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    // Add warm grain variation
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.95));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.85));
  }
  ctx.putImageData(imgData, 0, 0);

  // Fine graphite specks
  ctx.fillStyle = 'rgba(40, 35, 30, 0.04)';
  for (let j = 0; j < 300; j++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    const rw = Math.random() * 2 + 0.5;
    ctx.fillRect(rx, ry, rw, rw);
  }

  paperPatternCanvas = canvas;
  return canvas;
}

/**
 * Draws a jittered, multi-pass pencil sketch line mimicking real 2B/4B graphite.
 */
export function drawPencilLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    color?: string;
    width?: number;
    roughness?: number;
    passes?: number;
  } = {}
) {
  const {
    color = '#1c1917',
    width = 1.6,
    roughness = 1.2,
    passes = 2,
  } = options;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.floor(dist / 14));

  for (let p = 0; p < passes; p++) {
    ctx.lineWidth = width * (0.8 + Math.random() * 0.4);
    ctx.globalAlpha = 0.55 + Math.random() * 0.35;

    ctx.beginPath();
    ctx.moveTo(
      x1 + (Math.random() - 0.5) * roughness,
      y1 + (Math.random() - 0.5) * roughness
    );

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = x1 + dx * t + (Math.random() - 0.5) * roughness * 1.5;
      const ny = y1 + dy * t + (Math.random() - 0.5) * roughness * 1.5;
      ctx.lineTo(nx, ny);
    }

    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a hand-sketched box with optional pencil crosshatch shading.
 */
export function drawPencilRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    strokeColor?: string;
    fillColor?: string;
    lineWidth?: number;
    hatch?: 'none' | 'single' | 'cross' | 'burnt_dense';
    hatchDensity?: number;
  } = {}
) {
  const {
    strokeColor = '#1c1917',
    fillColor,
    lineWidth = 1.8,
    hatch = 'none',
    hatchDensity = 8,
  } = options;

  ctx.save();

  // Solid wash if requested
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
  }

  // Crosshatch shading (pencil hatch lines)
  if (hatch !== 'none') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = 0.45;

    const step = hatchDensity;
    // Primary diagonal hatch ///
    for (let d = -h; d < w + h; d += step) {
      drawPencilLine(ctx, x + d, y, x + d + h, y + h, {
        color: strokeColor,
        width: 1.0,
        roughness: 0.8,
        passes: 1,
      });
    }

    // Secondary crosshatch \\\
    if (hatch === 'cross' || hatch === 'burnt_dense') {
      ctx.globalAlpha = hatch === 'burnt_dense' ? 0.65 : 0.35;
      for (let d = -w; d < w + h; d += step) {
        drawPencilLine(ctx, x + d, y + h, x + d + h, y, {
          color: strokeColor,
          width: 1.0,
          roughness: 0.8,
          passes: 1,
        });
      }
    }

    ctx.restore();
  }

  // 4 hand-drawn borders
  drawPencilLine(ctx, x, y, x + w, y, { color: strokeColor, width: lineWidth });
  drawPencilLine(ctx, x + w, y, x + w, y + h, { color: strokeColor, width: lineWidth });
  drawPencilLine(ctx, x + w, y + h, x, y + h, { color: strokeColor, width: lineWidth });
  drawPencilLine(ctx, x, y + h, x, y, { color: strokeColor, width: lineWidth });

  ctx.restore();
}

/**
 * Draws a hand-sketched circle/ellipse with overlapping graphite loops.
 */
export function drawPencilCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  options: {
    color?: string;
    fillColor?: string;
    width?: number;
    loops?: number;
  } = {}
) {
  const { color = '#1c1917', fillColor, width = 1.8, loops = 2 } = options;

  ctx.save();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  for (let l = 0; l < loops; l++) {
    ctx.globalAlpha = 0.6 + Math.random() * 0.3;
    ctx.beginPath();
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const jitterR = r + (Math.random() - 0.5) * 2;
      const px = cx + Math.cos(angle) * jitterR;
      const py = cy + Math.sin(angle) * jitterR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Generates an organic, fibrous polygon contour for burnt paper holes (Images 2, 3, 4).
 * Uses multi-harmonic noise and thermal convection bias.
 */
export function getOrganicHolePoints(
  cx: number,
  cy: number,
  radius: number,
  seed: number = 0,
  steps: number = 48
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Multi-harmonic noise for realistic fibrous ragged paper tearing/burning
    const n1 = Math.sin(angle * 3 + seed * 1.7) * 0.2;
    const n2 = Math.cos(angle * 7 + seed * 3.1) * 0.14;
    const n3 = Math.sin(angle * 13 + seed * 0.8) * 0.08;
    const n4 = Math.cos(angle * 23 + seed * 2.5) * 0.05;
    // Upward convection bias (fire burns upward slightly faster)
    const upBias = -Math.sin(angle) * 0.14;
    const r = Math.max(4, radius * (1 + n1 + n2 + n3 + n4 + upBias));
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }
  return points;
}

/**
 * Draws a realistic, radiant Fire Flame combining incandescent fire light
 * with expressive charcoal and graphite brush strokes (as in user reference Image 1).
 */
export function drawSketchFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 44,
  time: number = 0,
  options: {
    flicker?: boolean;
    showBurntBase?: boolean;
    colorMode?: 'charcoal' | 'charcoal_with_ember_glow';
    intensity?: number;
    toolType?: BurnTool;
  } = {}
) {
  const {
    flicker = true,
    showBurntBase = true,
    colorMode = 'charcoal_with_ember_glow',
    intensity = 1.0,
    toolType = 'match',
  } = options;

  ctx.save();
  ctx.translate(x, y);

  const t = time * 0.005;
  // Dynamic natural turbulence
  const fScale = flicker
    ? 1 + Math.sin(t * 5 + x * 0.1) * 0.1 + Math.cos(t * 9 + y * 0.1) * 0.06
    : 1;

  // ----------------------------------------------------
  // DEDICATED EMBER (잉걸불 인두) RENDERING
  // Compact, incandescent smoldering coal tip, no tall roaring tongue
  // ----------------------------------------------------
  if (toolType === 'ember') {
    const emberRadius = Math.max(5, Math.min(14, size * 0.35 * fScale * intensity));

    // Ambient heat halo
    const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, emberRadius * 3.6);
    glowGrad.addColorStop(0, 'rgba(255, 69, 0, 0.85)');
    glowGrad.addColorStop(0.35, 'rgba(220, 38, 38, 0.4)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, emberRadius * 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Hot incandescent core
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, emberRadius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.22, '#fef08a');
    coreGrad.addColorStop(0.55, '#f97316');
    coreGrad.addColorStop(0.85, '#dc2626');
    coreGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, emberRadius, 0, Math.PI * 2);
    ctx.fill();

    // Micro sparks
    for (let i = 0; i < 2; i++) {
      const spY = -((time * 0.06 + i * 10) % 18) - 3;
      const spX = Math.sin(t * 7 + i * 2) * 4;
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.arc(spX, spY, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  const h = size * fScale * intensity * (toolType === 'torch' ? 1.35 : toolType === 'lighter' ? 1.05 : 1.0);
  const w = size * 0.52 * fScale * intensity * (toolType === 'torch' ? 1.4 : toolType === 'lighter' ? 0.85 : 1.0);

  // 1. Radiant Ambient Heat Glow (Illuminates the paper and surroundings with real fire light)
  ctx.save();
  const glowRadius = Math.min(300, h * (1.2 + Math.min(0.6, intensity * 0.25)));
  const glowGrad = ctx.createRadialGradient(0, -h * 0.3, 4, 0, -h * 0.35, glowRadius);
  glowGrad.addColorStop(0, toolType === 'lighter' ? 'rgba(186, 230, 253, 0.65)' : 'rgba(254, 240, 138, 0.55)');
  glowGrad.addColorStop(0.28, 'rgba(249, 115, 22, 0.38)');
  glowGrad.addColorStop(0.65, 'rgba(220, 38, 38, 0.16)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, -h * 0.35, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Burnt Paper Charred Base Oval
  if (showBurntBase) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 16, 12, 0.92)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.78, w * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fine charcoal hatch marks at root
    ctx.strokeStyle = '#0a0908';
    ctx.lineWidth = 1.5;
    for (let i = -w * 0.65; i <= w * 0.65; i += 3.5) {
      const jx = i + (Math.random() - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(jx - 4, (Math.random() - 0.5) * 3);
      ctx.lineTo(jx + 4, (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Incandescent Fire Body (Inner Flame Licking Upward)
  // Renders warm, glowing fire tongues beneath the charcoal strokes
  ctx.save();
  const flameBodyGrad = ctx.createLinearGradient(0, 0, 0, -h);
  flameBodyGrad.addColorStop(0, 'rgba(255, 255, 245, 0.98)'); // Solar-white hot base
  flameBodyGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.92)'); // Bright yellow
  flameBodyGrad.addColorStop(0.55, 'rgba(251, 146, 60, 0.85)'); // Fiery orange
  flameBodyGrad.addColorStop(0.82, 'rgba(225, 29, 72, 0.6)');   // Crimson ember
  flameBodyGrad.addColorStop(1, 'rgba(159, 18, 57, 0.15)');     // Smoke tip
  ctx.fillStyle = flameBodyGrad;

  ctx.beginPath();
  ctx.moveTo(-w * 0.42, 0);
  // Left curve with natural convection turbulence
  ctx.bezierCurveTo(
    -w * 0.68 + Math.sin(t * 3) * 5,
    -h * 0.35,
    -w * 0.38 + Math.cos(t * 4) * 5,
    -h * 0.72,
    Math.sin(t * 4) * 7,
    -h * 0.97
  );
  // Right curve
  ctx.bezierCurveTo(
    w * 0.38 + Math.sin(t * 3.5) * 5,
    -h * 0.72,
    w * 0.68 + Math.cos(t * 3) * 5,
    -h * 0.35,
    w * 0.42,
    0
  );
  ctx.closePath();
  ctx.fill();

  // White-hot core highlight (brilliant 1000°C fire center)
  const coreGrad = ctx.createLinearGradient(0, 0, 0, -h * 0.55);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  coreGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.85)');
  coreGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.ellipse(
    Math.sin(t * 2.8) * 2.5,
    -h * 0.24,
    w * 0.24,
    h * 0.26,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // 4. Charcoal Flame Tendrils & Feathers (Authentic Image 1 Graphite/Charcoal Style)
  const tendrils = [
    // Tall central tongue
    {
      bx: -w * 0.12,
      by: 0,
      c1x: -w * 0.3 + Math.sin(t * 3.2) * 5,
      c1y: -h * 0.42,
      c2x: w * 0.15 + Math.cos(t * 3.8) * 4,
      c2y: -h * 0.78,
      tx: Math.sin(t * 4) * 6,
      ty: -h,
      width: 4.8,
    },
    // Left inner sweeping tongue
    {
      bx: -w * 0.35,
      by: 0,
      c1x: -w * 0.58 + Math.sin(t * 2.8) * 4,
      c1y: -h * 0.38,
      c2x: -w * 0.42,
      c2y: -h * 0.68,
      tx: -w * 0.18 + Math.cos(t * 3) * 3,
      ty: -h * 0.86,
      width: 4.0,
    },
    // Right inner sweeping tongue
    {
      bx: w * 0.26,
      by: 0,
      c1x: w * 0.5 + Math.cos(t * 2.9) * 4,
      c1y: -h * 0.36,
      c2x: w * 0.34,
      c2y: -h * 0.7,
      tx: w * 0.16 + Math.sin(t * 3.4) * 3,
      ty: -h * 0.88,
      width: 3.8,
    },
    // Left outer curved tendril (sweeping outward and curling up)
    {
      bx: -w * 0.58,
      by: 0,
      c1x: -w * 0.85 + Math.sin(t * 2.2) * 3,
      c1y: -h * 0.28,
      c2x: -w * 0.8,
      c2y: -h * 0.52,
      tx: -w * 0.48,
      ty: -h * 0.68,
      width: 3.0,
    },
    // Right outer curved tendril
    {
      bx: w * 0.52,
      by: 0,
      c1x: w * 0.82 + Math.cos(t * 2.3) * 3,
      c1y: -h * 0.28,
      c2x: w * 0.75,
      c2y: -h * 0.55,
      tx: w * 0.44,
      ty: -h * 0.65,
      width: 3.0,
    },
    // Low outer feather wisps
    {
      bx: -w * 0.7,
      by: 0,
      c1x: -w * 0.9,
      c1y: -h * 0.18,
      c2x: -w * 0.75,
      c2y: -h * 0.32,
      tx: -w * 0.58,
      ty: -h * 0.4,
      width: 2.2,
    },
    {
      bx: w * 0.65,
      by: 0,
      c1x: w * 0.9,
      c1y: -h * 0.18,
      c2x: w * 0.76,
      c2y: -h * 0.34,
      tx: w * 0.55,
      ty: -h * 0.42,
      width: 2.2,
    },
    // Extra roaring wisps when fire is intense (holding down or large flame)
    ...(intensity > 1.1
      ? [
          {
            bx: -w * 0.25,
            by: 0,
            c1x: -w * 0.4 + Math.sin(t * 4.5) * 6,
            c1y: -h * 0.5,
            c2x: -w * 0.1,
            c2y: -h * 0.85,
            tx: -w * 0.05 + Math.sin(t * 5) * 4,
            ty: -h * 1.08,
            width: 3.5,
          },
          {
            bx: w * 0.2,
            by: 0,
            c1x: w * 0.42 + Math.cos(t * 4.2) * 6,
            c1y: -h * 0.5,
            c2x: w * 0.15,
            c2y: -h * 0.85,
            tx: w * 0.08 + Math.cos(t * 5) * 4,
            ty: -h * 1.05,
            width: 3.5,
          },
        ]
      : []),
  ];

  tendrils.forEach(tr => {
    const strokeCount = Math.max(3, Math.floor(tr.width * 2));
    for (let s = 0; s < strokeCount; s++) {
      const offset = (s - strokeCount / 2) * 1.3;
      ctx.save();
      ctx.strokeStyle = '#0f0e0c'; // Rich charcoal black
      ctx.lineWidth = Math.max(0.9, tr.width * 0.4);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.8 + Math.random() * 0.2;

      ctx.beginPath();
      ctx.moveTo(tr.bx + offset * 0.8, tr.by);
      ctx.bezierCurveTo(
        tr.c1x + offset,
        tr.c1y,
        tr.c2x + offset * 0.4,
        tr.c2y,
        tr.tx + (Math.random() - 0.5) * 1.5,
        tr.ty + (Math.random() - 0.5) * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  });

  // 5. White Negative Space Scratch (Authentic Image 1 aesthetic)
  ctx.save();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.15);
  ctx.bezierCurveTo(-w * 0.12, -h * 0.38, w * 0.06, -h * 0.54, 0, -h * 0.75);
  ctx.stroke();
  ctx.restore();

  // 6. Flying Micro-Sparks from Flame Tip
  ctx.save();
  const sparkCount = Math.floor(3 + Math.min(5, intensity * 2));
  for (let i = 0; i < sparkCount; i++) {
    const sparkY = -h - (i * 12 + ((time * 0.08 + i * 20) % (36 + sparkCount * 8)));
    const sparkX = Math.sin(t * 4 + i * 2) * (w * 0.38);
    ctx.fillStyle = i % 2 === 0 ? '#fff7ed' : '#fb923c';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.2 + (i % 2) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore(); // restore translated origin
}

/**
 * Draws a breathtaking, hyper-realistic Burnt Paper Edge / Charred Scorch Mark (Images 2, 3, 4).
 * Features:
 * - Caramelized golden-brown toasted paper heat halo
 * - Deep pitch-black curled carbonized crust with paper fiber teeth
 * - Curled paper 3D edge shading and highlights
 * - Vibrant, pulsating molten-orange ember line (800~1000°C) with incandescent sparks
 * - Charred radiating capillary micro-cracks
 */
export function drawBurntPaperScorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  options: {
    intensity?: number;
    showGlowingRim?: boolean;
    seed?: number;
    time?: number;
    blowLevel?: number;
    toolType?: BurnTool;
  } = {}
) {
  const {
    intensity = 1.0,
    showGlowingRim = true,
    seed = 0,
    time = 0,
    blowLevel = 1.0,
    toolType = 'match',
  } = options;

  ctx.save();

  // 1. Caramelized Toasted Paper Scorch Halo (Roasted paper fibers, Image 4)
  // Radiates outward across intact paper - tailored per tool!
  const haloMult =
    toolType === 'ember'
      ? 1.15 + (showGlowingRim ? 0.06 : 0.03)
      : toolType === 'torch'
      ? 1.65 + (showGlowingRim ? 0.25 * blowLevel : 0.15)
      : toolType === 'lighter'
      ? 1.25 + (showGlowingRim ? 0.12 * blowLevel : 0.06)
      : 1.35 + (showGlowingRim ? 0.2 * blowLevel : 0.1);

  const haloOut = radius * haloMult;
  const scorchGrad = ctx.createRadialGradient(x, y, radius * 0.75, x, y, haloOut);
  scorchGrad.addColorStop(0, 'rgba(40, 24, 12, 0.95)');       // Dark burnt toast
  scorchGrad.addColorStop(0.35, 'rgba(115, 60, 20, 0.65)');    // Rich sepia roasted paper
  scorchGrad.addColorStop(0.65, 'rgba(180, 100, 35, 0.35)');   // Golden caramel toast
  scorchGrad.addColorStop(0.85, 'rgba(215, 145, 65, 0.15)');   // Faint heat discolouration
  scorchGrad.addColorStop(1, 'rgba(244, 239, 230, 0)');
  ctx.fillStyle = scorchGrad;
  ctx.beginPath();
  ctx.arc(x, y, haloOut, 0, Math.PI * 2);
  ctx.fill();

  // 2. Organic Jagged Burnt Edge Contour
  const points = getOrganicHolePoints(x, y, radius, seed, toolType === 'ember' ? 24 : 48);

  // 3. Curled Carbonized Paper Crust (Image 4 & 2)
  // Deep carbon black fill along the burnt rim
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();

  // Curled paper shadow inside the hole
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = toolType === 'ember' ? 4 : 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  // Charred carbon rim stroke (thin for ember, thick for torch)
  ctx.strokeStyle = '#080706'; // Pure carbon black
  ctx.lineWidth = toolType === 'ember' ? 2.5 : toolType === 'torch' ? 8 : toolType === 'lighter' ? 4.5 : 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Secondary charred graphite fiber texture
  ctx.save();
  ctx.strokeStyle = '#231f1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 4. Curled Paper 3D Ridge Highlight (gives that crisp, curled burnt paper feel, Image 4)
  ctx.save();
  ctx.strokeStyle = 'rgba(168, 162, 158, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 10, 4, 12]);
  ctx.beginPath();
  points.forEach((pt, i) => {
    // Offset slightly outward
    const angle = (i / points.length) * Math.PI * 2;
    const px = pt.x + Math.cos(angle) * 2;
    const py = pt.y + Math.sin(angle) * 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 5. Active Glowing Molten Ember Seam (Images 2 & 3)
  // When fire is burning, the edge glows brilliantly like hot glowing coals!
  if (showGlowingRim && intensity > 0.15) {
    const pulse = Math.sin(time * 0.008 + seed) * 0.2 + 0.8;
    const emberIntensity = pulse * blowLevel;

    ctx.save();

    // Tier 1: Fiery Heat Bloom
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
    ctx.lineWidth = (toolType === 'ember' ? 2.5 : 6) * emberIntensity;
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = (toolType === 'ember' ? 6 : 14) * emberIntensity;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Tier 2: Vivid Fire Orange Hot Rim
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = (toolType === 'ember' ? 1.6 : 3) * emberIntensity;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = toolType === 'ember' ? 4 : 8;
    ctx.setLineDash([8, 4, 14, 6]);
    ctx.stroke();

    // Tier 3: Incandescent Golden-White Hot Embers (800°C)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = (toolType === 'ember' ? 0.9 : 1.5) * emberIntensity;
    ctx.shadowColor = '#fff7ed';
    ctx.shadowBlur = toolType === 'ember' ? 2 : 4;
    ctx.setLineDash([4, 12, 6, 16]);
    ctx.stroke();

    ctx.restore();
  }

  // 6. Charred Capillary Cracks Radiating Outward (suppressed for fine ember linear searing)
  if (toolType !== 'ember') {
    ctx.save();
    ctx.strokeStyle = 'rgba(24, 18, 14, 0.45)';
    ctx.lineWidth = 1.1;
    const crackCount = Math.min(8, Math.max(3, Math.floor(radius / 18)));
    for (let c = 0; c < crackCount; c++) {
      const cIdx = Math.floor((c / crackCount) * points.length);
      const startPt = points[cIdx];
      const angle = (cIdx / points.length) * Math.PI * 2;
      const crackLen = 8 + ((seed + c * 7) % 16);

      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(
        startPt.x + Math.cos(angle) * crackLen + (Math.sin(c * 3) * 2),
        startPt.y + Math.sin(angle) * crackLen + (Math.cos(c * 2) * 2)
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

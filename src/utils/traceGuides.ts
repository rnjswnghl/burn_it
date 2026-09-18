import { TraceGuideType } from '../types';

/**
 * Draws dotted line tracing templates (따라 그리기 도안)
 * Faithfully recreating the cute dotted-line coloring/tracing figures (문어/해파리, 달팽이 등).
 */

export function drawTraceGuide(
  ctx: CanvasRenderingContext2D,
  type: TraceGuideType,
  cx: number,
  cy: number,
  scale: number = 1.0
) {
  if (type === 'none') return;

  ctx.save();
  ctx.strokeStyle = '#1c1917';
  ctx.fillStyle = '#1c1917';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'octopus':
      drawDottedOctopus(ctx, cx, cy - 10, scale * 1.05);
      break;
    case 'snail':
      drawDottedSnail(ctx, cx, cy - 5, scale * 1.05);
      break;
    case 'cat':
      drawDottedCat(ctx, cx, cy - 10, scale * 1.05);
      break;
    case 'heart':
      drawDottedHeart(ctx, cx, cy - 10, scale * 1.05);
      break;
  }

  ctx.restore();
}

/**
 * Image 1: Cute Dotted Octopus / Jellyfish (귀여운 점선 문어/해파리 도안)
 * - Large circular dashed dome head
 * - Two solid round black eyes
 * - Solid curved smiling mouth
 * - Scalloped dashed wavy tentacles at bottom
 */
function drawDottedOctopus(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  const headR = 75 * scale;
  const headCy = cy - 25 * scale;

  // 1. Dotted Head Dome (Circle with bottom open for tentacles)
  ctx.save();
  ctx.setLineDash([9 * scale, 6 * scale]);
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  // Arc from bottom-right around top to bottom-left
  ctx.arc(cx, headCy, headR, 0.16 * Math.PI, 0.84 * Math.PI, true);
  ctx.stroke();

  // 2. Transverse Collar/Neck line (slightly arched dashed curve)
  ctx.beginPath();
  ctx.moveTo(cx - 72 * scale, headCy + 38 * scale);
  ctx.quadraticCurveTo(cx, headCy + 46 * scale, cx + 72 * scale, headCy + 38 * scale);
  ctx.stroke();

  // 3. Scalloped Tentacles (6 cute dashed loops hanging down)
  // Left ear-like small tentacle
  ctx.beginPath();
  ctx.moveTo(cx - 68 * scale, headCy + 42 * scale);
  ctx.quadraticCurveTo(cx - 88 * scale, headCy + 75 * scale, cx - 74 * scale, headCy + 96 * scale);
  ctx.quadraticCurveTo(cx - 64 * scale, headCy + 96 * scale, cx - 55 * scale, headCy + 52 * scale);
  ctx.stroke();

  // Tentacle 2
  ctx.beginPath();
  ctx.moveTo(cx - 52 * scale, headCy + 52 * scale);
  ctx.quadraticCurveTo(cx - 48 * scale, headCy + 115 * scale, cx - 35 * scale, headCy + 115 * scale);
  ctx.quadraticCurveTo(cx - 24 * scale, headCy + 115 * scale, cx - 22 * scale, headCy + 54 * scale);
  ctx.stroke();

  // Tentacle 3
  ctx.beginPath();
  ctx.moveTo(cx - 18 * scale, headCy + 54 * scale);
  ctx.quadraticCurveTo(cx - 14 * scale, headCy + 124 * scale, cx, headCy + 124 * scale);
  ctx.quadraticCurveTo(cx + 14 * scale, headCy + 124 * scale, cx + 18 * scale, headCy + 54 * scale);
  ctx.stroke();

  // Tentacle 4
  ctx.beginPath();
  ctx.moveTo(cx + 22 * scale, headCy + 54 * scale);
  ctx.quadraticCurveTo(cx + 24 * scale, headCy + 115 * scale, cx + 35 * scale, headCy + 115 * scale);
  ctx.quadraticCurveTo(cx + 48 * scale, headCy + 115 * scale, cx + 52 * scale, headCy + 52 * scale);
  ctx.stroke();

  // Tentacle 5 (Right ear-like tentacle)
  ctx.beginPath();
  ctx.moveTo(cx + 55 * scale, headCy + 52 * scale);
  ctx.quadraticCurveTo(cx + 64 * scale, headCy + 96 * scale, cx + 74 * scale, headCy + 96 * scale);
  ctx.quadraticCurveTo(cx + 88 * scale, headCy + 75 * scale, cx + 68 * scale, headCy + 42 * scale);
  ctx.stroke();

  ctx.restore();

  // 4. Solid Black Cute Round Eyes (Matching Image 1)
  ctx.save();
  ctx.fillStyle = '#1c1917';
  const eyeOffset = 38 * scale;
  const eyeY = headCy + 5 * scale;
  const eyeR = 8.5 * scale;

  ctx.beginPath();
  ctx.arc(cx - eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // 5. Solid Black Smiling Mouth (Matching Image 1)
  ctx.lineWidth = 3.2 * scale;
  ctx.strokeStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx, headCy + 12 * scale, 22 * scale, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * Image 2: Cute Dotted Spiral Snail (귀여운 점선 소용돌이 달팽이 도안)
 * - Archimedean spiral shell made of dashed strokes
 * - Wavy bottom foot and rising front head
 * - Two eye stalks with dotted circle eyes & solid pupils
 * - Cute smile mouth
 */
function drawDottedSnail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  ctx.save();
  ctx.setLineDash([8 * scale, 5.5 * scale]);
  ctx.lineWidth = 2.4 * scale;
  ctx.strokeStyle = '#1c1917';

  // 1. A clean outer shell and a separate inward spiral. Keeping these as
  // two deliberate paths prevents the dense scribble produced by the old
  // ever-expanding Archimedean spiral.
  const shellCx = cx - 30 * scale;
  const shellCy = cy + 4 * scale;
  const shellRx = 72 * scale;
  const shellRy = 64 * scale;
  ctx.beginPath();
  ctx.ellipse(shellCx, shellCy, shellRx, shellRy, -0.08, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  const spiralSteps = 62;
  for (let i = 0; i <= spiralSteps; i++) {
    const t = (i / spiralSteps) * Math.PI * 2.15;
    const radius = (50 - 5.8 * t) * scale;
    const px = shellCx + Math.cos(t) * radius;
    const py = shellCy + Math.sin(t) * radius * 0.88;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 2. Low, open body silhouette with a clearly separated head.
  ctx.beginPath();
  ctx.moveTo(cx - 103 * scale, cy + 56 * scale);
  ctx.quadraticCurveTo(cx - 120 * scale, cy + 68 * scale, cx - 96 * scale, cy + 74 * scale);
  ctx.quadraticCurveTo(cx - 18 * scale, cy + 84 * scale, cx + 68 * scale, cy + 68 * scale);
  ctx.quadraticCurveTo(cx + 96 * scale, cy + 60 * scale, cx + 94 * scale, cy + 16 * scale);
  ctx.quadraticCurveTo(cx + 92 * scale, cy - 5 * scale, cx + 70 * scale, cy - 2 * scale);
  ctx.quadraticCurveTo(cx + 48 * scale, cy + 2 * scale, cx + 32 * scale, cy + 28 * scale);
  ctx.stroke();

  // 3. Eye stalks remain outside the shell so the face reads at a glance.
  const leftEyeCx = cx + 54 * scale;
  const leftEyeCy = cy - 46 * scale;
  const rightEyeCx = cx + 88 * scale;
  const rightEyeCy = cy - 48 * scale;
  const eyeRadius = 11 * scale;

  ctx.beginPath();
  ctx.moveTo(cx + 58 * scale, cy - 2 * scale);
  ctx.lineTo(leftEyeCx + 2 * scale, leftEyeCy + 10 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(leftEyeCx, leftEyeCy, eyeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 76 * scale, cy - 3 * scale);
  ctx.lineTo(rightEyeCx - 2 * scale, rightEyeCy + 10 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rightEyeCx, rightEyeCy, eyeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // 4. Solid Black Pupils inside the eyes (눈동자)
  ctx.save();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(leftEyeCx + 1 * scale, leftEyeCy, 4.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rightEyeCx + 1 * scale, rightEyeCy, 4.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  // 5. Smiling Mouth on Head
  ctx.lineWidth = 3.2 * scale;
  ctx.strokeStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx + 72 * scale, cy + 21 * scale, 10 * scale, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * Cute Dotted Cat (귀여운 점선 고양이 도안)
 */
function drawDottedCat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  ctx.save();
  ctx.setLineDash([8 * scale, 6 * scale]);
  ctx.lineWidth = 3.0 * scale;
  ctx.strokeStyle = '#1c1917';

  // Head contour with ears
  ctx.beginPath();
  // Chin
  ctx.moveTo(cx - 30 * scale, cy + 50 * scale);
  ctx.quadraticCurveTo(cx, cy + 58 * scale, cx + 30 * scale, cy + 50 * scale);
  // Right cheek
  ctx.quadraticCurveTo(cx + 70 * scale, cy + 30 * scale, cx + 65 * scale, cy - 10 * scale);
  // Right ear
  ctx.lineTo(cx + 75 * scale, cy - 70 * scale);
  ctx.lineTo(cx + 25 * scale, cy - 40 * scale);
  // Top head between ears
  ctx.quadraticCurveTo(cx, cy - 44 * scale, cx - 25 * scale, cy - 40 * scale);
  // Left ear
  ctx.lineTo(cx - 75 * scale, cy - 70 * scale);
  ctx.lineTo(cx - 65 * scale, cy - 10 * scale);
  // Left cheek
  ctx.quadraticCurveTo(cx - 70 * scale, cy + 30 * scale, cx - 30 * scale, cy + 50 * scale);
  ctx.stroke();

  // Whiskers (Left & Right)
  // Left whiskers
  ctx.beginPath();
  ctx.moveTo(cx - 45 * scale, cy + 12 * scale);
  ctx.lineTo(cx - 95 * scale, cy + 8 * scale);
  ctx.moveTo(cx - 45 * scale, cy + 20 * scale);
  ctx.lineTo(cx - 92 * scale, cy + 26 * scale);
  // Right whiskers
  ctx.moveTo(cx + 45 * scale, cy + 12 * scale);
  ctx.lineTo(cx + 95 * scale, cy + 8 * scale);
  ctx.moveTo(cx + 45 * scale, cy + 20 * scale);
  ctx.lineTo(cx + 92 * scale, cy + 26 * scale);
  ctx.stroke();

  ctx.restore();

  // Solid Eyes
  ctx.save();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx - 30 * scale, cy - 5 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 30 * scale, cy - 5 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Nose triangle
  ctx.beginPath();
  ctx.moveTo(cx - 6 * scale, cy + 10 * scale);
  ctx.lineTo(cx + 6 * scale, cy + 10 * scale);
  ctx.lineTo(cx, cy + 17 * scale);
  ctx.closePath();
  ctx.fill();

  // Mouth
  ctx.lineWidth = 2.8 * scale;
  ctx.strokeStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx - 9 * scale, cy + 22 * scale, 9 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 9 * scale, cy + 22 * scale, 9 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * Cute Dotted Heart & Stars (점선 하트와 별무리 도안)
 */
function drawDottedHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  ctx.save();
  ctx.setLineDash([9 * scale, 6 * scale]);
  ctx.lineWidth = 3.2 * scale;
  ctx.strokeStyle = '#1c1917';

  // Parametric Heart
  ctx.beginPath();
  const steps = 70;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const px = cx + x * 4.8 * scale;
    const py = cy + 10 * scale + y * 4.8 * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Sparkle stars around heart
  const drawSparkle = (sx: number, sy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.quadraticCurveTo(sx, sy, sx + r, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + r);
    ctx.quadraticCurveTo(sx, sy, sx - r, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - r);
    ctx.stroke();
  };

  drawSparkle(cx - 85 * scale, cy - 65 * scale, 18 * scale);
  drawSparkle(cx + 85 * scale, cy - 60 * scale, 16 * scale);
  drawSparkle(cx - 75 * scale, cy + 70 * scale, 14 * scale);
  drawSparkle(cx + 80 * scale, cy + 65 * scale, 15 * scale);

  ctx.restore();

  // Center cute eyes & smile
  ctx.save();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx - 22 * scale, cy + 5 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 22 * scale, cy + 5 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2.8 * scale;
  ctx.strokeStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(cx, cy + 14 * scale, 12 * scale, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

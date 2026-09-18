import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Pencil,
  RotateCcw,
  Wind,
  Droplets,
  Sparkles,
  Download,
  FileText,
  Palette,
  Scroll,
  HelpCircle,
  Shuffle,
} from 'lucide-react';
import { BurnTool, PaperTemplate, TraceGuideType, BurnHole, Particle, PencilStroke } from '../types';
import { sound } from '../utils/audio';
import { DOPAMINE_STORIES } from '../data/dopamineStories';
import { drawTraceGuide } from '../utils/traceGuides';
import {
  getPaperPattern,
  drawPencilLine,
  drawPencilRect,
  drawPencilCircle,
  drawSketchFlame,
  drawBurntPaperScorch,
  getOrganicHolePoints,
} from '../utils/sketchRenderer';

interface PaperBurnerProps {
  nickname: string;
  onOpenRoulette: () => void;
}

export const PaperBurner: React.FC<PaperBurnerProps> = ({ nickname, onOpenRoulette }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools & State
  const [activeTool, setActiveTool] = useState<BurnTool>('match');
  const [currentTemplate, setCurrentTemplate] = useState<PaperTemplate>('sketch_butterfly');
  const [traceGuide, setTraceGuide] = useState<TraceGuideType>('octopus');
  const [isBlowing, setIsBlowing] = useState<boolean>(false);
  const [blowLevel, setBlowLevel] = useState<number>(1);
  const [burnPercent, setBurnPercent] = useState<number>(0);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [hasDrawnNotice, setHasDrawnNotice] = useState<boolean>(false);
  const [storyIndex, setStoryIndex] = useState<number>(() =>
    Math.floor(Math.random() * DOPAMINE_STORIES.length)
  );
  const [customVow, setCustomVow] = useState<string>('');

  // Pointer state
  const isPointerDown = useRef<boolean>(false);
  const pointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPencilPoint = useRef<{ x: number; y: number } | null>(null);

  // Simulation State Refs
  const holesRef = useRef<BurnHole[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const strokesRef = useRef<PencilStroke[]>([]);
  const nextId = useRef<number>(1);
  const nextStrokeId = useRef<number>(1);
  const paperBufferRef = useRef<HTMLCanvasElement | null>(null);
  const holdDurationRef = useRef<number>(0);

  // Dimensions of the paper on canvas
  const paperBounds = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 40,
    y: 40,
    width: 520,
    height: 680,
  });

  // Match / Lighter animation timer
  const matchLitTime = useRef<number>(0);

  // Switch to another random dopamine story
  const handleNextStory = useCallback(() => {
    sound.playPaperRustle();
    setStoryIndex(prev => {
      let next = Math.floor(Math.random() * DOPAMINE_STORIES.length);
      if (next === prev && DOPAMINE_STORIES.length > 1) {
        next = (next + 1) % DOPAMINE_STORIES.length;
      }
      return next;
    });
    holesRef.current = [];
    particlesRef.current = [];
    strokesRef.current = [];
    setBurnPercent(0);
    setCurrentTemplate('secret_note');
  }, []);

  // Initialize or Reset Paper
  const resetPaper = useCallback((template: PaperTemplate = currentTemplate) => {
    sound.playPaperRustle();
    holesRef.current = [];
    particlesRef.current = [];
    strokesRef.current = [];
    setBurnPercent(0);
    if (template === 'secret_note') {
      setStoryIndex(prev => {
        let next = Math.floor(Math.random() * DOPAMINE_STORIES.length);
        if (next === prev && DOPAMINE_STORIES.length > 1) {
          next = (next + 1) % DOPAMINE_STORIES.length;
        }
        return next;
      });
    }
    setCurrentTemplate(template);
  }, [currentTemplate]);

  // Handle Air Blow (Fan flames)
  const handleBlowAir = () => {
    sound.playBlow();
    setIsBlowing(true);
    setBlowLevel(2.8);

    // Spawn sparks from all active holes
    const holes = holesRef.current;
    holes.forEach(h => {
      if (h.active) {
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            x: h.x + (Math.random() - 0.5) * h.radius * 1.5,
            y: h.y + (Math.random() - 0.5) * h.radius * 1.5,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 5 - 2,
            size: Math.random() * 2.5 + 1.2,
            life: 1,
            maxLife: 40 + Math.random() * 25,
            color: '#f97316',
            type: 'spark',
          });
        }
      }
    });

    window.setTimeout(() => {
      setIsBlowing(false);
      setBlowLevel(1);
    }, 1200);
  };

  // Extinguish all flames
  const handleExtinguish = () => {
    sound.playWaterSplash();
    holesRef.current.forEach(h => {
      h.active = false;
    });

    // Spawn steam particles
    const holes = holesRef.current;
    holes.forEach(h => {
      for (let i = 0; i < 12; i++) {
        particlesRef.current.push({
          x: h.x + (Math.random() - 0.5) * h.radius,
          y: h.y + (Math.random() - 0.5) * h.radius,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          size: Math.random() * 6 + 3,
          life: 1,
          maxLife: 35,
          color: 'rgba(214, 211, 209, 0.7)',
          type: 'smoke',
        });
      }
    });
  };

  // Tap Ash to desk
  const handleTapAsh = () => {
    sound.playTap();
    const holes = holesRef.current;
    holes.forEach(h => {
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: h.x + (Math.random() - 0.5) * h.radius,
          y: h.y + (Math.random() - 0.5) * h.radius,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 4 + 1, // Fall downward
          size: Math.random() * 3 + 1,
          life: 1,
          maxLife: 45,
          color: '#1c1917',
          type: 'ash',
        });
      }
    });
  };

  // Save / Download snapshot
  const handleSaveSnapshot = () => {
    sound.playTap();
    if (!canvasRef.current) return;
    try {
      const link = document.createElement('a');
      link.download = `charred_sketch_${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } catch {
      // ignore
    }
  };

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      // Center the paper within the workbench
      const paperW = Math.min(width - 60, Math.max(340, Math.min(540, width * 0.85)));
      const paperH = Math.min(height - 60, Math.max(480, Math.min(720, height * 0.9)));
      const paperX = Math.floor((width - paperW) / 2);
      const paperY = Math.floor((height - paperH) / 2);

      paperBounds.current = {
        x: paperX,
        y: paperY,
        width: paperW,
        height: paperH,
      };
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let flameAudioTimer = 0;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // ----------------------------------------------------
      // 1. WORKBENCH TABLE BACKGROUND (Dark Vintage Wood / Slate Desk)
      // ----------------------------------------------------
      ctx.fillStyle = '#0f0e0c'; // Deep mahogany/blackwood tone
      ctx.fillRect(0, 0, w, h);

      // Subtle desk grain lines
      ctx.save();
      ctx.strokeStyle = 'rgba(44, 38, 34, 0.35)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      // Scattered artist desk details (graphite smudges, burnt matchsticks)
      ctx.save();
      // Burnt matchstick on bottom right
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w - 70, h - 35);
      ctx.lineTo(w - 30, h - 25);
      ctx.stroke();
      // Charred match tip
      ctx.fillStyle = '#0c0a09';
      ctx.beginPath();
      ctx.arc(w - 30, h - 25, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const pb = paperBounds.current;
      const cx = pb.x + pb.width / 2;
      const cy = pb.y + pb.height / 2;

      // ----------------------------------------------------
      // 2. PAPER DROP SHADOW ON DESK
      // ----------------------------------------------------
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(pb.x, pb.y, pb.width, pb.height);
      ctx.restore();

      // ----------------------------------------------------
      // 3. OFFSCREEN PAPER BUFFER WITH PHYSICAL INCINERATION
      // ----------------------------------------------------
      if (!paperBufferRef.current) {
        paperBufferRef.current = document.createElement('canvas');
      }
      const pBuf = paperBufferRef.current;
      if (pBuf.width !== w || pBuf.height !== h) {
        pBuf.width = w;
        pBuf.height = h;
      }
      const pCtx = pBuf.getContext('2d');

      if (pCtx) {
        pCtx.clearRect(0, 0, w, h);
        pCtx.save();

        // Clip to paper rectangle
        pCtx.beginPath();
        pCtx.rect(pb.x, pb.y, pb.width, pb.height);
        pCtx.clip();

        // Paper base texture
        const paperPattern = pCtx.createPattern(getPaperPattern(), 'repeat');
        if (paperPattern) {
          pCtx.fillStyle = paperPattern;
          pCtx.fillRect(pb.x, pb.y, pb.width, pb.height);
        } else {
          pCtx.fillStyle = '#f4efe6';
          pCtx.fillRect(pb.x, pb.y, pb.width, pb.height);
        }

        // Subtle artist sketchbook margins / pencil ruler line
        pCtx.save();
        pCtx.strokeStyle = 'rgba(120, 113, 108, 0.3)';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        pCtx.rect(pb.x + 16, pb.y + 16, pb.width - 32, pb.height - 32);
        pCtx.stroke();
        pCtx.restore();

        // ----------------------------------------------------
        // 4. DRAWING CONTENT BASED ON TEMPLATE (into Paper Buffer)
        // ----------------------------------------------------
        if (currentTemplate === 'sketch_butterfly') {
          // Butterfly & Rose Sketch
          pCtx.save();
          const bx = cx;
          const by = cy - 40;
          // Body
          drawPencilLine(pCtx, bx, by - 24, bx, by + 24, { color: '#1c1917', width: 3 });
          // Antennae
          drawPencilLine(pCtx, bx, by - 24, bx - 14, by - 44, { color: '#1c1917', width: 1.5 });
          drawPencilLine(pCtx, bx, by - 24, bx + 14, by - 44, { color: '#1c1917', width: 1.5 });
          // Upper wings
          drawPencilCircle(pCtx, bx - 44, by - 20, 42, {
            color: '#1c1917',
            fillColor: 'rgba(230, 220, 205, 0.25)',
            width: 2.2,
            loops: 2,
          });
          drawPencilCircle(pCtx, bx + 44, by - 20, 42, {
            color: '#1c1917',
            fillColor: 'rgba(230, 220, 205, 0.25)',
            width: 2.2,
            loops: 2,
          });
          // Lower wings
          drawPencilCircle(pCtx, bx - 32, by + 26, 28, {
            color: '#1c1917',
            fillColor: 'rgba(230, 220, 205, 0.25)',
            width: 2.0,
            loops: 2,
          });
          drawPencilCircle(pCtx, bx + 32, by + 26, 28, {
            color: '#1c1917',
            fillColor: 'rgba(230, 220, 205, 0.25)',
            width: 2.0,
            loops: 2,
          });
          // Wing interior pencil hatching
          for (let wLine = -70; wLine <= 70; wLine += 16) {
            drawPencilLine(pCtx, bx + wLine, by - 30, bx + wLine * 0.4, by + 10, {
              color: '#44403c',
              width: 1.2,
            });
          }

          // Title at bottom of sketch
          pCtx.fillStyle = '#292524';
          pCtx.font = 'italic 13px serif';
          pCtx.textAlign = 'center';
          pCtx.fillText('Papillon de Nuit - Graphite & Charcoal Study', cx, pb.y + pb.height - 42);
          pCtx.restore();
        } else if (currentTemplate === 'secret_note') {
          // Handwritten Secret Note / Dopamine Makjang Stories!
          const story =
            DOPAMINE_STORIES[storyIndex % DOPAMINE_STORIES.length] || DOPAMINE_STORIES[0];

          pCtx.save();
          pCtx.fillStyle = '#1c1917';
          pCtx.textAlign = 'left';

          // Header Category & Top Secret Badge
          pCtx.font = 'bold 15px serif';
          pCtx.fillText('소각해야 할 도파민 비밀 일기', pb.x + 36, pb.y + 50);

          // Red confidential label
          pCtx.fillStyle = '#b91c1c';
          pCtx.font = 'bold 11px serif';
          pCtx.fillText(`[${story.tag}]`, pb.x + 36, pb.y + 68);

          // Story Title
          pCtx.fillStyle = '#1c1917';
          pCtx.font = 'bold 13.5px serif';
          pCtx.fillText(`사연: ${story.title}`, pb.x + 36, pb.y + 90);

          // Date & Author
          pCtx.font = 'italic 11px serif';
          pCtx.fillStyle = '#57534e';
          pCtx.fillText(`기록: ${story.date} | 보관자: ${nickname}`, pb.x + 36, pb.y + 109);

          // Ruled lined paper
          const lineSpacing = 26;
          const startY = pb.y + 120;
          pCtx.strokeStyle = 'rgba(168, 162, 158, 0.35)';
          pCtx.lineWidth = 1;
          for (let l = startY; l < pb.y + pb.height - 45; l += lineSpacing) {
            pCtx.beginPath();
            pCtx.moveTo(pb.x + 28, l);
            pCtx.lineTo(pb.x + pb.width - 28, l);
            pCtx.stroke();
          }

          // Red vertical margin line
          pCtx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
          pCtx.beginPath();
          pCtx.moveTo(pb.x + 32, pb.y + 115);
          pCtx.lineTo(pb.x + 32, pb.y + pb.height - 40);
          pCtx.stroke();

          // Handwritten lines with automatic wrapping
          pCtx.fillStyle = '#292524';
          pCtx.font = '12px serif';
          let currentY = startY + 18;
          const maxTextWidth = pb.width - 70;

          story.lines.forEach(line => {
            if (currentY > pb.y + pb.height - 65) return;

            if (pCtx.measureText(line).width <= maxTextWidth) {
              pCtx.fillText(line, pb.x + 38, currentY);
              currentY += lineSpacing;
            } else {
              // Word wrap long sentences
              const chars = line.split('');
              let curLine = '';
              for (let c = 0; c < chars.length; c++) {
                const testLine = curLine + chars[c];
                if (pCtx.measureText(testLine).width > maxTextWidth && curLine.length > 0) {
                  pCtx.fillText(curLine, pb.x + 38, currentY);
                  currentY += lineSpacing;
                  curLine = chars[c];
                  if (currentY > pb.y + pb.height - 65) break;
                } else {
                  curLine = testLine;
                }
              }
              if (curLine && currentY <= pb.y + pb.height - 65) {
                pCtx.fillText(curLine, pb.x + 38, currentY);
                currentY += lineSpacing;
              }
            }
          });

          // Confidential Whisper at bottom
          pCtx.fillStyle = '#b91c1c';
          pCtx.font = 'italic 11px serif';
          pCtx.fillText(`⚠️ ${story.whisper}`, pb.x + 38, pb.y + pb.height - 35);

          // Discreet AI Disclaimer (elegantly integrated at the document foot)
          pCtx.font = 'italic 9.5px serif';
          pCtx.fillStyle = 'rgba(120, 113, 108, 0.65)';
          pCtx.fillText('※ 본 사연은 AI가 창작한 가상의 픽션 기록이며 실제 인물·단체와 무관합니다.', pb.x + 38, pb.y + pb.height - 18);

          // Top Secret Red Stamp in bottom right
          drawPencilCircle(pCtx, pb.x + pb.width - 65, pb.y + pb.height - 58, 24, {
            color: '#dc2626',
            width: 2,
            loops: 2,
          });
          pCtx.fillStyle = '#dc2626';
          pCtx.font = 'bold 9.5px serif';
          pCtx.textAlign = 'center';
          pCtx.fillText('TOP SECRET', pb.x + pb.width - 65, pb.y + pb.height - 60);
          pCtx.font = '8.5px serif';
          pCtx.fillText('1급 완전소각', pb.x + pb.width - 65, pb.y + pb.height - 50);

          pCtx.restore();
        } else if (currentTemplate === 'contract') {
          // Antique Sealed Contract with 5 Clauses & Interactive Vow Section
          pCtx.save();

          // Header
          pCtx.fillStyle = '#1c1917';
          pCtx.textAlign = 'center';
          pCtx.font = 'bold 16.5px serif';
          pCtx.fillText('망각의 서약서 (OATH OF EMBERS)', cx, pb.y + 42);

          pCtx.font = 'italic 10.5px serif';
          pCtx.fillStyle = '#78716c';
          pCtx.fillText(`서약인: ${nickname} | 영구 소각 선서`, cx, pb.y + 60);

          // Top divider
          pCtx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
          pCtx.lineWidth = 1;
          pCtx.beginPath();
          pCtx.moveTo(pb.x + 34, pb.y + 70);
          pCtx.lineTo(pb.x + pb.width - 34, pb.y + 70);
          pCtx.stroke();

          // 5 Clauses of the Contract
          const articles = [
            { num: '제 1 조 [소각의 완전성]', text: '본 서약서에 기록된 모든 번민과 미련은 화염 앞에 남김없이 소각된다.' },
            { num: '제 2 조 [기억의 무효화]', text: '불에 탄 과거의 상처와 인연은 이 순간부터 일체 효력을 영구히 상실한다.' },
            { num: '제 3 조 [영구적 침묵]', text: '잿더미가 된 사연은 그 누구에게도 발설하지 않으며 바람 속에 묻는다.' },
            { num: '제 4 조 [자유의 획득]', text: '흑연의 궤적이 소멸함과 동시에 서약자는 온전한 내면의 평온을 회복한다.' },
            { num: '제 5 조 [소각자의 의무]', text: '본 서약은 자발적 점화로 체결되며, 종이가 재가 됨으로써 비로소 완성된다.' },
          ];

          let artY = pb.y + 88;
          articles.forEach(art => {
            pCtx.textAlign = 'left';
            pCtx.font = 'bold 10.5px serif';
            pCtx.fillStyle = '#57534e';
            pCtx.fillText(art.num, pb.x + 34, artY);
            pCtx.font = '11px serif';
            pCtx.fillStyle = '#292524';
            pCtx.fillText(art.text, pb.x + 34, artY + 15);
            artY += 32;
          });

          // Interactive Custom Handwritten Vow Inscription Box
          const boxY = pb.y + 258;
          const boxH = 195;
          const boxW = pb.width - 68;

          pCtx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
          pCtx.lineWidth = 1.2;
          pCtx.strokeRect(pb.x + 34, boxY, boxW, boxH);

          // Inner ruled lines
          pCtx.strokeStyle = 'rgba(168, 162, 158, 0.25)';
          for (let r = boxY + 34; r < boxY + boxH - 8; r += 24) {
            pCtx.beginPath();
            pCtx.moveTo(pb.x + 42, r);
            pCtx.lineTo(pb.x + pb.width - 42, r);
            pCtx.stroke();
          }

          pCtx.textAlign = 'center';
          pCtx.font = 'bold 11px serif';
          pCtx.fillStyle = '#78350f';
          pCtx.fillText('— 서약자 자필 소각문 (태워 없앨 기억과 다짐) —', cx, boxY + 20);

          pCtx.textAlign = 'left';
          if (customVow && customVow.trim().length > 0) {
            pCtx.font = '12px serif';
            pCtx.fillStyle = '#1c1917';
            const vLines = customVow.split('\n');
            let lineY = boxY + 44;
            for (const vl of vLines) {
              if (lineY > boxY + boxH - 14) break;
              if (vl.length === 0) {
                // Empty line created by pressing Enter
                lineY += 24;
                continue;
              }
              const chars = vl.split('');
              let cur = '';
              for (let c = 0; c < chars.length; c++) {
                const test = cur + chars[c];
                if (pCtx.measureText(test).width > boxW - 24 && cur.length > 0) {
                  pCtx.fillText(cur, pb.x + 42, lineY);
                  lineY += 24;
                  cur = chars[c];
                  if (lineY > boxY + boxH - 14) break;
                } else {
                  cur = test;
                }
              }
              if (cur && lineY <= boxY + boxH - 14) {
                pCtx.fillText(cur, pb.x + 42, lineY);
                lineY += 24;
              }
            }
          } else {
            pCtx.font = 'italic 11px serif';
            pCtx.fillStyle = 'rgba(120, 113, 108, 0.6)';
            pCtx.fillText('“상단 입력창에 지우고 싶은 기억이나 후회, 떠나보낼 이름을 적어보세요.', pb.x + 42, boxY + 54);
            pCtx.fillText('엔터(Enter) 키로 줄을 넘겨가며 여러 줄의 서약문을 자유롭게 기록할 수 있습니다.', pb.x + 42, boxY + 78);
            pCtx.fillText('입력한 글귀는 저장되지 않으며, 오직 불꽃에 의해 완전히 소각됩니다.”', pb.x + 42, boxY + 102);
          }

          // Center Seal of Ash
          drawPencilCircle(pCtx, cx - 105, pb.y + 490, 26, {
            color: '#78350f',
            fillColor: 'rgba(120, 53, 15, 0.08)',
            width: 1.8,
            loops: 3,
          });
          pCtx.fillStyle = '#78350f';
          pCtx.font = 'bold 8.5px serif';
          pCtx.textAlign = 'center';
          pCtx.fillText('SEAL OF ASH', cx - 105, pb.y + 488);
          pCtx.font = '7.5px serif';
          pCtx.fillText('영구 소각 검인', cx - 105, pb.y + 498);

          // Signer seal text
          pCtx.textAlign = 'right';
          pCtx.font = 'bold 11.5px serif';
          pCtx.fillStyle = '#1c1917';
          pCtx.fillText(`서약인: ${nickname} (인)`, pb.x + pb.width - 40, pb.y + 492);
          pCtx.font = 'italic 9.5px serif';
          pCtx.fillStyle = '#78716c';
          pCtx.fillText('화염으로 인봉됨 (CONSUMED BY FLAME)', pb.x + pb.width - 40, pb.y + 508);

          pCtx.restore();
        } else {
          // Blank Canvas (자유 도화지)
          if (traceGuide !== 'none') {
            // Render Selected Dotted Tracing Template
            drawTraceGuide(pCtx, traceGuide, cx, cy, 1.05);

            // Subtle watermark label at bottom of canvas paper
            pCtx.save();
            pCtx.fillStyle = 'rgba(120, 113, 108, 0.5)';
            pCtx.font = 'italic 11px serif';
            pCtx.textAlign = 'center';
            const guideName =
              traceGuide === 'octopus'
                ? '점선 문어·해파리 도안'
                : traceGuide === 'snail'
                ? '점선 소용돌이 달팽이 도안'
                : traceGuide === 'cat'
                ? '점선 아기 고양이 도안'
                : '점선 하트&별 도안';
            pCtx.fillText(`[따라 그리기: ${guideName}] 2B 연필로 덧그리거나 잉걸불(인두)로 점선을 태워보세요`, cx, pb.y + pb.height - 24);
            pCtx.restore();
          } else if (strokesRef.current.length === 0) {
            pCtx.save();
            pCtx.fillStyle = 'rgba(120, 113, 108, 0.4)';
            pCtx.font = 'italic 14px serif';
            pCtx.textAlign = 'center';
            pCtx.fillText('하단 "연필(Pencil)" 도구로 자유롭게 그림이나 글을 적은 뒤,', cx, cy - 10);
            pCtx.fillText('성냥이나 라이터로 불을 붙여 소각해 보세요.', cx, cy + 14);
            pCtx.restore();
          }
        }

        // ----------------------------------------------------
        // 5. PLAYER'S PENCIL STROKES (into Paper Buffer)
        // ----------------------------------------------------
        strokesRef.current.forEach(stroke => {
          if (stroke.points.length < 2) return;
          pCtx.save();
          pCtx.strokeStyle = stroke.color;
          pCtx.lineWidth = stroke.width;
          pCtx.lineCap = 'round';
          pCtx.lineJoin = 'round';
          pCtx.globalAlpha = 0.85;

          pCtx.beginPath();
          pCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            pCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          pCtx.stroke();
          pCtx.restore();
        });

        // ----------------------------------------------------
        // 6. ACTUAL PHYSICAL INCINERATION (DESTINATION-OUT CUTOUT)
        // Physically incinerates paper fibers and ink, carving real voids!
        // ----------------------------------------------------
        pCtx.save();
        pCtx.globalCompositeOperation = 'destination-out';
        holesRef.current.forEach(hole => {
          const points = getOrganicHolePoints(hole.x, hole.y, hole.radius, hole.seed, 48);
          pCtx.beginPath();
          pCtx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            pCtx.lineTo(points[i].x, points[i].y);
          }
          pCtx.closePath();
          pCtx.fill();
        });
        pCtx.restore();

        pCtx.restore(); // restore clipping

        // Draw perforated paper sheet onto main canvas
        ctx.drawImage(pBuf, 0, 0);
      }

      // ----------------------------------------------------
      // 7. CONTINUOUS MOUSE-HOLD FIRE FUELING & EXPANSION
      // ----------------------------------------------------
      if (isPointerDown.current && activeTool !== 'pencil') {
        const mx = pointerPos.current.x;
        const my = pointerPos.current.y;
        const onPaper = mx >= pb.x && mx <= pb.x + pb.width && my >= pb.y && my <= pb.y + pb.height;

        if (onPaper) {
          holdDurationRef.current += dt;
          const holdTime = holdDurationRef.current;

          // Roaring flame audio frequency accelerates with continuous hold
          flameAudioTimer += dt * (1.2 + holdTime * 0.5);
          if (flameAudioTimer > 0.16) {
            flameAudioTimer = 0;
            sound.playRoarFlame(Math.min(2.5, 1.0 + holdTime * 0.8));
          }

          if (activeTool === 'ember') {
            // Ember tool: precise linear searing (burns along the drawn path, holds stay compact)
            let targetHole = holesRef.current.find(
              h => Math.hypot(h.x - mx, h.y - my) < h.radius + 12
            );

            if (!targetHole) {
              targetHole = {
                id: nextId.current++,
                x: mx,
                y: my,
                radius: 3.2,
                maxRadius: 5.5,
                intensity: 1.0,
                seed: Math.floor(Math.random() * 1000),
                active: true,
                createdTime: Date.now(),
                toolType: 'ember',
              };
              holesRef.current.push(targetHole);
            } else {
              targetHole.active = true;
              targetHole.radius = Math.min(6.5, targetHole.radius + 2.5 * dt);
              targetHole.maxRadius = Math.max(targetHole.maxRadius, targetHole.radius);
            }

            // Subtle micro-sparks from the glowing stylus tip
            if (Math.random() < 0.2) {
              particlesRef.current.push({
                x: mx + (Math.random() - 0.5) * 4,
                y: my - Math.random() * 4,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 2 - 1,
                size: 1.0,
                life: 1,
                maxLife: 18,
                color: '#fed7aa',
                type: 'spark',
              });
            }
          } else {
            // Match, Lighter, Torch
            let targetHole = holesRef.current.find(
              h => Math.hypot(h.x - mx, h.y - my) < h.radius + (activeTool === 'torch' ? 38 : 24)
            );

            if (!targetHole) {
              targetHole = {
                id: nextId.current++,
                x: mx,
                y: my,
                radius: activeTool === 'torch' ? 16 : activeTool === 'lighter' ? 7 : 5.5,
                maxRadius: activeTool === 'torch' ? 100 : activeTool === 'lighter' ? 40 : 34,
                intensity: 1.0,
                seed: Math.floor(Math.random() * 1000),
                active: true,
                createdTime: Date.now(),
                toolType: activeTool,
              };
              holesRef.current.push(targetHole);
            }

            // Active fuel injection: continuous expansion tailored per tool!
            const toolMult =
              activeTool === 'torch' ? 2.4 : activeTool === 'lighter' ? 1.4 : 1.1;
            const fuelExpansion = (30 * blowLevel * toolMult + Math.min(95, holdTime * 36)) * dt;

            targetHole.active = true;
            targetHole.radius += fuelExpansion;
            targetHole.maxRadius = Math.max(
              targetHole.maxRadius + fuelExpansion * 1.8,
              targetHole.radius + (activeTool === 'torch' ? 50 : 25)
            );
            targetHole.intensity = Math.min(3.0, 1.2 + holdTime * 0.8);

            // Combustion chain reaction: only for roaring/flaming tools (torch, lighter, match)
            holesRef.current.forEach(otherHole => {
              if (otherHole !== targetHole && otherHole.toolType !== 'ember') {
                const dist = Math.hypot(otherHole.x - targetHole!.x, otherHole.y - targetHole!.y);
                if (dist < targetHole!.radius + otherHole.radius + (activeTool === 'torch' ? 45 : 22)) {
                  otherHole.active = true;
                  otherHole.radius += fuelExpansion * (activeTool === 'torch' ? 0.85 : 0.45);
                  otherHole.maxRadius = Math.max(otherHole.maxRadius, otherHole.radius + 20);
                  otherHole.intensity = Math.min(2.5, otherHole.intensity + 0.1);
                }
              }
            });

            // Spectacular vortex of incandescent sparks leaping from the active fire contact point
            const sparkCount = Math.floor(2 + Math.min(6, holdTime * 3));
            for (let s = 0; s < sparkCount; s++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = Math.random() * Math.min(targetHole.radius, 40);
              particlesRef.current.push({
                x: targetHole.x + Math.cos(angle) * dist,
                y: targetHole.y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 4.5 + Math.sin(now * 0.015) * 2,
                vy: -Math.random() * 6.5 - 3 - Math.min(8, holdTime * 2.8),
                size: Math.random() * 3 + 1.2,
                life: 1,
                maxLife: 20 + Math.random() * 25,
                color: Math.random() < 0.4 ? '#ffffff' : Math.random() < 0.7 ? '#fef08a' : '#f97316',
                type: 'spark',
              });
            }

            // Rising charcoal flakes
            if (Math.random() < 0.35 * toolMult) {
              particlesRef.current.push({
                x: targetHole.x + (Math.random() - 0.5) * targetHole.radius * 1.5,
                y: targetHole.y - Math.random() * 12,
                vx: (Math.random() - 0.5) * 2.5,
                vy: -Math.random() * 3 - 2,
                size: Math.random() * 4 + 2,
                life: 1,
                maxLife: 45 + Math.random() * 30,
                color: '#1c1917',
                type: 'ash',
              });
            }
          }
        }
      } else {
        holdDurationRef.current = 0;
      }

      // ----------------------------------------------------
      // 8. REALISTIC CHARRED EDGES, GLOWING EMBERS & RADIANT FLAMES
      // ----------------------------------------------------
      const holes = holesRef.current;
      let totalBurnedArea = 0;
      const paperArea = pb.width * pb.height;

      holes.forEach(hole => {
        // Expand active fire holes
        if (hole.active) {
          const isUnderCursor =
            isPointerDown.current &&
            activeTool !== 'pencil' &&
            Math.hypot(hole.x - pointerPos.current.x, hole.y - pointerPos.current.y) < hole.radius + 35;

          if (hole.toolType === 'ember') {
            // Ember only slowly settles along the drawn line
            hole.radius = Math.min(hole.maxRadius, hole.radius + 1.5 * dt);
            if (hole.radius >= hole.maxRadius && !isUnderCursor) {
              hole.active = false;
            }
          } else {
            const growthSpeed = ((isUnderCursor ? 26 : 14) * blowLevel + (hole.radius < 30 ? 9 : 5)) * dt;
            hole.radius = Math.min(hole.maxRadius, hole.radius + growthSpeed);

            // Spawn sparkling embers and micro-fire sparks along the burning perimeter
            if (Math.random() < (isUnderCursor ? 0.85 : 0.5) * blowLevel) {
              const angle = Math.random() * Math.PI * 2;
              const edgeX = hole.x + Math.cos(angle) * hole.radius;
              const edgeY = hole.y + Math.sin(angle) * hole.radius;

              particlesRef.current.push({
                x: edgeX,
                y: edgeY,
                vx: (Math.random() - 0.5) * 3.5,
                vy: -Math.random() * 4.5 - 2.5,
                size: Math.random() * 2.8 + 1.2,
                life: 1,
                maxLife: 25 + Math.random() * 25,
                color: Math.random() < 0.5 ? '#fff7ed' : '#f97316',
                type: 'spark',
              });
            }

            // Delicate carbon ash flakes flaking off the burning edge
            if (Math.random() < 0.22 * blowLevel) {
              const angle = Math.random() * Math.PI * 2;
              particlesRef.current.push({
                x: hole.x + Math.cos(angle) * hole.radius,
                y: hole.y + Math.sin(angle) * hole.radius,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 3 + 2,
                life: 1,
                maxLife: 40 + Math.random() * 30,
                color: '#1c1917',
                type: 'ash',
              });
            }

            // Stop burning only if fuel exhausted AND not actively fed by mouse press
            if (hole.radius >= hole.maxRadius && !isUnderCursor) {
              hole.active = false;
            }
          }
        }

        // Accumulate approximate burned area
        totalBurnedArea += Math.PI * hole.radius * hole.radius;

        // Render realistic Burnt Paper Scorch (Images 2, 3, 4)
        // Caramelized toasted paper halo, deep carbon crust, curled 3D rim, glowing molten ember line!
        drawBurntPaperScorch(ctx, hole.x, hole.y, hole.radius, {
          intensity: hole.active ? 1.0 * blowLevel : 0.45,
          showGlowingRim: hole.active,
          seed: hole.seed,
          time: now,
          blowLevel: blowLevel,
          toolType: hole.toolType || activeTool,
        });

        // CHARCOAL FLAME TONGUES WITH RADIANT FIRE LIGHT (Image 1 + Real Fire Light)
        if (hole.active) {
          const isHeld =
            isPointerDown.current &&
            activeTool !== 'pencil' &&
            Math.hypot(hole.x - pointerPos.current.x, hole.y - pointerPos.current.y) < hole.radius + 35;
          const flameIntensity =
            (isHeld ? 1.5 + Math.min(1.2, holdDurationRef.current * 0.5) : 1.0) * blowLevel;

          if (hole.toolType === 'ember') {
            // Ember stylus tip: small, intense incandescent ember point with heat glow
            drawSketchFlame(ctx, hole.x, hole.y, Math.max(12, hole.radius * 2.5), now, {
              colorMode: 'charcoal_with_ember_glow',
              intensity: flameIntensity,
              toolType: 'ember',
            });
          } else if (hole.radius < 35) {
            // Small fire hole: single vigorous climbing flame
            const topFlameSize = Math.max(40, (hole.radius * 1.35 + 16) * blowLevel);
            drawSketchFlame(ctx, hole.x, hole.y - hole.radius * 0.75, topFlameSize, now, {
              colorMode: 'charcoal_with_ember_glow',
              intensity: flameIntensity,
              toolType: hole.toolType || activeTool,
            });
          } else if (hole.radius < 75) {
            // Medium fire hole: Top leader flame + 2 climbing side flames
            const topFlameSize = Math.max(52, Math.min(125, (hole.radius * 1.05 + 20) * blowLevel));
            drawSketchFlame(ctx, hole.x, hole.y - hole.radius * 0.75, topFlameSize, now, {
              colorMode: 'charcoal_with_ember_glow',
              intensity: flameIntensity,
              toolType: hole.toolType || activeTool,
            });

            const sideFlameSize = Math.max(32, hole.radius * 0.65 * blowLevel);
            // Left flame
            drawSketchFlame(
              ctx,
              hole.x - hole.radius * 0.65,
              hole.y - hole.radius * 0.35,
              sideFlameSize,
              now + 150,
              {
                colorMode: 'charcoal_with_ember_glow',
                intensity: flameIntensity * 0.85,
                toolType: hole.toolType || activeTool,
              }
            );
            // Right flame
            drawSketchFlame(
              ctx,
              hole.x + hole.radius * 0.65,
              hole.y - hole.radius * 0.35,
              sideFlameSize,
              now + 300,
              {
                colorMode: 'charcoal_with_ember_glow',
                intensity: flameIntensity * 0.85,
                toolType: hole.toolType || activeTool,
              }
            );
          } else {
            // Large grand blazing fire (>= 75px radius):
            // Multi-tongue roaring ring of fire along the upper perimeter!
            const tongueCount = Math.min(7, Math.floor(hole.radius / 20));
            const angleStart = -Math.PI * 0.88;
            const angleEnd = -Math.PI * 0.12;
            const angleStep = (angleEnd - angleStart) / (tongueCount - 1);

            for (let i = 0; i < tongueCount; i++) {
              const ang = angleStart + i * angleStep;
              const fx = hole.x + Math.cos(ang) * hole.radius * 0.88;
              const fy = hole.y + Math.sin(ang) * hole.radius * 0.88;
              const heightFactor = 1 - Math.abs(i - (tongueCount - 1) / 2) * 0.22;
              const fSize = Math.max(
                45,
                Math.min(160, (hole.radius * 0.75 * heightFactor + 32) * blowLevel)
              );

              drawSketchFlame(ctx, fx, fy, fSize, now + i * 180, {
                colorMode: 'charcoal_with_ember_glow',
                intensity: flameIntensity * (0.85 + heightFactor * 0.35),
                toolType: hole.toolType || activeTool,
              });
            }
          }
        }
      });

      // Update Burn percentage
      const calculatedPercent = Math.min(100, Math.floor((totalBurnedArea / paperArea) * 100));
      setBurnPercent(calculatedPercent);

      // ----------------------------------------------------
      // 7. AIR BLOW WIND EFFECT
      // ----------------------------------------------------
      if (isBlowing) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        for (let b = 0; b < 6; b++) {
          const by = pb.y + 40 + b * 90;
          ctx.beginPath();
          ctx.moveTo(pb.x - 40, by);
          ctx.bezierCurveTo(
            cx - 20,
            by - 20,
            cx + 20,
            by + 20,
            pb.x + pb.width + 40,
            by
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // ----------------------------------------------------
      // 8. PARTICLES (Sparks, Ash, Smoke)
      // ----------------------------------------------------
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);

        if (p.type === 'spark') {
          ctx.fillStyle = isBlowing ? '#fed7aa' : p.color;
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (isBlowing ? 1.5 : 1), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ash') {
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else {
          // Smoke
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (2 - p.life), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ----------------------------------------------------
      // 9. ACTIVE TOOL CURSOR / APPARATUS
      // ----------------------------------------------------
      const mx = pointerPos.current.x;
      const my = pointerPos.current.y;

      if (mx > 0 && my > 0) {
        ctx.save();
        const holdBoost = isPointerDown.current
          ? Math.min(1.8, 1.0 + holdDurationRef.current * 0.45)
          : 1.0;

        // Contact searing heat glow when tool presses on paper
        if (isPointerDown.current && activeTool !== 'pencil') {
          ctx.save();
          ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(mx, my, 8 + Math.sin(now * 0.02) * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (activeTool === 'match') {
          // Wooden Matchstick
          const isIgnited = true;
          // Wooden stick
          drawPencilLine(ctx, mx, my, mx + 24, my + 38, {
            color: '#78350f',
            width: 4.5,
            passes: 2,
          });
          // Red match head
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Match flame (charcoal flame tongue, Image 1)
          if (isIgnited) {
            drawSketchFlame(ctx, mx, my - 2, 32 * holdBoost, now, {
              colorMode: 'charcoal_with_ember_glow',
              intensity: holdBoost,
            });
          }
        } else if (activeTool === 'lighter') {
          // Zippo Lighter body
          drawPencilRect(ctx, mx + 8, my + 14, 22, 32, {
            strokeColor: '#292524',
            fillColor: '#78716c',
            lineWidth: 2,
            hatch: 'single',
          });
          // Flint chimney
          drawPencilRect(ctx, mx + 11, my + 4, 16, 10, {
            strokeColor: '#1c1917',
            fillColor: '#44403c',
            lineWidth: 1.5,
          });
          // Lighter Flame
          drawSketchFlame(ctx, mx + 18, my + 2, 42 * holdBoost, now, {
            colorMode: 'charcoal_with_ember_glow',
            intensity: holdBoost,
          });
        } else if (activeTool === 'torch') {
          // Charcoal Flame Torch
          drawPencilLine(ctx, mx, my + 6, mx + 20, my + 44, {
            color: '#1c1917',
            width: 6,
            passes: 2,
          });
          drawSketchFlame(ctx, mx, my, 65 * holdBoost, now, {
            colorMode: 'charcoal_with_ember_glow',
            intensity: holdBoost,
          });
        } else if (activeTool === 'ember') {
          // Glowing Ember Lump
          drawBurntPaperScorch(ctx, mx, my, 8 * holdBoost, {
            intensity: 1.0 * holdBoost,
            showGlowingRim: true,
            seed: 42,
          });
          // Glowing core
          ctx.fillStyle = '#ea580c';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12 * holdBoost;
          ctx.beginPath();
          ctx.arc(mx, my, 4 * holdBoost, 0, Math.PI * 2);
          ctx.fill();
        } else if (activeTool === 'pencil') {
          // 2B Graphite Pencil Cursor
          drawPencilLine(ctx, mx, my, mx + 14, my - 24, {
            color: '#eab308', // yellow pencil body
            width: 5,
            passes: 2,
          });
          // Graphite tip
          drawPencilLine(ctx, mx, my, mx + 4, my - 6, {
            color: '#1c1917',
            width: 3.5,
          });
        }

        ctx.restore();
      }

      // Audio loop for burning fire
      const activeHolesCount = holes.filter(h => h.active).length;
      if (activeHolesCount > 0) {
        flameAudioTimer += dt;
        if (flameAudioTimer > 0.22) {
          flameAudioTimer = 0;
          sound.playFlame();
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentTemplate, activeTool, isBlowing, blowLevel, nickname, storyIndex, customVow, traceGuide]);

  // Touch / Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDown.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerPos.current = { x, y };

    const pb = paperBounds.current;
    const onPaper = x >= pb.x && x <= pb.x + pb.width && y >= pb.y && y <= pb.y + pb.height;

    if (activeTool === 'pencil') {
      if (onPaper) {
        sound.playPencilScratch();
        strokesRef.current.push({
          id: nextStrokeId.current++,
          points: [{ x, y }],
          color: '#1c1917',
          width: 2.2,
        });
        lastPencilPoint.current = { x, y };
      }
    } else if (activeTool === 'ember') {
      // Linear searing tool (인두 / 낙화): starts a pinpoint incandescent burn trace
      if (onPaper) {
        sound.playSizzle();
        holesRef.current.push({
          id: nextId.current++,
          x,
          y,
          radius: 3.2,
          maxRadius: 5.5,
          intensity: 1.0,
          seed: Math.floor(Math.random() * 1000),
          active: true,
          createdTime: Date.now(),
          toolType: 'ember',
        });
        lastPencilPoint.current = { x, y };
      }
    } else {
      // Fire Tools: Match, Lighter, Torch
      if (onPaper) {
        sound.playFlame();
        // Check if there's already an existing hole close by to merge/grow
        const existing = holesRef.current.find(
          h => Math.hypot(h.x - x, h.y - y) < h.radius + (activeTool === 'torch' ? 32 : 18)
        );

        if (existing && existing.toolType !== 'ember') {
          existing.active = true;
          existing.maxRadius += activeTool === 'torch' ? 35 : 18;
        } else {
          // Create new burn hole with tool-specific parameters
          const maxRadius =
            activeTool === 'torch'
              ? Math.random() * 55 + 75
              : activeTool === 'lighter'
              ? Math.random() * 18 + 28
              : Math.random() * 20 + 26;

          holesRef.current.push({
            id: nextId.current++,
            x,
            y,
            radius: activeTool === 'torch' ? 16 : activeTool === 'lighter' ? 7 : 5.5,
            maxRadius,
            intensity: 1.0,
            seed: Math.floor(Math.random() * 1000),
            active: true,
            createdTime: Date.now(),
            toolType: activeTool,
          });
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerPos.current = { x, y };

    if (!isPointerDown.current) return;

    const pb = paperBounds.current;
    const onPaper = x >= pb.x && x <= pb.x + pb.width && y >= pb.y && y <= pb.y + pb.height;

    if (activeTool === 'pencil') {
      if (onPaper) {
        const currentStroke = strokesRef.current[strokesRef.current.length - 1];
        if (currentStroke) {
          currentStroke.points.push({ x, y });
          if (Math.random() < 0.25) sound.playPencilScratch();
        }
      }
    } else if (activeTool === 'ember') {
      // Linear scorch along the exact path traversed by the user
      if (onPaper) {
        const last = lastPencilPoint.current;
        const dist = last ? Math.hypot(x - last.x, y - last.y) : 999;
        if (dist >= 4) {
          holesRef.current.push({
            id: nextId.current++,
            x,
            y,
            radius: 3.2,
            maxRadius: 5.5,
            intensity: 1.0,
            seed: Math.floor(Math.random() * 1000),
            active: true,
            createdTime: Date.now(),
            toolType: 'ember',
          });
          lastPencilPoint.current = { x, y };
          if (Math.random() < 0.15) sound.playSizzle();
        }
      }
    } else {
      // Dragging fire tool: continuously scorches trails
      if (onPaper && Math.random() < (activeTool === 'torch' ? 0.75 : 0.45)) {
        const nearby = holesRef.current.find(
          h => Math.hypot(h.x - x, h.y - y) < h.radius + (activeTool === 'torch' ? 24 : 12)
        );
        if (nearby && nearby.toolType !== 'ember') {
          nearby.active = true;
          nearby.maxRadius = Math.min(
            activeTool === 'torch' ? 130 : 55,
            nearby.maxRadius + (activeTool === 'torch' ? 10 : 4)
          );
        } else {
          holesRef.current.push({
            id: nextId.current++,
            x,
            y,
            radius: activeTool === 'torch' ? 12 : activeTool === 'lighter' ? 6 : 5,
            maxRadius: activeTool === 'torch' ? 70 : activeTool === 'lighter' ? 30 : 25,
            intensity: 1.0,
            seed: Math.floor(Math.random() * 1000),
            active: true,
            createdTime: Date.now(),
            toolType: activeTool,
          });
        }
      }
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
    holdDurationRef.current = 0;
    lastPencilPoint.current = null;
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0c0a09] text-stone-200 overflow-hidden select-none">
      {/* Top Studio Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#1c1917] border-b border-[#292524] gap-2 shrink-0 z-10">
        {/* Nickname & Re-roll */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#292524] border border-[#44403c] rounded-lg">
            <span className="text-[11px] text-stone-400 font-serif">소각자:</span>
            <span className="text-xs font-serif font-black text-amber-400 tracking-wide">
              {nickname}
            </span>
          </div>
          <button
            id="btn-reroll-roulette"
            onClick={() => {
              sound.playTap();
              onOpenRoulette();
            }}
            className="px-2.5 py-1 text-xs font-serif text-stone-300 hover:text-amber-400 bg-stone-900 border border-stone-700 hover:border-amber-500/50 rounded-lg transition-colors flex items-center gap-1"
            title="닉네임 슬롯 룰렛 다시 돌리기"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>칭호 재추첨</span>
          </button>
        </div>

        {/* Paper Templates */}
        <div className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 gap-1">
          <button
            type="button"
            onClick={() => resetPaper('sketch_butterfly')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1 ${
              currentTemplate === 'sketch_butterfly'
                ? 'bg-[#292524] text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Palette className="w-3 h-3" />
            <span>나비 스케치</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              id="template-secret-note"
              type="button"
              onClick={() => {
                if (currentTemplate !== 'secret_note') {
                  resetPaper('secret_note');
                } else {
                  handleNextStory();
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1 ${
                currentTemplate === 'secret_note'
                  ? 'bg-[#292524] text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title={
                currentTemplate === 'secret_note'
                  ? '클릭 시 다른 도파민 비밀 일기 사연으로 새로고침'
                  : '도파민 막장 비밀 일기 보기'
              }
            >
              <FileText className="w-3 h-3" />
              <span>비밀 일기</span>
            </button>

            {currentTemplate === 'secret_note' && (
              <button
                id="btn-next-story"
                type="button"
                onClick={handleNextStory}
                className="px-2 py-1 rounded-lg text-[11px] font-serif font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center gap-1 transition-all"
                title="다른 도파민 막장 사연으로 즉시 변경"
              >
                <Shuffle className="w-3 h-3" />
                <span>다음 사연</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => resetPaper('contract')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1 ${
              currentTemplate === 'contract'
                ? 'bg-[#292524] text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Scroll className="w-3 h-3" />
            <span>망각의 서약서</span>
          </button>

          <button
            type="button"
            onClick={() => resetPaper('blank_canvas')}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1 ${
              currentTemplate === 'blank_canvas'
                ? 'bg-[#292524] text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Pencil className="w-3 h-3" />
            <span>자유 도화지</span>
          </button>
        </div>

        {/* Burn progress & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs font-serif">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-stone-400">소각도:</span>
            <span className="font-mono font-bold text-amber-400">{burnPercent}%</span>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="p-1.5 text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 rounded-lg"
            title="스튜디오 안내"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSaveSnapshot}
            className="p-1.5 text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 rounded-lg"
            title="소각 작품 이미지 저장"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Vow Inscription Banner (망각의 서약서 전용 자필 소각문 입력기 - 여러 줄 / 줄바꿈 지원) */}
      {currentTemplate === 'contract' && (
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-2 bg-[#231e1a] border-b border-amber-900/40 shrink-0 z-10 animate-fadeIn">
          <div className="flex items-center gap-1.5 text-amber-300 shrink-0">
            <Scroll className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-serif font-bold whitespace-nowrap">소각할 서약문:</span>
          </div>
          <div className="flex-1 min-w-[240px] flex items-center gap-2">
            <textarea
              id="input-contract-vow"
              rows={2}
              value={customVow}
              onChange={e => setCustomVow(e.target.value)}
              placeholder="지우고 싶은 후회, 마음의 상처, 떠나보낼 이름을 적으세요 (Enter 키로 자유롭게 다음 줄로 넘길 수 있습니다)..."
              className="flex-1 min-h-[44px] max-h-[76px] bg-stone-900/95 border border-stone-700/90 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 font-serif focus:outline-none transition-colors resize-none leading-relaxed"
              maxLength={280}
            />
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCustomVow(prev => prev + '\n')}
                className="text-[11px] font-serif text-amber-300 hover:text-amber-100 px-2 py-1 rounded bg-stone-800 border border-amber-900/60 hover:border-amber-500/80 transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                title="다음 줄로 줄바꿈 (Enter)"
              >
                <span>↵</span>
                <span>다음 줄</span>
              </button>
              {customVow && (
                <button
                  type="button"
                  onClick={() => setCustomVow('')}
                  className="text-[10px] font-serif text-stone-400 hover:text-stone-200 px-2 py-0.5 rounded bg-stone-800/80 border border-stone-700 transition-colors"
                  title="글귀 전체 지우기"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-serif text-amber-400/80 hidden xl:flex">
            <span className="bg-stone-900/80 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
              💡 Enter 키로 줄바꿈
            </span>
            <span>종이 위의 서약문을 불꽃으로 직접 태워보세요.</span>
          </div>
        </div>
      )}

      {/* Trace Guide Selector for Blank Canvas (자유 도화지 전용 따라 그리기 도안 선택 배너) */}
      {currentTemplate === 'blank_canvas' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#211d19] border-b border-amber-900/40 shrink-0 z-10 animate-fadeIn">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-serif font-bold whitespace-nowrap">따라 그리기 도안:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setTraceGuide('octopus');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1.5 ${
                  traceGuide === 'octopus'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
                }`}
                title="귀여운 점선 문어/해파리 도안 (동그란 머리와 물결치는 다리)"
              >
                <span>🐙</span>
                <span>점선 문어·해파리</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setTraceGuide('snail');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1.5 ${
                  traceGuide === 'snail'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
                }`}
                title="점선 소용돌이 달팽이 도안 (돌돌 말린 껍질과 더듬이 눈)"
              >
                <span>🐌</span>
                <span>점선 달팽이</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setTraceGuide('cat');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1.5 ${
                  traceGuide === 'cat'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
                }`}
                title="점선 아기고양이 도안 (쫑긋한 귀와 수염)"
              >
                <span>🐱</span>
                <span>점선 고양이</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setTraceGuide('heart');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1.5 ${
                  traceGuide === 'heart'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
                }`}
                title="점선 하트와 별 도안"
              >
                <span>💖</span>
                <span>점선 하트&별</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setTraceGuide('none');
                }}
                className={`px-2 py-1 rounded-lg text-xs font-serif transition-all flex items-center gap-1 ${
                  traceGuide === 'none'
                    ? 'bg-stone-700 text-stone-100 font-bold border border-stone-500'
                    : 'bg-stone-900/80 text-stone-400 border border-stone-800 hover:text-stone-300'
                }`}
                title="도안 없는 깨끗한 백지"
              >
                <span>⬜</span>
                <span>백지 (도안 없음)</span>
              </button>
            </div>
          </div>
          <span className="text-[11px] font-serif text-amber-300/80 hidden lg:inline">
            ※ 2B 연필로 점선을 따라 그리거나, 잉걸불(인두)로 점선 궤적을 태워보세요!
          </span>
        </div>
      )}

      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-0 relative flex items-center justify-center overflow-hidden cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none block"
        />
      </div>

      {/* Bottom Tool Palette Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#1c1917] border-t border-[#292524] gap-2 shrink-0 z-10">
        {/* Fire Tools & Pencil Selection with Distinct Physics Profiles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-serif text-stone-400 hidden sm:inline mr-1">도구:</span>

          <button
            id="tool-match"
            type="button"
            onClick={() => {
              sound.playMatchStrike();
              setActiveTool('match');
            }}
            title="성냥: 부드럽고 자연스러운 목재 화염 확산"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'match'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
            }`}
          >
            <span>🪵</span>
            <span>성냥 <span className="text-[10px] font-normal opacity-75 hidden md:inline">(자연 연소)</span></span>
          </button>

          <button
            id="tool-lighter"
            type="button"
            onClick={() => {
              sound.playLighterFlick();
              setActiveTool('lighter');
            }}
            title="지포 라이터: 고온의 집중 화염으로 날카롭고 빠른 관통 천공"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'lighter'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
            }`}
          >
            <span>🔥</span>
            <span>지포 라이터 <span className="text-[10px] font-normal opacity-75 hidden md:inline">(고온 관통)</span></span>
          </button>

          <button
            id="tool-torch"
            type="button"
            onClick={() => {
              sound.playFlame();
              setActiveTool('torch');
            }}
            title="목탄 화염: 광범위한 거대 화염과 맹렬한 연쇄 소각"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'torch'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
            }`}
          >
            <span>⚡</span>
            <span>목탄 화염 <span className="text-[10px] font-normal opacity-75 hidden md:inline">(광역 맹화)</span></span>
          </button>

          <button
            id="tool-ember"
            type="button"
            onClick={() => {
              sound.playTap();
              setActiveTool('ember');
            }}
            title="잉걸불/인두: 지나간 자리만 얇게 지져 태우는 우아한 낙화선"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'ember'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
            }`}
          >
            <span>🔴</span>
            <span>잉걸불 <span className="text-[10px] font-normal opacity-75 hidden md:inline">(선형 지짐)</span></span>
          </button>

          <button
            id="tool-pencil"
            type="button"
            onClick={() => {
              sound.playPencilScratch();
              setActiveTool('pencil');
            }}
            title="2B 흑연 연필: 종이 위에 그림이나 글귀 자유 드로잉"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 ${
              activeTool === 'pencil'
                ? 'bg-stone-100 text-stone-950 shadow-md ring-1 ring-white'
                : 'bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-700'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>2B 연필 <span className="text-[10px] font-normal opacity-75 hidden md:inline">(자유 필기)</span></span>
          </button>
        </div>

        {/* Physical Fire Actions (Blow, Tap Ash, Extinguish, New Paper) */}
        <div className="flex items-center gap-2">
          {/* Blow air */}
          <button
            type="button"
            onClick={handleBlowAir}
            disabled={isBlowing}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-all ${
              isBlowing
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-400'
            }`}
            title="바람을 불어 불씨를 확산시키고 불티를 일으킵니다"
          >
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>{isBlowing ? '바람 부는 중...' : '후- 불기 (입김)'}</span>
          </button>

          {/* Tap Ash */}
          <button
            type="button"
            onClick={handleTapAsh}
            className="px-2.5 py-1.5 rounded-xl text-xs font-serif text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 hover:border-stone-700"
            title="탄 재를 책상 위로 텁니다"
          >
            재 털기
          </button>

          {/* Extinguish */}
          <button
            type="button"
            onClick={handleExtinguish}
            className="px-2.5 py-1.5 rounded-xl text-xs font-serif text-sky-400 hover:text-sky-300 bg-stone-900 border border-stone-800 hover:border-sky-500/50 flex items-center gap-1"
            title="불을 끄고 탄 상태를 보존합니다"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>진화</span>
          </button>

          {/* Reset / New Paper */}
          <button
            type="button"
            onClick={() => resetPaper()}
            className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold text-stone-300 hover:text-white bg-stone-900 border border-stone-800 hover:border-stone-700 flex items-center gap-1"
            title="새 종이 꺼내기"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>새 종이</span>
          </button>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1917] border-2 border-[#44403c] p-6 rounded-2xl max-w-md w-full shadow-2xl font-serif text-stone-300">
            <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              흑백 종이 소각 스튜디오 안내
            </h3>

            <div className="text-xs space-y-3 leading-relaxed text-stone-300">
              <p>
                목탄 드로잉과 스케치북 종이의 질감을 살린 사실적인 종이 소각 시뮬레이터입니다.
              </p>
              <div className="p-2.5 bg-[#0c0a09] rounded-xl border border-[#292524] space-y-1.5">
                <div className="font-bold text-amber-400">1. 성냥 & 라이터 점화</div>
                <p className="text-stone-400">
                  도구를 선택하고 도화지 원하는 곳을 클릭하거나 드래그하면 섬유질을 따라 서서히 불이 붙고 탄 구멍이 생깁니다.
                </p>
              </div>

              <div className="p-2.5 bg-[#0c0a09] rounded-xl border border-[#292524] space-y-1.5">
                <div className="font-bold text-amber-400">2. 2B 연필 드로잉</div>
                <p className="text-stone-400">
                  '자유 도화지' 혹은 원하는 종이 위에 직접 글씨나 스케치를 그린 뒤, 불을 붙여 나만의 소각 작품을 완성하세요.
                </p>
              </div>

              <div className="p-2.5 bg-[#0c0a09] rounded-xl border border-[#292524] space-y-1.5">
                <div className="font-bold text-amber-400">3. 후- 불기 & 진화</div>
                <p className="text-stone-400">
                  '후- 불기'를 누르면 입김으로 붉은 잉걸불이 타오르며 소각 속도가 빨라집니다. 원하는 시점에 '진화'를 누르면 반쯤 탄 예술적인 상태로 영구 보존할 수 있습니다.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

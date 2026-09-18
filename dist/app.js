const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const adjectives = ["고요한", "단단한", "느긋한", "새벽의", "용감한", "가벼운", "반짝이는", "무심한", "따뜻한", "엉뚱한"];
const nouns = ["불꽃", "잿가루", "모닥불", "종이학", "고양이", "연기", "부싯돌", "달빛", "장작", "불씨"];
const storageKey = "burnit:user:v1";
const historyKey = "burnit:history:v1";
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
  catch { return fallback; }
}
let user = readLocal(storageKey, { id: crypto.randomUUID(), nickname: "" });
let history = readLocal(historyKey, []);
let pendingNickname = "";
let rouletteSpinning = false;
let currentMode = "preset";
let currentPreset = "office";
let sourceImage = null;
let burning = false;
let completed = false;
let burnPoints = [];
let particles = [];
let lastPoint = null;
let audio = null;
let muted = true;
let renderLoopStarted = false;
let burnPercent = 0;
let coverageTick = 0;
let lastFrameAt = 0;
let ignitionCombo = { count: 0, time: 0, x: 0, y: 0 };
let comboMessage = "";
let comboMessageUntil = 0;

const canvas = $("#burn-canvas");
const fx = $("#fx-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const fctx = fx.getContext("2d");
const original = document.createElement("canvas");
original.width = canvas.width;
original.height = canvas.height;
const octx = original.getContext("2d");
const coverage = document.createElement("canvas");
coverage.width = 180;
coverage.height = 124;
const coverageCtx = coverage.getContext("2d", { willReadFrequently: true });

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function randomNameParts() {
  let parts;
  do parts = { adjective: pick(adjectives), noun: pick(nouns), number: String(Math.floor(Math.random() * 90 + 10)) };
  while (`${parts.adjective} ${parts.noun}${parts.number}` === user.nickname);
  return parts;
}

function randomName() {
  const parts = randomNameParts();
  return `${parts.adjective} ${parts.noun}${parts.number}`;
}

function saveUser() {
  localStorage.setItem(storageKey, JSON.stringify(user));
  $("#greeting").textContent = `${user.nickname}님, 오늘의 무거운 것을 여기 두고 가세요.`;
}

function showIntro() {
  document.body.classList.remove("onboarding");
  $("#nickname-screen").hidden = true;
  $("#intro-screen").hidden = false;
  $("#game-screen").hidden = true;
}

function showNicknameOnboarding() {
  document.body.classList.add("onboarding");
  $("#nickname-screen").hidden = false;
  $("#intro-screen").hidden = true;
  $("#game-screen").hidden = true;
}

function pulseReel(reel, values, stopAfter, finalValue) {
  reel.classList.remove("spinning");
  void reel.offsetWidth;
  reel.classList.add("spinning");
  const timer = setInterval(() => { reel.querySelector("span").textContent = pick(values); }, 72);
  setTimeout(() => {
    clearInterval(timer);
    reel.querySelector("span").textContent = finalValue;
    reel.classList.remove("spinning");
  }, stopAfter);
}

function spinRoulette() {
  if (rouletteSpinning) return;
  rouletteSpinning = true;
  pendingNickname = "";
  $("#accept-name-button").disabled = true;
  $("#roulette-result").textContent = "이름을 고르는 중…";
  $(".slot-machine")?.classList.add("is-spinning");
  const parts = randomNameParts();
  pulseReel($("#adjective-reel"), adjectives, 850, parts.adjective);
  pulseReel($("#noun-reel"), nouns, 1080, parts.noun);
  pulseReel($("#number-reel"), Array.from({ length: 90 }, (_, index) => String(index + 10)), 1320, parts.number);
  setTimeout(() => {
    pendingNickname = `${parts.adjective} ${parts.noun}${parts.number}`;
    $("#roulette-result").innerHTML = `오늘의 이름은 <strong>${pendingNickname}</strong>`;
    $("#accept-name-button").disabled = false;
    $(".slot-machine")?.classList.remove("is-spinning");
    rouletteSpinning = false;
  }, 1360);
}

$("#lever-button").addEventListener("click", spinRoulette);
$("#spin-button").addEventListener("click", spinRoulette);
$("#accept-name-button").addEventListener("click", () => {
  if (!pendingNickname || rouletteSpinning) return;
  user.nickname = pendingNickname;
  $("#nickname").value = user.nickname;
  saveUser();
  showIntro();
  showToast(`${user.nickname}님, 기억해둘게요.`);
});

$("#nickname").addEventListener("change", (event) => {
  const value = event.target.value.trim();
  user.nickname = value || randomName();
  event.target.value = user.nickname;
  saveUser();
  showToast("이 이름으로 기억할게요.");
});

$("#dice-button").addEventListener("click", () => {
  const die = $(".dice");
  die.classList.remove("rolling");
  void die.offsetWidth;
  die.classList.add("rolling");
  setTimeout(() => {
    user.nickname = randomName();
    $("#nickname").value = user.nickname;
    saveUser();
    showToast(`${user.nickname}, 꽤 괜찮은 이름이에요.`);
  }, 480);
});

if (user.nickname) {
  $("#nickname").value = user.nickname;
  saveUser();
  showIntro();
} else {
  $("#nickname").value = "";
  showNicknameOnboarding();
}

$("#enter-button").addEventListener("click", () => {
  $("#intro-screen").hidden = true;
  $("#game-screen").hidden = false;
  renderPreset("office");
  renderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function switchMode(mode) {
  currentMode = mode;
  ["preset", "upload"].forEach((name) => {
    $(`#${name}-tab`).classList.toggle("active", name === mode);
    $(`#${name}-tab`).setAttribute("aria-selected", String(name === mode));
    $(`#${name}-panel`).hidden = name !== mode;
  });
  if (mode === "preset") renderPreset(currentPreset);
  else renderUploadPlaceholder();
}
$("#preset-tab").addEventListener("click", () => switchMode("preset"));
$("#upload-tab").addEventListener("click", () => switchMode("upload"));

$$('.preset').forEach((button) => button.addEventListener("click", () => {
  $$('.preset').forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  currentPreset = button.dataset.preset;
  renderPreset(currentPreset);
}));

function paperBase() {
  octx.clearRect(0, 0, original.width, original.height);
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, original.width, original.height);
  for (let i = 0; i < 1150; i++) {
    const shade = Math.floor(Math.random() * 45 + 120);
    octx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * .045})`;
    octx.fillRect(Math.random() * 900, Math.random() * 620, Math.random() * 2.4 + .2, Math.random() * .9 + .15);
  }
}

function inkLine(points, width = 4, roughness = 1, passes = 2, alpha = .92) {
  for (let pass = 0; pass < passes; pass++) {
    octx.beginPath();
    points.forEach(([x, y], index) => {
      const jitter = () => (Math.random() - .5) * roughness * (pass + 1);
      if (index) octx.lineTo(x + jitter(), y + jitter()); else octx.moveTo(x + jitter(), y + jitter());
    });
    octx.strokeStyle = `rgba(22,22,20,${alpha / passes + .18})`;
    octx.lineWidth = Math.max(.65, width - pass * .55);
    octx.lineCap = pass % 2 ? "square" : "round";
    octx.lineJoin = "round";
    octx.stroke();
  }
}

function inkRect(x, y, width, height, lineWidth = 3, roughness = 1.5) {
  inkLine([[x, y], [x + width, y], [x + width, y + height], [x, y + height], [x, y]], lineWidth, roughness, 2);
}

function hatch(x, y, width, height, spacing = 10, lineWidth = 1) {
  octx.save();
  octx.beginPath(); octx.rect(x, y, width, height); octx.clip();
  for (let offset = -height; offset < width + height; offset += spacing) inkLine([[x + offset, y + height], [x + offset + height, y]], lineWidth, .8, 1, .42);
  octx.restore();
}

function officeScene() {
  inkLine([[-410, 205], [410, 205]], 5, 2.4, 3);
  inkLine([[-410, -245], [410, -245]], 2, 1.5, 2, .55);
  inkRect(-375, -205, 250, 180, 4, 2.4);
  inkLine([[-250, -205], [-250, -25], [-375, -25], [-125, -25]], 2, 1.2, 2);
  for (let x = -350; x < -130; x += 42) inkLine([[x, -195], [x, -38]], 1, 1.8, 1, .42);
  hatch(-370, -200, 240, 170, 17, .8);
  octx.font = "italic 22px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "left"; octx.fillText("still here · 21:47", -370, -218);
  [-270, 45, 300].forEach((x, index) => {
    const deskY = 92 + (index % 2) * 18;
    inkLine([[x - 120, deskY], [x + 90, deskY]], 7, 3.2, 3);
    inkLine([[x - 105, deskY], [x - 112, 196]], 3, 2, 2);
    inkLine([[x + 74, deskY], [x + 83, 196]], 3, 2, 2);
    inkRect(x - 55, deskY - 100, 105, 70, index === 1 ? 5 : 3, 2.6);
    hatch(x - 50, deskY - 95, 95, 60, 13 + index * 3, .9);
    inkLine([[x - 5, deskY - 30], [x - 5, deskY], [x - 34, deskY]], 3, 2, 2);
    inkLine([[x + 70, deskY - 18], [x + 89, deskY - 44]], 2, 1.5, 2);
  });
  inkLine([[-70, -226], [-45, -183], [-10, -226], [25, -183], [62, -226]], 2, 2.2, 2);
  octx.font = "italic 54px Georgia"; octx.textAlign = "center"; octx.fillText("OVERTIME", 128, -135);
  $("#stage-label").textContent = "SUBJECT 01 · OVERTIME OFFICE";
}

function meetingScene() {
  octx.font = "italic 30px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "center"; octx.fillText("MEETING #07 · no conclusion", 0, -220);
  inkLine([[-360, 95], [-250, -85], [255, -85], [370, 95], [250, 190], [-250, 190], [-360, 95]], 6, 3.5, 3);
  hatch(-270, -62, 540, 225, 19, 1.1);
  [[-285,-130],[-95,-145],[100,-145],[290,-125],[-330,20],[330,20]].forEach(([x,y], index) => {
    octx.beginPath(); octx.arc(x, y, 24 + index % 2 * 3, 0, Math.PI * 2); octx.strokeStyle = "#171715"; octx.lineWidth = index % 3 === 0 ? 5 : 2; octx.stroke();
    inkLine([[x - 28, y + 64], [x, y + 27], [x + 30, y + 64]], 3 + index % 2, 3, 2);
  });
  inkRect(-87, -45, 174, 102, 3, 2.6);
  octx.font = "italic 24px Georgia"; octx.fillText("another slide", 0, 5);
  inkLine([[-180,-192],[-150,-218],[-120,-190]], 2, 2, 2);
  inkLine([[185,-193],[215,-220],[245,-190]], 2, 2, 2);
  for (let i = 0; i < 42; i++) {
    octx.fillStyle = `rgba(23,23,21,${.2 + Math.random() * .5})`;
    octx.fillRect(-390 + Math.random() * 780, 220 + Math.random() * 18, 1 + Math.random() * 5, 1 + Math.random() * 2);
  }
  $("#stage-label").textContent = "SUBJECT 02 · ENDLESS MEETING";
}

function workloadScene() {
  inkLine([[-415, 210], [415, 210]], 7, 4, 3);
  const piles = [
    { x: -335, y: 155, count: 5, width: 245 },
    { x: -110, y: 150, count: 8, width: 260 },
    { x: 150, y: 160, count: 6, width: 220 },
  ];
  piles.forEach((pile, pileIndex) => {
    for (let i = 0; i < pile.count; i++) {
      const y = pile.y - i * 42;
      const skew = (i % 3 - 1) * 7;
      inkRect(pile.x + skew, y, pile.width - i % 2 * 18, 35, i % 3 === 0 ? 5 : 2, 2.8);
      if (i % 2) hatch(pile.x + skew + 8, y + 6, pile.width - 30, 23, 16, .8);
      inkLine([[pile.x + skew + 20, y + 13], [pile.x + skew + pile.width * .68, y + 13]], i % 3 === 0 ? 2.5 : 1, 2, 2);
    }
    if (pileIndex === 1) {
      octx.font = "italic 31px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "center"; octx.fillText("URGENT", pile.x + pile.width / 2, pile.y - pile.count * 42 - 12);
    }
  });
  octx.font = "italic 29px Georgia"; octx.textAlign = "left"; octx.fillText("today's workload", -400, -225);
  inkLine([[-398,-210],[-160,-210]], 2, 1.5, 2);
  for (let i = 0; i < 55; i++) {
    const x = -410 + Math.random() * 820; const y = -195 + Math.random() * 380;
    octx.fillStyle = `rgba(23,23,21,${.18 + Math.random() * .42})`;
    octx.beginPath(); octx.arc(x, y, .5 + Math.random() * 1.6, 0, Math.PI * 2); octx.fill();
  }
  $("#stage-label").textContent = "SUBJECT 03 · THE WORKLOAD";
}

function renderPreset(name) {
  resetBurn(false);
  paperBase();
  octx.save();
  octx.translate(450, 310);
  if (name === "office") officeScene();
  else if (name === "meeting") meetingScene();
  else workloadScene();
  octx.restore();
  sourceImage = null;
  startDrawLoop();
}

function renderUploadPlaceholder() {
  resetBurn(false); paperBase();
  octx.strokeStyle = "#747169"; octx.setLineDash([9, 10]); octx.lineWidth = 2; octx.strokeRect(250, 150, 400, 320); octx.setLineDash([]);
  octx.font = "italic 34px Georgia"; octx.fillStyle = "#55534d"; octx.textAlign = "center"; octx.fillText("your image, your ritual", 450, 290);
  octx.font = "16px Segoe Print"; octx.fillText("왼쪽에서 이미지를 골라주세요", 450, 335);
  $("#stage-label").textContent = "SUBJECT · YOUR IMAGE";
  startDrawLoop();
}

const uploadZone = $("#upload-zone");
uploadZone.addEventListener("click", () => $("#file-input").click());
$("#file-input").addEventListener("change", (event) => loadFile(event.target.files[0]));
["dragenter", "dragover"].forEach((type) => uploadZone.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.add("dragging"); }));
["dragleave", "drop"].forEach((type) => uploadZone.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.remove("dragging"); }));
uploadZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files[0]));

function loadFile(file) {
  if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return showToast("10MB 이하의 이미지 파일을 골라주세요.");
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      resetBurn(false); paperBase(); sourceImage = image;
      const scale = Math.min(820 / image.width, 540 / image.height);
      const width = image.width * scale, height = image.height * scale;
      octx.drawImage(image, (900 - width) / 2, (620 - height) / 2, width, height);
      octx.strokeStyle = "#171715"; octx.lineWidth = 4; octx.strokeRect((900 - width) / 2, (620 - height) / 2, width, height);
      $("#stage-label").textContent = `SUBJECT · ${file.name.slice(0, 24).toUpperCase()}`;
      startDrawLoop(); showToast("준비됐어요. 불꽃으로 활활 태워보세요.");
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
}

function addParticle(x, y, power = 1) {
  particles.push({
    x: x + (Math.random() - .5) * 18 * power,
    y,
    vx: (Math.random() - .5) * (2.4 + power),
    vy: -Math.random() * (3.6 + power * 1.3) - 1,
    life: 34 + Math.random() * (38 + power * 12),
    ember: Math.random() > .3,
  });
}

function igniteAt(point, power = 1, burst = false) {
  const count = burst ? Math.min(2 + Math.floor(power * 1.4), 7) : 1;
  for (let index = 0; index < count; index++) {
    const spread = burst ? 11 + power * 7 : 0;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread;
    const x = point.x + Math.cos(angle) * distance;
    const y = point.y + Math.sin(angle) * distance;
    burnPoints.push({
      x, y,
      radius: 8 + power * 2,
      maxRadius: 62 + Math.random() * 30 + power * 12,
      life: 0,
      seed: Math.random() * 900,
      phase: Math.random() * Math.PI * 2,
      power,
    });
  }
  const sparks = burst ? Math.min(12 + Math.floor(power * 9), 42) : 6;
  for (let i = 0; i < sparks; i++) addParticle(point.x, point.y, power);
  if (particles.length > 160) particles.splice(0, particles.length - 160);
}

const wrap = $("#canvas-wrap");
wrap.addEventListener("pointerenter", () => $("#fire-cursor").style.opacity = 1);
wrap.addEventListener("pointerleave", () => { $("#fire-cursor").style.opacity = 0; burning = false; lastPoint = null; });
wrap.addEventListener("pointermove", (event) => {
  const rect = wrap.getBoundingClientRect();
  const cursor = $("#fire-cursor");
  cursor.style.left = `${event.clientX - rect.left - 21}px`; cursor.style.top = `${event.clientY - rect.top - 40}px`;
  if (!burning || completed) return;
  const point = canvasPoint(event);
  if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) > 14) {
    igniteAt(point, 1, false);
    lastPoint = point;
  }
});
wrap.addEventListener("pointerdown", (event) => {
  if (completed) return;
  wrap.setPointerCapture(event.pointerId); burning = true; lastPoint = null;
  const point = canvasPoint(event);
  const now = performance.now();
  const repeated = now - ignitionCombo.time < 520 && Math.hypot(point.x - ignitionCombo.x, point.y - ignitionCombo.y) < 82;
  ignitionCombo.count = repeated ? Math.min(ignitionCombo.count + 1, 6) : 1;
  ignitionCombo.time = now; ignitionCombo.x = point.x; ignitionCombo.y = point.y;
  const power = 1 + (ignitionCombo.count - 1) * .48;
  igniteAt(point, power, true);
  comboMessage = ignitionCombo.count > 1 ? `연속 ${ignitionCombo.count}번 점화 — 불길이 더 거세졌어요.` : "불이 붙었어요. 같은 곳을 연속 클릭하면 더 크게 타올라요.";
  comboMessageUntil = now + 920;
  $("#burn-status").textContent = comboMessage;
  $("#fire-cursor").classList.add("lit"); $("#stage-hint").style.opacity = 0;
  ensureAudio();
});
wrap.addEventListener("pointerup", (event) => { burning = false; lastPoint = null; $("#fire-cursor").classList.remove("lit"); if (wrap.hasPointerCapture(event.pointerId)) wrap.releasePointerCapture(event.pointerId); });

function startDrawLoop() {
  if (renderLoopStarted) return;
  renderLoopStarted = true;
  requestAnimationFrame(drawFrame);
}

function organicPath(target, point, radius, detail = 16, append = false) {
  if (!append) target.beginPath();
  for (let i = 0; i <= detail; i++) {
    const angle = (i / detail) * Math.PI * 2;
    const warp = 1 + Math.sin(angle * 3 + point.seed) * .15 + Math.sin(angle * 7 + point.seed * .37) * .08 + Math.sin(angle * 11 + point.seed * 1.7) * .035;
    const stretch = 1 + Math.sin(angle + point.phase) * .08;
    const x = point.x + Math.cos(angle) * radius * warp;
    const y = point.y + Math.sin(angle) * radius * warp * stretch;
    if (i === 0) target.moveTo(x, y); else target.lineTo(x, y);
  }
  target.closePath();
}

function drawBurnDamage() {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.beginPath();
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius + 16, 10, true);
  });
  ctx.fillStyle = "rgba(142,78,25,.22)";
  ctx.fill();
  ctx.beginPath();
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius + 7, 10, true);
  });
  ctx.fillStyle = "rgba(61,32,15,.82)";
  ctx.fill();
  ctx.beginPath();
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius, 10, true);
  });
  ctx.fillStyle = "rgba(15,12,9,.97)";
  ctx.fill();

  ctx.globalAlpha = .42;
  ctx.fillStyle = "#050403";
  burnPoints.forEach((point) => {
    for (let i = 0; i < 1; i++) {
      const angle = point.seed + i * 2.399;
      const distance = point.radius * (.72 + (i % 2) * .18);
      const size = 1 + ((point.seed + i * 7) % 3.5);
      ctx.beginPath();
      ctx.ellipse(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, size * 1.9, size, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  ctx.beginPath();
  burnPoints.forEach((point) => {
    if (point.radius <= 13) return;
    organicPath(ctx, point, point.radius - 9, 10, true);
  });
  ctx.fill();
  ctx.restore();
}

function flamePath(target, x, y, width, height, lean, flicker) {
  target.beginPath();
  target.moveTo(x - width * .52, y + 2);
  target.bezierCurveTo(x - width * .82, y - height * .28, x - width * .18 + lean, y - height * .76, x + lean + flicker, y - height);
  target.bezierCurveTo(x + width * .24 + lean, y - height * .63, x + width * .86, y - height * .24, x + width * .52, y + 2);
  target.quadraticCurveTo(x, y - height * .12, x - width * .52, y + 2);
  target.closePath();
}

function drawLivingFire(point, index, time) {
  if (point.radius < 14 || point.life > 132 || index % 2) return;
  const power = Math.min(point.power || 1, 3.4);
  const angle = -Math.PI / 2 + Math.sin(point.seed) * .92;
  const edgeX = point.x + Math.cos(angle) * point.radius * .82;
  const edgeY = point.y + Math.sin(angle) * point.radius * .72;
  const flicker = Math.sin(time * .012 + point.phase) * 8;
  const height = (46 + (point.seed % 45) + Math.sin(time * .019 + point.seed) * 15) * (1 + (power - 1) * .2);
  const width = (18 + (point.seed % 16)) * (1 + (power - 1) * .14);
  const lean = Math.sin(time * .007 + point.seed) * 16;

  fctx.save();
  fctx.globalCompositeOperation = "source-over";
  fctx.shadowBlur = 0;
  flamePath(fctx, edgeX, edgeY, width, height, lean, flicker);
  fctx.fillStyle = "#e92b12";
  fctx.fill();

  flamePath(fctx, edgeX + lean * .12, edgeY + 1, width * .72, height * .77, lean * .42, flicker * .18);
  fctx.fillStyle = "#ff7900";
  fctx.fill();

  flamePath(fctx, edgeX + lean * .14, edgeY + 2, width * .37, height * .53, lean * .24, flicker * .08);
  fctx.fillStyle = "#ffd32a";
  fctx.fill();

  if (index % 4 === 0) {
    const sideX = edgeX + Math.sin(point.seed) * 26;
    const sideHeight = height * (.58 + Math.sin(time * .013 + point.seed) * .12);
    flamePath(fctx, sideX, edgeY + 4, width * .66, sideHeight, -lean * .45, -flicker * .35);
    fctx.fillStyle = "#ff5b00";
    fctx.fill();
  }
  fctx.restore();
}

function updateCoverage() {
  if (++coverageTick % 10 !== 0) return;
  coverageCtx.setTransform(1, 0, 0, 1, 0, 0);
  coverageCtx.clearRect(0, 0, coverage.width, coverage.height);
  coverageCtx.save();
  coverageCtx.setTransform(.2, 0, 0, .2, 0, 0);
  coverageCtx.fillStyle = "#fff";
  coverageCtx.beginPath();
  burnPoints.forEach((point) => {
    if (point.radius <= 12) return;
    organicPath(coverageCtx, point, point.radius - 9, 8, true);
  });
  coverageCtx.fill();
  coverageCtx.restore();
  const pixels = coverageCtx.getImageData(0, 0, coverage.width, coverage.height).data;
  let covered = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) covered++;
  burnPercent = Math.min(100, Math.round(covered / (coverage.width * coverage.height) * 100));
}

function drawFrame(time) {
  if (time - lastFrameAt < 22) { requestAnimationFrame(drawFrame); return; }
  lastFrameAt = time;
  ctx.clearRect(0, 0, 900, 620);
  ctx.drawImage(original, 0, 0);
  drawBurnDamage();
  fctx.clearRect(0, 0, 900, 620);
  burnPoints.forEach((point) => {
    point.life += burning ? .82 : .24;
    point.radius = Math.min(point.maxRadius, point.radius + (burning ? .58 : .22));
    if (point.radius > 16 && point.life < 108 && (burning || (point.power || 1) > 1.2) && Math.random() > .9) addParticle(point.x, point.y - point.radius * .2, Math.min(point.power || 1, 2.4));
  });
  const livePoints = burnPoints.filter((point) => point.radius >= 14 && point.life <= 132);
  const flameStride = Math.max(1, Math.ceil(livePoints.length / 22));
  livePoints.forEach((point, index) => {
    if (index % flameStride === 0 || (point.power || 1) > 1.7) drawLivingFire(point, index, time);
  });
  if (particles.length > 160) particles.splice(0, particles.length - 160);
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vx *= .992; p.vy -= .018; p.life--;
    fctx.globalAlpha = Math.min(1, p.life / 20);
    fctx.fillStyle = p.ember && p.life > 17 ? (p.life % 3 > 1 ? "#ffb000" : "#ff4d00") : "#221a15";
    fctx.shadowBlur = 0;
    fctx.beginPath(); fctx.ellipse(p.x, p.y, p.ember ? 2.2 : 2.7, p.ember ? 4.1 : 1.5, p.vx, 0, Math.PI * 2); fctx.fill();
  });
  fctx.globalAlpha = 1;
  updateCoverage();
  $("#burn-percent").textContent = `${burnPercent}% BURNED`;
  if (time > comboMessageUntil) $("#burn-status").textContent = burnPercent ? (burnPercent < 75 ? "종이가 검게 그을리며 타들어가고 있어요." : "거의 다 놓아주었어요.") : "아직 아무것도 타지 않았어요.";
  if (burnPercent >= 96 && !completed) finishBurn();
  requestAnimationFrame(drawFrame);
}

function finishBurn() {
  completed = true; burning = false; $("#fire-cursor").classList.remove("lit");
  const subject = currentMode === "upload" ? "내 이미지" : { office: "야근 사무실", meeting: "끝없는 회의", workload: "쌓인 업무" }[currentPreset];
  history.unshift({ subject, date: new Date().toISOString(), by: user.nickname }); history = history.slice(0, 6);
  localStorage.setItem(historyKey, JSON.stringify(history)); renderHistory();
  $("#burn-status").textContent = "다 탔어요. 이제 조금 가벼워졌기를.";
  showToast("재만 남았습니다.");
}

function resetBurn(show = true) {
  burnPoints = []; particles = []; burnPercent = 0; coverageTick = 0; completed = false; burning = false; lastPoint = null; ignitionCombo = { count: 0, time: 0, x: 0, y: 0 }; comboMessage = ""; comboMessageUntil = 0;
  coverageCtx.setTransform(1, 0, 0, 1, 0, 0);
  coverageCtx.clearRect(0, 0, coverage.width, coverage.height);
  $("#stage-hint").style.opacity = 1;
  if (show) showToast("새 종이를 꺼냈어요.");
}
$("#reset-button").addEventListener("click", () => resetBurn());

function renderHistory() {
  const list = $("#history-list");
  if (!history.length) { list.innerHTML = '<li class="history-empty">아직 남은 재가 없습니다. 첫 번째 대상을 태워보세요.</li>'; return; }
  list.innerHTML = history.map((item) => `<li><strong>${escapeHtml(item.subject)}</strong><time>${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.date))}</time><span>${escapeHtml(item.by)}의 기록</span></li>`).join("");
}
function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }

function ensureAudio() {
  if (muted) return;
  if (audio) { audio.context.resume(); return; }
  const context = new AudioContext();
  const bufferSize = context.sampleRate * 2;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; last = last * .985 + white * .015; data[i] = last * 3.4; }
  const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = context.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 1050; filter.Q.value = .7;
  const gain = context.createGain(); gain.gain.value = .20;
  source.connect(filter).connect(gain).connect(context.destination); source.start();
  const crack = setInterval(() => {
    if (!burning || muted) return;
    const osc = context.createOscillator(); const click = context.createGain();
    osc.type = "sawtooth"; osc.frequency.value = 700 + Math.random() * 1600;
    click.gain.setValueAtTime(.035, context.currentTime); click.gain.exponentialRampToValueAtTime(.001, context.currentTime + .025);
    osc.connect(click).connect(context.destination); osc.start(); osc.stop(context.currentTime + .03);
  }, 110);
  audio = { context, gain, crack };
}

$("#sound-button").addEventListener("click", () => {
  muted = !muted;
  const button = $("#sound-button"); button.setAttribute("aria-pressed", String(!muted));
  button.setAttribute("aria-label", muted ? "불소리 켜기" : "불소리 끄기");
  $(".sound-label").textContent = muted ? "SOUND OFF" : "SOUND ON";
  if (audio) audio.gain.gain.setTargetAtTime(muted ? 0 : .20, audio.context.currentTime, .04);
  else if (!muted) ensureAudio();
  showToast(muted ? "불소리를 껐어요." : "불소리를 켰어요.");
});

let toastTimer;
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); }

renderHistory();

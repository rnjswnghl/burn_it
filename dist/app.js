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
let ignitionPoints = [];
let hoveredIgnition = -1;
let infernoActive = false;
let infernoStarted = 0;
let lastInfernoBurst = 0;
let infernoBounds = { x: 140, y: 120, width: 620, height: 410 };

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

function drawPlayer(x, groundY) {
  octx.save();
  octx.beginPath(); octx.arc(x, groundY - 58, 10, 0, Math.PI * 2); octx.fillStyle = "#171715"; octx.fill();
  inkLine([[x, groundY - 47], [x, groundY - 18]], 5, 1.5, 2);
  inkLine([[x, groundY - 39], [x - 18, groundY - 22]], 4, 1.5, 2);
  inkLine([[x, groundY - 38], [x + 22, groundY - 29]], 4, 1.5, 2);
  inkLine([[x, groundY - 18], [x - 17, groundY]], 5, 1.5, 2);
  inkLine([[x, groundY - 18], [x + 20, groundY]], 5, 1.5, 2);
  octx.font = "bold 10px Arial"; octx.textAlign = "center"; octx.fillText("YOU", x, groundY + 18);
  octx.restore();
}

function officeScene() {
  inkLine([[-420, 225], [420, 225]], 5, 2.2, 3);
  inkRect(-320, -225, 640, 445, 5, 2.7);
  inkLine([[-320, -160], [320, -160]], 3, 2, 2);
  octx.font = "italic 31px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "center"; octx.fillText("OVERTIME OFFICE · 21:47", 0, -181);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 6; column++) {
      const x = -280 + column * 101;
      const y = -125 + row * 102;
      inkRect(x, y, 67, 60, (row + column) % 4 === 0 ? 3 : 1.4, 2);
      if ((row + column) % 3 === 0) hatch(x + 5, y + 5, 57, 50, 14, .7);
    }
  }
  inkRect(-62, 122, 124, 98, 5, 2.4);
  inkLine([[0, 122], [0, 220]], 2, 1.4, 2);
  inkLine([[-365, -222], [-320, -260], [-270, -222]], 2, 2, 2);
  drawPlayer(-380, 220);
  setIgnitionPoints([[205, 480], [350, 365], [548, 462], [705, 324]], { x: 130, y: 80, width: 640, height: 450 });
  $("#stage-label").textContent = "STAGE 01 · OVERTIME OFFICE";
}

function meetingScene() {
  inkLine([[-420, 225], [420, 225]], 5, 2.2, 3);
  inkRect(-355, -105, 710, 325, 4, 2.5);
  inkLine([[-385, -105], [0, -248], [385, -105]], 5, 3, 3);
  inkRect(-75, -224, 150, 119, 3, 2);
  octx.beginPath(); octx.arc(0, -168, 32, 0, Math.PI * 2); octx.strokeStyle = "#171715"; octx.lineWidth = 3; octx.stroke();
  inkLine([[0, -168], [0, -190], [17, -168]], 2, 1.5, 2);
  for (let column = 0; column < 7; column++) {
    const x = -320 + column * 104;
    inkRect(x, -62, 70, 64, column % 3 === 0 ? 3 : 1.2, 2);
    inkRect(x, 45, 70, 64, column % 2 === 0 ? 2.6 : 1.2, 2);
  }
  inkRect(-58, 118, 116, 102, 5, 2.5);
  octx.font = "italic 29px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "center"; octx.fillText("SCHOOL MAIN HALL", 0, 196);
  drawPlayer(-400, 220);
  setIgnitionPoints([[165, 445], [315, 365], [452, 492], [620, 367], [755, 452]], { x: 90, y: 62, width: 720, height: 475 });
  $("#stage-label").textContent = "STAGE 02 · SCHOOL MAIN HALL";
}

function workloadScene() {
  inkLine([[-420, 225], [420, 225]], 6, 3, 3);
  inkRect(-345, -125, 590, 345, 5, 3);
  inkLine([[245, -125], [360, -38], [360, 220], [245, 220]], 4, 2.5, 3);
  inkRect(-300, -78, 130, 92, 2, 2);
  inkRect(-120, -78, 130, 92, 4, 2.6);
  inkRect(60, -78, 130, 92, 2, 2);
  inkRect(-300, 58, 130, 92, 4, 2.6);
  inkRect(-120, 58, 130, 92, 2, 2);
  inkRect(60, 58, 130, 92, 4, 2.6);
  hatch(-292, -70, 114, 76, 13, .8);
  hatch(-112, 66, 114, 76, 13, .8);
  inkLine([[-310, -126], [-310, -248], [-250, -248], [-250, -126]], 7, 3, 3);
  inkLine([[-280, -248], [-280, -286]], 4, 2, 2);
  inkLine([[275, -34], [330, -34], [330, 10], [275, 10]], 2, 1.6, 2);
  octx.font = "italic 31px Georgia"; octx.fillStyle = "#171715"; octx.textAlign = "center"; octx.fillText("CORPORATE LAB · BLOCK C", -48, 198);
  drawPlayer(-398, 220);
  setIgnitionPoints([[150, 440], [294, 322], [432, 470], [570, 325], [695, 440], [775, 270]], { x: 92, y: 48, width: 720, height: 490 });
  $("#stage-label").textContent = "STAGE 03 · CORPORATE LAB";
}

function setIgnitionPoints(points, bounds) {
  ignitionPoints = points.map(([x, y], index) => ({ x, y, index, lit: false }));
  infernoBounds = bounds;
  updateIgnitionProgress();
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
  setIgnitionPoints([[250, 230], [650, 230], [320, 435], [580, 435]], { x: 170, y: 110, width: 560, height: 400 });
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
      setIgnitionPoints([
        [(900 - width) / 2 + width * .22, (620 - height) / 2 + height * .28],
        [(900 - width) / 2 + width * .76, (620 - height) / 2 + height * .28],
        [(900 - width) / 2 + width * .32, (620 - height) / 2 + height * .72],
        [(900 - width) / 2 + width * .68, (620 - height) / 2 + height * .72],
      ], { x: (900 - width) / 2, y: (620 - height) / 2, width, height });
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
wrap.addEventListener("pointermove", (event) => {
  const point = canvasPoint(event);
  hoveredIgnition = ignitionPoints.findIndex((target) => !target.lit && Math.hypot(point.x - target.x, point.y - target.y) < 48);
  wrap.classList.toggle("targeting", hoveredIgnition >= 0);
});
wrap.addEventListener("pointerdown", (event) => {
  if (completed) return;
  const point = canvasPoint(event);
  const index = ignitionPoints.findIndex((target) => !target.lit && Math.hypot(point.x - target.x, point.y - target.y) < 54);
  if (index < 0) {
    $("#burn-status").textContent = "주황색 원으로 표시된 점화 포인트를 클릭하세요.";
    return;
  }
  igniteTarget(index);
});
wrap.addEventListener("pointerleave", () => { hoveredIgnition = -1; wrap.classList.remove("targeting"); });

function igniteTarget(index) {
  const target = ignitionPoints[index];
  if (!target || target.lit || completed) return;
  target.lit = true;
  burning = true;
  igniteAt(target, 2.35, true);
  setTimeout(() => { if (!infernoActive) burning = false; }, 260);
  ensureAudio();
  updateIgnitionProgress();
  if (ignitionPoints.every((point) => point.lit)) startInferno();
}

function updateIgnitionProgress() {
  const lit = ignitionPoints.filter((point) => point.lit).length;
  $("#burn-percent").textContent = `${lit} / ${ignitionPoints.length || 0} LIT`;
  if (!infernoActive && !completed) $("#burn-status").textContent = lit ? `${lit}곳 점화 완료. 남은 포인트를 찾으세요.` : "아직 불이 붙지 않았어요. 주황색 포인트를 찾으세요.";
}

function startInferno() {
  infernoActive = true;
  burning = true;
  infernoStarted = performance.now();
  lastInfernoBurst = 0;
  $("#stage-hint").textContent = "모든 지점 점화 완료 · 건물이 타오릅니다";
  $("#stage-hint").style.opacity = 1;
  $("#burn-status").textContent = "모든 지점에 불이 붙었습니다. 잠시 불멍하세요.";
}

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

function drawIgnitionMarkers(time) {
  if (completed || (infernoActive && time - infernoStarted > 650)) return;
  ignitionPoints.forEach((point, index) => {
    fctx.save();
    const hovered = index === hoveredIgnition;
    const pulse = 1 + Math.sin(time * .006 + index) * .09;
    fctx.translate(point.x, point.y);
    fctx.scale(hovered ? 1.18 : pulse, hovered ? 1.18 : pulse);
    fctx.lineWidth = point.lit ? 3 : 2.5;
    fctx.strokeStyle = point.lit ? "#171715" : "#ff5b00";
    fctx.fillStyle = point.lit ? "#ff7900" : "rgba(255,255,255,.92)";
    fctx.beginPath(); fctx.arc(0, 0, 17, 0, Math.PI * 2); fctx.fill(); fctx.stroke();
    if (point.lit) {
      fctx.fillStyle = "#171715";
      fctx.font = "bold 17px Arial"; fctx.textAlign = "center"; fctx.textBaseline = "middle"; fctx.fillText("✓", 0, 1);
    } else {
      fctx.strokeStyle = "#ff5b00"; fctx.lineWidth = 2;
      fctx.beginPath(); fctx.moveTo(-25, 0); fctx.lineTo(-9, 0); fctx.moveTo(9, 0); fctx.lineTo(25, 0); fctx.moveTo(0, -25); fctx.lineTo(0, -9); fctx.moveTo(0, 9); fctx.lineTo(0, 25); fctx.stroke();
      fctx.fillStyle = "#ff5b00"; fctx.font = "bold 11px Arial"; fctx.textAlign = "center"; fctx.textBaseline = "middle"; fctx.fillText(String(index + 1), 0, 1);
    }
    fctx.restore();
  });
}

function updateInferno(time) {
  if (!infernoActive) return;
  const elapsed = time - infernoStarted;
  if (elapsed < 2500 && time - lastInfernoBurst > 115) {
    lastInfernoBurst = time;
    for (let index = 0; index < 4; index++) {
      const x = infernoBounds.x + Math.random() * infernoBounds.width;
      const verticalBias = Math.pow(Math.random(), .7);
      const y = infernoBounds.y + infernoBounds.height * (.25 + verticalBias * .72);
      igniteAt({ x, y }, 1.65 + Math.random() * .55, false);
    }
  }
  if (elapsed >= 3200 && !completed) finishBurn();
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
  updateInferno(time);
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
  drawIgnitionMarkers(time);
  updateCoverage();
  requestAnimationFrame(drawFrame);
}

function finishBurn() {
  completed = true; burning = false; infernoActive = false;
  const subject = currentMode === "upload" ? "내 이미지" : { office: "야근 오피스", meeting: "학교 본관", workload: "회사 연구동" }[currentPreset];
  history.unshift({ subject, date: new Date().toISOString(), by: user.nickname }); history = history.slice(0, 6);
  localStorage.setItem(historyKey, JSON.stringify(history)); renderHistory();
  $("#burn-status").textContent = "건물이 활활 타오릅니다. 스테이지 클리어.";
  $("#stage-hint").style.opacity = 0;
  $("#stage-clear").hidden = false;
  showToast("모든 점화 포인트 완료. 스테이지 클리어.");
}

function resetBurn(show = true) {
  burnPoints = []; particles = []; burnPercent = 0; coverageTick = 0; completed = false; burning = false; infernoActive = false; hoveredIgnition = -1; lastPoint = null; ignitionCombo = { count: 0, time: 0, x: 0, y: 0 }; comboMessage = ""; comboMessageUntil = 0;
  ignitionPoints.forEach((point) => { point.lit = false; });
  coverageCtx.setTransform(1, 0, 0, 1, 0, 0);
  coverageCtx.clearRect(0, 0, coverage.width, coverage.height);
  $("#stage-clear").hidden = true;
  $("#stage-hint").textContent = "주황색 점화 포인트를 모두 찾아 클릭하세요";
  $("#stage-hint").style.opacity = 1;
  updateIgnitionProgress();
  if (show) showToast("점화 포인트를 다시 배치했습니다.");
}
$("#reset-button").addEventListener("click", () => resetBurn());

$("#next-stage-button").addEventListener("click", () => {
  const order = ["office", "meeting", "workload"];
  const next = currentMode === "preset" ? order[(order.indexOf(currentPreset) + 1) % order.length] : "office";
  if (currentMode !== "preset") switchMode("preset");
  const button = $(`.preset[data-preset="${next}"]`);
  if (button) button.click();
  window.scrollTo({ top: $("#game-screen").offsetTop, behavior: "smooth" });
});

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

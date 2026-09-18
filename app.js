const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const adjectives = ["고요한", "단단한", "느긋한", "새벽의", "용감한", "가벼운", "반짝이는", "무심한", "따뜻한", "엉뚱한"];
const nouns = ["성냥", "잿가루", "모닥불", "종이학", "고양이", "연기", "부싯돌", "달빛", "장작", "불씨"];
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
let currentPreset = "deadline";
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
  renderPreset("deadline");
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
  octx.fillStyle = "#e9e6dc";
  octx.fillRect(0, 0, original.width, original.height);
  octx.strokeStyle = "rgba(25,25,22,.10)";
  octx.lineWidth = 1;
  for (let y = 24; y < 620; y += 27) {
    octx.beginPath(); octx.moveTo(0, y); octx.lineTo(900, y); octx.stroke();
  }
  for (let i = 0; i < 500; i++) {
    const shade = Math.floor(Math.random() * 50 + 120);
    octx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * .08})`;
    octx.fillRect(Math.random() * 900, Math.random() * 620, Math.random() * 2 + .3, Math.random() * 2 + .3);
  }
}

function inkLine(points, width = 4) {
  octx.beginPath();
  points.forEach(([x, y], index) => index ? octx.lineTo(x, y) : octx.moveTo(x, y));
  octx.strokeStyle = "#1c1c19"; octx.lineWidth = width; octx.lineCap = "round"; octx.lineJoin = "round"; octx.stroke();
}

function renderPreset(name) {
  resetBurn(false);
  paperBase();
  octx.save();
  octx.translate(450, 310);
  if (name === "deadline") {
    octx.strokeStyle = "#1c1c19"; octx.lineWidth = 5; octx.strokeRect(-190, -128, 380, 256);
    octx.font = "italic 42px Georgia"; octx.textAlign = "center"; octx.fillStyle = "#1c1c19"; octx.fillText("DUE YESTERDAY", 0, -55);
    octx.font = "140px Georgia"; octx.fillText("23:59", 0, 65);
    inkLine([[-170, 92], [170, 92]], 3);
    $("#stage-label").textContent = "SUBJECT 01 · DEADLINE";
  } else if (name === "worry") {
    for (let i = 0; i < 34; i++) {
      octx.beginPath(); octx.arc(Math.cos(i) * i * 5, Math.sin(i * 1.8) * i * 3, 18 + i * 2, 0, Math.PI * 1.7); octx.strokeStyle = `rgba(28,28,25,${.18 + i / 65})`; octx.lineWidth = 2; octx.stroke();
    }
    octx.font = "italic 46px Georgia"; octx.textAlign = "center"; octx.fillStyle = "#1c1c19"; octx.fillText("WHAT IF?", 0, 15);
    $("#stage-label").textContent = "SUBJECT 02 · WORRY";
  } else {
    octx.rotate(-.035); octx.strokeStyle = "#1c1c19"; octx.lineWidth = 4; octx.strokeRect(-220, -120, 440, 240);
    octx.font = "22px Segoe Print"; octx.fillStyle = "#1c1c19"; octx.textAlign = "left";
    octx.fillText("읽지 않은 메시지  1", -180, -65); inkLine([[-180,-40],[170,-40]], 2);
    octx.font = "italic 34px Georgia"; octx.fillText("우리 얘기 좀 하자.", -180, 20);
    octx.font = "18px Segoe Print"; octx.fillStyle = "#6a6861"; octx.fillText("오후 11:47", 95, 82);
    $("#stage-label").textContent = "SUBJECT 03 · THE MESSAGE";
  }
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
      startDrawLoop(); showToast("준비됐어요. 성냥으로 문질러보세요.");
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
}

const wrap = $("#canvas-wrap");
wrap.addEventListener("pointerenter", () => $("#match-cursor").style.opacity = 1);
wrap.addEventListener("pointerleave", () => { $("#match-cursor").style.opacity = 0; burning = false; lastPoint = null; });
wrap.addEventListener("pointermove", (event) => {
  const rect = wrap.getBoundingClientRect();
  const cursor = $("#match-cursor");
  cursor.style.left = `${event.clientX - rect.left - 54}px`; cursor.style.top = `${event.clientY - rect.top}px`;
  if (!burning || completed) return;
  const point = canvasPoint(event);
  if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) > 6) {
    burnPoints.push({ ...point, radius: 6, maxRadius: 58 + Math.random() * 30, life: 0, seed: Math.random() * 900, phase: Math.random() * Math.PI * 2 });
    for (let i = 0; i < 4; i++) particles.push({ x: point.x, y: point.y, vx: (Math.random() - .5) * 2.3, vy: -Math.random() * 3.3 - .8, life: 35 + Math.random() * 42, ember: Math.random() > .42 });
    lastPoint = point;
  }
});
wrap.addEventListener("pointerdown", (event) => {
  if (completed) return;
  wrap.setPointerCapture(event.pointerId); burning = true; lastPoint = null;
  $("#match-cursor").classList.add("lit"); $("#stage-hint").style.opacity = 0;
  ensureAudio();
});
wrap.addEventListener("pointerup", (event) => { burning = false; lastPoint = null; $("#match-cursor").classList.remove("lit"); if (wrap.hasPointerCapture(event.pointerId)) wrap.releasePointerCapture(event.pointerId); });

function startDrawLoop() {
  if (renderLoopStarted) return;
  renderLoopStarted = true;
  requestAnimationFrame(drawFrame);
}

function organicPath(target, point, radius, detail = 38) {
  target.beginPath();
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
  ctx.filter = "blur(5px)";
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius + 16);
    ctx.fillStyle = "rgba(142,78,25,.22)";
    ctx.fill();
  });
  ctx.filter = "none";
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius + 7);
    ctx.fillStyle = "rgba(61,32,15,.82)";
    ctx.fill();
  });
  burnPoints.forEach((point) => {
    organicPath(ctx, point, point.radius);
    ctx.fillStyle = "rgba(15,12,9,.97)";
    ctx.fill();
  });

  ctx.globalAlpha = .42;
  ctx.fillStyle = "#050403";
  burnPoints.forEach((point) => {
    for (let i = 0; i < 5; i++) {
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
  burnPoints.forEach((point) => {
    if (point.radius <= 13) return;
    organicPath(ctx, point, point.radius - 9);
    ctx.fill();
  });
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
  if (point.radius < 17 || point.life > 78 || index % 6) return;
  const angle = -Math.PI / 2 + Math.sin(point.seed) * .92;
  const edgeX = point.x + Math.cos(angle) * point.radius * .82;
  const edgeY = point.y + Math.sin(angle) * point.radius * .72;
  const flicker = Math.sin(time * .012 + point.phase) * 8;
  const height = 27 + (point.seed % 31) + Math.sin(time * .019 + point.seed) * 9;
  const width = 12 + (point.seed % 10);
  const lean = Math.sin(time * .007 + point.seed) * 10;

  fctx.save();
  fctx.globalCompositeOperation = "lighter";
  fctx.shadowColor = "rgba(255,82,0,.8)";
  fctx.shadowBlur = 18;
  flamePath(fctx, edgeX, edgeY, width, height, lean, flicker);
  const flame = fctx.createLinearGradient(edgeX, edgeY, edgeX, edgeY - height);
  flame.addColorStop(0, "rgba(190,24,0,.9)");
  flame.addColorStop(.3, "rgba(255,76,0,.98)");
  flame.addColorStop(.72, "rgba(255,170,25,.94)");
  flame.addColorStop(1, "rgba(255,222,104,.08)");
  fctx.fillStyle = flame;
  fctx.fill();

  flamePath(fctx, edgeX + lean * .18, edgeY, width * .38, height * .62, lean * .35, flicker * .2);
  const core = fctx.createLinearGradient(edgeX, edgeY, edgeX, edgeY - height * .62);
  core.addColorStop(0, "rgba(255,245,190,.96)");
  core.addColorStop(.55, "rgba(255,183,45,.82)");
  core.addColorStop(1, "rgba(255,130,0,0)");
  fctx.fillStyle = core;
  fctx.fill();
  fctx.restore();
}

function updateCoverage() {
  coverageCtx.save();
  coverageCtx.setTransform(.2, 0, 0, .2, 0, 0);
  coverageCtx.fillStyle = "#fff";
  burnPoints.forEach((point) => {
    if (point.radius <= 12) return;
    organicPath(coverageCtx, point, point.radius - 9);
    coverageCtx.fill();
  });
  coverageCtx.restore();
  if (++coverageTick % 12 !== 0) return;
  const pixels = coverageCtx.getImageData(0, 0, coverage.width, coverage.height).data;
  let covered = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) covered++;
  burnPercent = Math.min(100, Math.round(covered / (coverage.width * coverage.height) * 100));
}

function drawFrame() {
  ctx.clearRect(0, 0, 900, 620);
  ctx.drawImage(original, 0, 0);
  drawBurnDamage();
  fctx.clearRect(0, 0, 900, 620);
  const time = performance.now();
  burnPoints.forEach((point, index) => {
    point.life += burning ? 1 : .34;
    point.radius = Math.min(point.maxRadius, point.radius + (burning ? .48 : .17));
    if (point.radius > 19 && point.life < 100 && Math.random() > .91) particles.push({ x: point.x + (Math.random() - .5) * point.radius * 1.4, y: point.y - point.radius * .25, vx: (Math.random() - .5) * 1.7, vy: -Math.random() * 2.5, life: 30 + Math.random() * 46, ember: Math.random() > .48 });
    drawLivingFire(point, index, time);
  });
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vx *= .992; p.vy -= .018; p.life--;
    fctx.globalAlpha = Math.min(1, p.life / 20);
    fctx.fillStyle = p.ember && p.life > 17 ? "#ff7a00" : "#221a15";
    fctx.beginPath(); fctx.ellipse(p.x, p.y, p.ember ? 1.7 : 2.4, p.ember ? 2.6 : 1.2, p.vx, 0, Math.PI * 2); fctx.fill();
  });
  fctx.globalAlpha = 1;
  updateCoverage();
  $("#burn-percent").textContent = `${burnPercent}% BURNED`;
  $("#burn-status").textContent = burnPercent ? (burnPercent < 75 ? "종이가 검게 그을리며 타들어가고 있어요." : "거의 다 놓아주었어요.") : "아직 아무것도 타지 않았어요.";
  if (burnPercent >= 96 && !completed) finishBurn();
  requestAnimationFrame(drawFrame);
}

function finishBurn() {
  completed = true; burning = false; $("#match-cursor").classList.remove("lit");
  const subject = currentMode === "upload" ? "내 이미지" : { deadline: "마감", worry: "걱정", message: "그 메시지" }[currentPreset];
  history.unshift({ subject, date: new Date().toISOString(), by: user.nickname }); history = history.slice(0, 6);
  localStorage.setItem(historyKey, JSON.stringify(history)); renderHistory();
  $("#burn-status").textContent = "다 탔어요. 이제 조금 가벼워졌기를.";
  showToast("재만 남았습니다.");
}

function resetBurn(show = true) {
  burnPoints = []; particles = []; burnPercent = 0; coverageTick = 0; completed = false; burning = false; lastPoint = null;
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

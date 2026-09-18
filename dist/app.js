const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const adjectives = ["고요한", "단단한", "느긋한", "새벽의", "용감한", "가벼운", "반짝이는", "무심한", "따뜻한", "엉뚱한"];
const nouns = ["성냥", "잿가루", "모닥불", "종이학", "고양이", "연기", "부싯돌", "달빛", "장작", "불씨"];
const storageKey = "burnit:user:v1";
const historyKey = "burnit:history:v1";
let user = JSON.parse(localStorage.getItem(storageKey) || "null") || { id: crypto.randomUUID(), nickname: "" };
let history = JSON.parse(localStorage.getItem(historyKey) || "[]");
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

const canvas = $("#burn-canvas");
const fx = $("#fx-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const fctx = fx.getContext("2d");
const original = document.createElement("canvas");
original.width = canvas.width;
original.height = canvas.height;
const octx = original.getContext("2d");

function randomName() {
  let candidate;
  do candidate = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 90 + 10)}`;
  while (candidate === user.nickname);
  return candidate;
}

if (!user.nickname) user.nickname = randomName();
$("#nickname").value = user.nickname;
saveUser();

function saveUser() {
  localStorage.setItem(storageKey, JSON.stringify(user));
  $("#greeting").textContent = `${user.nickname}님, 오늘의 무거운 것을 여기 두고 가세요.`;
}

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
    burnPoints.push({ ...point, radius: 8, life: 0 });
    for (let i = 0; i < 3; i++) particles.push({ x: point.x, y: point.y, vx: (Math.random() - .5) * 2, vy: -Math.random() * 3 - 1, life: 40 + Math.random() * 35 });
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

function drawFrame() {
  ctx.clearRect(0, 0, 900, 620);
  ctx.drawImage(original, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  burnPoints.forEach((point) => {
    const gradient = ctx.createRadialGradient(point.x, point.y, Math.max(0, point.radius - 19), point.x, point.y, point.radius);
    gradient.addColorStop(0, "rgba(0,0,0,1)"); gradient.addColorStop(.7, "rgba(0,0,0,.97)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
  fctx.clearRect(0, 0, 900, 620);
  burnPoints.forEach((point) => {
    point.life += burning ? 1 : .22;
    point.radius = Math.min(76, point.radius + (burning ? .43 : .11));
    if (point.radius > 18 && Math.random() > .93) particles.push({ x: point.x + (Math.random() - .5) * point.radius, y: point.y, vx: (Math.random() - .5) * 1.5, vy: -Math.random() * 2.2, life: 30 + Math.random() * 40 });
    const ring = fctx.createRadialGradient(point.x, point.y, Math.max(0, point.radius - 8), point.x, point.y, point.radius + 6);
    ring.addColorStop(0, "rgba(255,77,0,0)"); ring.addColorStop(.55, "rgba(255,62,0,.82)"); ring.addColorStop(.75, "rgba(255,176,0,.75)"); ring.addColorStop(1, "rgba(0,0,0,0)");
    fctx.fillStyle = ring; fctx.beginPath(); fctx.arc(point.x, point.y, point.radius + 6, 0, Math.PI * 2); fctx.fill();
  });
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life--; fctx.fillStyle = p.life > 20 ? "#ff7a00" : "rgba(40,35,30,.5)"; fctx.fillRect(p.x, p.y, p.life > 20 ? 2.4 : 1.5, p.life > 20 ? 2.4 : 1.5); });
  const percent = Math.min(100, Math.round(burnPoints.reduce((sum, p) => sum + p.radius * p.radius * Math.PI, 0) / (900 * 620) * 34));
  $("#burn-percent").textContent = `${percent}% BURNED`;
  $("#burn-status").textContent = percent ? (percent < 75 ? "잘 타고 있어요. 천천히 더 문질러보세요." : "거의 다 놓아주었어요.") : "아직 아무것도 타지 않았어요.";
  if (percent >= 96 && !completed) finishBurn();
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
  burnPoints = []; particles = []; completed = false; burning = false; lastPoint = null;
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

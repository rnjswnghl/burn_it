const { chromium } = require("C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.setItem("burnit:user:v1", JSON.stringify({ id: "visual-check", nickname: "단단한 불씨28" })));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#enter-button").click();
  await page.waitForTimeout(350);

  if ((await page.locator("#stage-label").textContent()) !== "STAGE 01 · OVERTIME OFFICE") throw new Error("사무실 프리셋이 기본 장면이 아닙니다.");
  if ((await page.locator(".preset").allTextContents()).join(" ").match(/마감|걱정|그 메시지/)) throw new Error("이전 추상 프리셋이 남아 있습니다.");
  await page.screenshot({ path: "screenshots/burnit-office-line-art.png", fullPage: true });

  if (await page.locator("#fire-cursor").count()) throw new Error("제거하기로 한 불꽃 커서가 남아 있습니다.");
  const stage = page.locator("#canvas-wrap");
  const box = await stage.boundingBox();
  const targets = [[205, 480], [350, 365], [548, 462], [705, 324]];
  for (let index = 0; index < targets.length; index++) {
    const [x, y] = targets[index];
    await page.mouse.click(box.x + box.width * x / 900, box.y + box.height * y / 620, { delay: 20 });
    await page.waitForTimeout(90);
    const progress = await page.locator("#burn-percent").textContent();
    if (progress !== `${index + 1} / 4 LIT`) throw new Error(`점화 진행률이 맞지 않습니다: ${progress}`);
  }
  const frameRate = await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const started = performance.now();
    const tick = (now) => {
      frames++;
      if (now - started >= 1000) resolve(frames);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  if (frameRate < 35) throw new Error(`불꽃 렌더링이 느립니다: ${frameRate}fps`);
  await page.waitForTimeout(2350);
  if (!(await page.locator("#stage-clear").isVisible())) throw new Error("모든 점화 포인트 완료 후 스테이지 클리어가 표시되지 않습니다.");
  await page.screenshot({ path: "screenshots/burnit-fire-roaring.png", fullPage: true });
  const burnPercent = Number((await page.locator("#burn-percent").textContent()).replace(/\D/g, ""));
  if (!(burnPercent > 0)) throw new Error("불태우기 진행률이 증가하지 않았습니다.");

  await page.locator("#next-stage-button").click();
  await page.waitForTimeout(180);
  if ((await page.locator("#stage-label").textContent()) !== "STAGE 02 · SCHOOL MAIN HALL") throw new Error("다음 학교 스테이지로 전환되지 않았습니다.");
  await page.locator('[data-preset="workload"]').click();
  await page.waitForTimeout(120);
  if ((await page.locator("#stage-label").textContent()) !== "STAGE 03 · CORPORATE LAB") throw new Error("회사 연구동 장면 전환에 실패했습니다.");

  console.log(JSON.stringify({ defaultScene: "overtime office", ignitionPoints: 4, cursor: "native pointer", inferno: true, stageClear: true, nextStage: "school main hall", frameRate, screenshots: 2 }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

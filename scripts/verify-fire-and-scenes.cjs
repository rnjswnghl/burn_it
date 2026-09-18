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

  if ((await page.locator("#stage-label").textContent()) !== "SUBJECT 01 · OVERTIME OFFICE") throw new Error("사무실 프리셋이 기본 장면이 아닙니다.");
  if ((await page.locator(".preset").allTextContents()).join(" ").match(/마감|걱정|그 메시지/)) throw new Error("이전 추상 프리셋이 남아 있습니다.");
  await page.screenshot({ path: "screenshots/burnit-office-line-art.png", fullPage: true });

  const stage = page.locator("#canvas-wrap");
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .72);
  await page.mouse.down();
  for (let i = 0; i <= 55; i++) {
    const x = box.x + box.width * (.22 + i / 55 * .58);
    const y = box.y + box.height * (.62 + Math.sin(i * .42) * .16);
    await page.mouse.move(x, y, { steps: 2 });
  }
  await page.mouse.up();
  const clickX = box.x + box.width * .64;
  const clickY = box.y + box.height * .56;
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(clickX, clickY, { delay: 18 });
    await page.waitForTimeout(55);
  }
  const comboText = await page.locator("#burn-status").textContent();
  if (!comboText.includes("연속 4번 점화")) throw new Error(`연속 클릭 강화가 반영되지 않았습니다: ${comboText}`);
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
  await page.waitForTimeout(180);
  await page.screenshot({ path: "screenshots/burnit-fire-roaring.png", fullPage: true });
  const burnPercent = Number((await page.locator("#burn-percent").textContent()).replace(/\D/g, ""));
  if (!(burnPercent > 0)) throw new Error("불태우기 진행률이 증가하지 않았습니다.");

  for (const selector of ['[data-preset="meeting"]', '[data-preset="workload"]']) {
    await page.locator(selector).click();
    await page.waitForTimeout(120);
  }
  if ((await page.locator("#stage-label").textContent()) !== "SUBJECT 03 · THE WORKLOAD") throw new Error("업무 더미 장면 전환에 실패했습니다.");

  console.log(JSON.stringify({ defaultScene: "overtime office", alternateScenes: 2, pointer: "fire", repeatedIgnition: comboText, frameRate, burnPercent, screenshots: 2 }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

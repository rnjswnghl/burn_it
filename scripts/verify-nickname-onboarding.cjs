const { chromium } = require("C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  if (!(await page.locator("#nickname-screen").isVisible())) throw new Error("첫 방문 닉네임 화면이 보이지 않습니다.");
  if (await page.locator("#intro-screen").isVisible()) throw new Error("첫 방문에 인트로가 먼저 노출됩니다.");
  if (await page.locator('text=/ChatGPT.*(로그인|login)/i').count()) throw new Error("로그인 문구가 노출됩니다.");

  await page.locator("#lever-button").click();
  await page.waitForTimeout(1550);
  const generatedName = (await page.locator("#roulette-result strong").textContent()).trim();
  if (!generatedName) throw new Error("룰렛이 닉네임을 만들지 못했습니다.");
  await page.screenshot({ path: "screenshots/burnit-nickname-roulette.png", fullPage: true });

  await page.locator("#accept-name-button").click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("burnit:user:v1")));
  if (stored.nickname !== generatedName) throw new Error("닉네임이 LocalStorage에 저장되지 않았습니다.");
  await page.reload({ waitUntil: "networkidle" });
  if (!(await page.locator("#intro-screen").isVisible())) throw new Error("재방문 사용자가 인트로로 진입하지 못했습니다.");

  console.log(JSON.stringify({ firstVisit: "nickname roulette", nickname: generatedName, storage: "localStorage", returningVisit: "intro", socialLogin: false }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

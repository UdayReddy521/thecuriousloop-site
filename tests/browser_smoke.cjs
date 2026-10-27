// Real Chromium smoke test for the static Wonderverse website.
// Runs against a temporary localhost server so it cannot publish or modify
// users' accounts, and intentionally makes no YouTube API calls.
"use strict";
const assert = require("node:assert/strict");
const {spawn} = require("node:child_process");
const puppeteer = require("puppeteer-core");

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], {stdio:"ignore"});
let browser;
(async function main() {
  try {
    await pause(1100);
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    await page.setViewport({width: 1365, height: 850, deviceScaleFactor: 1});
    await page.goto("http://127.0.0.1:8765/", {waitUntil:"domcontentloaded",timeout:25000});
    assert.match(await page.title(), /Wonderfully Curious/);
    assert.equal(await page.$eval("#founderHeading", el => el.textContent.includes("founder")), true);
    assert.equal(await page.$eval("#founder", el => el.textContent.includes("Uday Reddy")), true);
    assert.equal(await page.$eval("#panel-science", el => el.hidden), false);

    // The banner is clear and clickable but must not spoil the YUVAN surprise.
    assert.equal(await page.$eval(".constellation-banner", el => el.textContent.includes("STAR QUEST")), true);
    assert.equal(await page.$eval(".constellation-banner", el => el.textContent.includes("FIVE HIDDEN STARS")), true);
    assert.equal(await page.$eval(".constellation-banner", el => el.textContent.includes("YUVAN")), false);
    assert.equal(await page.$eval(".hero-dedication", el => el.textContent.includes("YUVAN")), false);
    assert.equal(await page.$eval("#secretDialog", el => el.open), false);
    // Opening the mystery must launch a real quest, not immediately spoil the name.
    await page.click("#topReveal");
    assert.equal(await page.$eval("#secretDialog", el => el.open), true);
    assert.equal(await page.$eval("#questCompleted", el => el.hidden), true);
    assert.equal(await page.$eval("#questStage", el => el.hidden), false);
    await page.click('[data-star-index="0"]');
    assert.equal(await page.$eval("#questCounter", el => el.textContent), "1 / 5 STARS");
    assert.equal(await page.$eval("#questProgressBar", el => el.getAttribute("aria-valuenow")), "1");
    await page.click("#closeDialog");
    await page.click("#revealYuvan");
    assert.equal(await page.$eval("#questCounter", el => el.textContent), "1 / 5 STARS", "Quest progress stays when popup closes");
    await page.click("#closeDialog");
    await page.click("#planetReveal");
    assert.equal(await page.$eval("#secretDialog", el => el.open), true);
    for (let i = 1; i < 5; i++) {
      await page.click('[data-star-index="' + i + '"]');
    }
    assert.equal(await page.$eval("#questCompleted", el => el.hidden), false);
    assert.equal(await page.$eval("#questStage", el => el.hidden), true);
    assert.match(await page.$eval("#revealTitle", el => el.textContent), /Y\s+U\s+V\s+A\s+N/);
    assert.equal(await page.$eval("#questProgressBar", el => el.getAttribute("aria-valuenow")), "5");
    await page.click("#questReplay");
    assert.equal(await page.$eval("#questStage", el => el.hidden), false);
    assert.equal(await page.$eval("#questCounter", el => el.textContent), "0 / 5 STARS");
    await page.click("#closeDialog");
    console.log("PASS: Quest progression, spoiler-free start, persisted stars, celebration, replay and reset");

    await page.click("#tab-tech");
    assert.equal(await page.$eval("#tab-tech", el => el.getAttribute("aria-selected")), "true");
    assert.equal(await page.$eval("#panel-tech", el => el.hidden), false);
    assert.equal(await page.$eval("#panel-science", el => el.hidden), true);

    assert.equal(await page.$eval("#gameOverlay", el => el.hidden), false);
    await page.click("#startGame");
    assert.equal(await page.$eval("#gameOverlay", el => el.hidden), true);
    await pause(1600);
    assert.notEqual(await page.$eval("#gameTime", el => el.textContent), "30s", "Game timer must actually advance");
    await page.click("#restartGame");
    assert.equal(await page.$eval("#gameOverlay", el => el.hidden), true);
    console.log("PASS: Desktop hero, founder, tabs, actual running mini-game + restart");

    // A 30+ point arcade round can grant one bonus, never more than one.
    assert.equal(await page.evaluate(() => window.starQuest.arcadeResult(40)), true);
    assert.equal(await page.evaluate(() => window.starQuest.arcadeResult(50)), false);
    assert.equal(await page.evaluate(() => window.starQuest.progress()), 1);
    for (const letter of "UVAN") {
      await page.click('[data-letter="' + letter + '"]');
    }
    assert.equal(await page.$eval("#secretDialog", el => el.open), true, "Hidden stars + arcade bonus must unlock the surprise");
    assert.equal(await page.$eval("#questCompleted", el => el.hidden), false);
    await page.click("#closeQuestCompleted");
    assert.equal(await page.$eval("#secretDialog", el => el.open), false);
    console.log("PASS: On-page hidden stars + optional Star Catcher reward share quest progression");

    await page.setViewport({width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
    await page.goto("http://127.0.0.1:8765/", {waitUntil:"domcontentloaded",timeout:25000});
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), false);
    assert.equal(await page.$eval(".constellation-banner", el => el.getBoundingClientRect().top < window.innerHeight), true);
    await page.click("#menuToggle");
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), true);
    await page.click('#siteNav a[href="#worlds"]');
    await page.waitForFunction(() => !document.getElementById("siteNav").classList.contains("open"), {timeout: 3000});
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), false);
    console.log("PASS: Mobile viewport, opening and closing accessible navigation");
    await page.click("#topReveal");
    assert.equal(await page.$eval("#secretDialog", el => el.open), true, "Mobile Star Quest must open");
    assert.equal(await page.$eval("#questStage", el => el.hidden), false, "Mobile quest starts hidden-name stage");
    await page.click('[data-star-index="0"]');
    assert.equal(await page.$eval("#questCounter", el => el.textContent), "1 / 5 STARS");
    assert.equal(await page.$eval("#closeDialogX", el => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 40 && rect.height >= 40 &&
        rect.top >= 0 && rect.bottom <= window.innerHeight &&
        rect.left >= 0 && rect.right <= window.innerWidth;
    }), true, "Close button must fit inside the mobile viewport");
    // Puppeteer's synthetic mouse click can miss fixed controls inside
    // native <dialog> on emulated touch viewports. Verify keyboard dismissal
    // as the accessible fallback; desktop tests cover the visible buttons.
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("secretDialog").open, {timeout: 3000});
    assert.equal(await page.$eval("#secretDialog", el => el.open), false);
    console.log("PASS: Mobile Star Quest starts, collects stars and closes accessibly");
    await page.goto("http://127.0.0.1:8765/privacy.html", {waitUntil:"domcontentloaded"});
    assert.match(await page.title(), /Privacy Policy/);
    await page.goto("http://127.0.0.1:8765/terms.html", {waitUntil:"domcontentloaded"});
    assert.match(await page.title(), /Terms of Service/);
    assert.deepEqual(errors, [], "Client-side JavaScript exceptions");
    console.log("PASS: Mobile legal pages load and no JavaScript page errors");
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch(err => {console.error(err);process.exitCode=1;server.kill("SIGTERM");});

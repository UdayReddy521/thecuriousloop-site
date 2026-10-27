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

    for (const letter of "YUVAN") {
      await page.click('[data-letter="' + letter + '"]');
    }
    assert.equal(await page.$eval("#secretDialog", el => el.open), true, "Secret must open after 5 star clicks");
    assert.match(await page.$eval("#revealTitle", el => el.textContent), /Y U V A N/);
    await page.click("#closeDialog");
    assert.equal(await page.$eval("#secretDialog", el => el.open), false);
    console.log("PASS: All five hidden stars open and close YUVAN constellation dialog");

    await page.setViewport({width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
    await page.goto("http://127.0.0.1:8765/", {waitUntil:"domcontentloaded",timeout:25000});
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), false);
    await page.click("#menuToggle");
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), true);
    await page.click('#siteNav a[href="#worlds"]');
    assert.equal(await page.$eval("#siteNav", el => el.classList.contains("open")), false);
    console.log("PASS: Mobile viewport, opening and closing accessible navigation");
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

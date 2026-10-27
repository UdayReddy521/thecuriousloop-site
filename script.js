/* The Curious Loop • Wonderverse
   Self-contained interactions: no tracking, no external JS dependencies.
   Progressive enhancement; respects reduced motion and keyboard control. */
(function () {
  "use strict";
  document.documentElement.classList.add("js-enabled");

  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionAllowed = !reducedMotion;

  // Little background stars. Decorative only; never block pointer events.
  const field = $("starfield");
  if (field) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < (reducedMotion ? 25 : 95); i++) {
      const star = document.createElement("i");
      const seed = (i * 7919 + 2237) % 9973;
      const x = ((seed * 37) % 997) / 9.97;
      const y = ((seed * 53) % 997) / 9.97;
      star.style.left = x + "%";
      star.style.top = y + "%";
      star.style.setProperty("--duration", 3 + (i % 6) + "s");
      star.style.setProperty("--delay", (-i % 7) + "s");
      if (i % 7 === 0) { star.style.width = "3px"; star.style.height = "3px"; }
      fragment.appendChild(star);
    }
    field.appendChild(fragment);
  }

  const menuButton = $("menuToggle");
  const navigation = $("siteNav");
  if (menuButton && navigation) {
    const closeMenu = () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    };
    menuButton.addEventListener("click", () => {
      const open = navigation.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    // Anchor navigation can scroll before the click promise settles on touch browsers.
    // Also close after the hash changes to cover browser and keyboard navigation.
    window.addEventListener("hashchange", closeMenu);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }
  const footerYear = $("footerYear");
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  // Fade sections in; automatically reveal when observers are unavailable.
  const reveals = document.querySelectorAll("[data-reveal]");
  if (!reducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          self.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: "0px 0px -24px 0px" });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  const progress = $("progressLine");
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    if (!progress) return;
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.width = Math.max(0, Math.min(100, window.scrollY / range * 100)) + "%";
  }
  window.addEventListener("scroll", () => {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  updateScroll();

  // Interactive discovery cards; arrow-key navigation follows ARIA Tabs.
  const topicTabs = Array.from(document.querySelectorAll(".topic-tab"));
  function activateTab(tab, focus) {
    topicTabs.forEach((button) => {
      const selected = button === tab;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      const panel = $("panel-" + button.dataset.tab);
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }
  topicTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab, false));
    tab.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const nextIndex = e.key === "Home" ? 0 :
        e.key === "End" ? topicTabs.length - 1 :
        (index + (e.key === "ArrowRight" ? 1 : -1) + topicTabs.length) % topicTabs.length;
      activateTab(topicTabs[nextIndex], true);
    });
  });

  // Five discrete hidden stars in reading order spell a secret name.
  // No user data, names or game results are transmitted or stored.
  const letters = ["Y", "U", "V", "A", "N"];
  const discovered = new Set();
  const slots = Array.from(document.querySelectorAll(".constellation-slot"));
  const status = $("puzzleStatus");
  const secretDialog = $("secretDialog");
  const closeDialog = $("closeDialog");
  const hint = $("puzzleHint");
  const hints = [
    "First clue: look for a small star near the giant planet at the top.",
    "Second clue: a little star is tucked in The Curious Loop's card.",
    "Third clue: follow the field notes near the discovery topics.",
    "Fourth clue: the space arcade has more than one star.",
    "Last clue: discover a little sparkle near our promise to create responsibly."
  ];
  function showSecret() {
    if (secretDialog && typeof secretDialog.showModal === "function") {
      secretDialog.showModal();
      if (closeDialog) closeDialog.focus();
    } else {
      alert("Y U V A N — Young Universe. Vast Adventures. Never-ending wonder.");
    }
  }
  // The surprise must also be discoverable without pixel-hunting for stars.
  // All four plainly-labeled buttons reveal the same accessible dialog.
  ["topReveal", "revealYuvan", "planetReveal", "puzzleReveal"].forEach((id) => {
    const button = $(id);
    if (button) button.addEventListener("click", showSecret);
  });

  document.querySelectorAll(".hidden-spark[data-letter]").forEach((button) => {
    const letter = button.dataset.letter;
    if (!letters.includes(letter)) return;
    button.addEventListener("click", () => {
      if (discovered.has(letter)) return;
      discovered.add(letter);
      button.classList.add("discovered");
      button.setAttribute("aria-label", "Discovered constellation star " + letter);
      button.title = "A star in the constellation!";
      const index = letters.indexOf(letter);
      if (slots[index]) {
        slots[index].classList.add("found");
        slots[index].textContent = letter;
      }
      if (status) {
        status.textContent = discovered.size === 5 ?
          "5 of 5 stars discovered • Constellation complete!" :
          discovered.size + " of 5 stars discovered • Keep exploring";
      }
      if (hint && !hint.hidden) {
        const next = letters.findIndex((item) => !discovered.has(item));
        hint.textContent = hints[Math.max(next, 0)] || "You found them all!";
      }
      if (discovered.size === 5) showSecret();
    });
  });
  if ($("hintButton")) {
    $("hintButton").addEventListener("click", () => {
      const next = letters.findIndex((item) => !discovered.has(item));
      if (hint) {
        hint.textContent = next < 0 ? "All stars discovered. The constellation is complete!" : hints[next];
        hint.hidden = !hint.hidden;
      }
      $("hintButton").textContent = hint && !hint.hidden ? "Hide clue ↑" : "Need a clue? ↗";
    });
  }
  if (closeDialog && secretDialog) {
    closeDialog.addEventListener("click", () => secretDialog.close());
    secretDialog.addEventListener("click", (event) => {
      if (event.target === secretDialog) secretDialog.close();
    });
  }

  // STAR CATCHER — actual playable canvas game, not a static animation.
  const canvas = $("starGame");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const overlay = $("gameOverlay");
  const launch = $("startGame");
  const restart = $("restartGame");
  const scoreEl = $("gameScore");
  const timeEl = $("gameTime");
  const overlayTitle = $("overlayTitle");
  const overlayDesc = $("overlayDescription");
  if (!ctx) {
    if (overlayTitle) overlayTitle.textContent = "Your browser needs canvas";
    if (overlayDesc) overlayDesc.textContent = "Please open this page in a modern browser to play.";
    if (launch) launch.disabled = true;
    return;
  }
  const W = canvas.width, H = canvas.height, duration = 30;
  let running = false, score = 0, remaining = duration;
  let items = [], sparks = [], lastFrame = 0, spawnClock = 0, rafId = 0;
  const ship = { x: W / 2, y: H - 64, w: 70, h: 32, speed: 480 };
  const keys = { left: false, right: false };
  const bgStars = Array.from({ length: 65 }, (_, i) => ({
    x: (i * 139 + 59) % W, y: (i * 97 + 81) % H,
    size: 1 + (i % 3) * .5, phase: i * .4
  }));
  function updateCounters() {
    if (scoreEl) scoreEl.textContent = String(score).padStart(3, "0");
    if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(remaining)) + "s";
  }
  function resetState() {
    score = 0; remaining = duration; items = []; sparks = []; spawnClock = .35;
    ship.x = W / 2; keys.left = false; keys.right = false;
    updateCounters();
  }
  function stop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
  }
  function endGame() {
    stop();
    remaining = 0;
    updateCounters();
    if (overlay) overlay.hidden = false;
    if (overlayTitle) overlayTitle.textContent = score >= 100 ? "Cosmic superstar! ✦" : "Beautiful star catching! ✧";
    if (overlayDesc) overlayDesc.textContent = "You collected " + score + " points. Another adventure?";
    if (launch) launch.textContent = "Play again ↗";
  }
  function spawn() {
    const rock = Math.random() < .22;
    items.push({
      x: 25 + Math.random() * (W - 50), y: -25,
      speed: 135 + Math.random() * 92 + score * .25,
      r: rock ? 17 : 15, rock,
      angle: Math.random() * 6.28, spin: (Math.random() - .5) * 2
    });
  }
  function burst(x, y, rock) {
    if (!motionAllowed) return;
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      sparks.push({ x, y, vx: Math.cos(a) * (60 + i * 9),
        vy: Math.sin(a) * (60 + i * 9), life: .45, rock });
    }
  }
  function starShape(x, y, outer, inner, points, rotation) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i * Math.PI / points) + rotation - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      if (!i) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function drawBackground(seconds) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#11193b");
    grad.addColorStop(.55, "#0a1733");
    grad.addColorStop(1, "#101d36");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * .65, H * .15, 12, W * .65, H * .15, 330);
    glow.addColorStop(0, "#5a3d884d"); glow.addColorStop(1, "#5a3d8800");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    bgStars.forEach((star) => {
      ctx.fillStyle = "rgba(224,232,255," + (.26 + .26 * Math.sin(seconds * .8 + star.phase)) + ")";
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = "rgba(111,138,204,.07)"; ctx.lineWidth = 1;
    for (let y = 55; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const earthGlow = ctx.createRadialGradient(W / 2, H + 68, 20, W / 2, H + 68, 250);
    earthGlow.addColorStop(0, "#3859a072"); earthGlow.addColorStop(1, "#3859a000");
    ctx.fillStyle = earthGlow; ctx.fillRect(0, H - 170, W, 170);
  }
  function drawShip(seconds) {
    ctx.save(); ctx.translate(ship.x, ship.y);
    ctx.shadowBlur = 24; ctx.shadowColor = "#65deff";
    const flame = 16 + (motionAllowed ? 8 * Math.sin(seconds * 21) : 0);
    ctx.fillStyle = "#f4af8d"; ctx.beginPath();
    ctx.moveTo(-12, 18); ctx.lineTo(0, 18 + flame); ctx.lineTo(12, 18); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#a98dff"; ctx.beginPath();
    ctx.moveTo(-38, 11); ctx.lineTo(-12, -11); ctx.lineTo(12, -11); ctx.lineTo(38, 11); ctx.lineTo(19, 21); ctx.lineTo(-19, 21); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f1efff";ctx.beginPath();ctx.ellipse(0, -9, 15, 19, 0, 0, 7);ctx.fill();
    ctx.fillStyle = "#75e8fa";ctx.beginPath();ctx.ellipse(0, -10, 9, 11, 0, 0, 7);ctx.fill();
    ctx.restore();
  }
  function drawItems(seconds) {
    items.forEach((item) => {
      ctx.save();ctx.translate(item.x, item.y);ctx.rotate(item.angle);
      if (item.rock) {
        ctx.fillStyle = "#ff899f";ctx.shadowColor = "#ee6888";ctx.shadowBlur = 8;
        starShape(0, 0, 18, 15, 6, 0);ctx.fill();
        ctx.fillStyle = "#81384f";ctx.beginPath();ctx.arc(-4,-4,3,0,7);ctx.arc(6,5,4,0,7);ctx.fill();
      } else {
        ctx.shadowColor = "#fcd684";ctx.shadowBlur = 19;ctx.fillStyle = "#ffe59d";
        starShape(0, 0, 18, 8, 5, seconds);ctx.fill();
        ctx.shadowBlur = 0;ctx.fillStyle="#fff8d7";starShape(0,0,8,3,5,seconds);ctx.fill();
      }
      ctx.restore();
    });
    sparks.forEach((p) => {
      ctx.globalAlpha = Math.max(0,p.life / .45);
      ctx.fillStyle = p.rock ? "#ff9aab" : "#ffe2ad";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
  }
  function draw(seconds) {
    drawBackground(seconds);drawItems(seconds);drawShip(seconds);
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, Math.max(0,(now - lastFrame) / 1000));
    lastFrame = now; remaining -= dt; spawnClock -= dt;
    if (remaining <= 0) { endGame(); draw(now / 1000); return; }
    if (spawnClock <= 0) { spawn(); spawnClock = Math.max(.28, .61 - (duration - remaining) * .006); }
    if (keys.left) ship.x -= ship.speed * dt;
    if (keys.right) ship.x += ship.speed * dt;
    ship.x = Math.max(39, Math.min(W - 39, ship.x));
    items = items.filter((item) => {
      item.y += item.speed * dt;
      item.angle += item.spin * dt;
      const dx = Math.abs(item.x - ship.x), dy = Math.abs(item.y - ship.y);
      if (dx < ship.w / 2 + item.r * .8 && dy < ship.h / 2 + item.r * .75) {
        score = Math.max(0, score + (item.rock ? -5 : 10));
        burst(item.x, item.y, item.rock);
        updateCounters();return false;
      }
      return item.y < H + 40;
    });
    sparks = sparks.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      return p.life > 0;
    });
    updateCounters();draw(now / 1000);
    rafId = window.requestAnimationFrame(frame);
  }
  function start() {
    stop();resetState();running = true;
    if (overlay) overlay.hidden = true;
    lastFrame = performance.now();
    rafId = window.requestAnimationFrame(frame);
  }
  if (launch) launch.addEventListener("click", start);
  if (restart) restart.addEventListener("click", start);
  window.addEventListener("keydown", (event) => {
    if (!running) return;
    if (["ArrowLeft","a","A"].includes(event.key)) { keys.left = true;event.preventDefault(); }
    if (["ArrowRight","d","D"].includes(event.key)) { keys.right = true;event.preventDefault(); }
  });
  window.addEventListener("keyup", (event) => {
    if (["ArrowLeft","a","A"].includes(event.key)) keys.left = false;
    if (["ArrowRight","d","D"].includes(event.key)) keys.right = false;
  });
  window.addEventListener("blur", () => {keys.left = false;keys.right = false;});
  function movePointer(event) {
    if (!running) return;
    const bounds = canvas.getBoundingClientRect();
    ship.x = Math.max(39, Math.min(W - 39, (event.clientX - bounds.left) / bounds.width * W));
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (running) {canvas.setPointerCapture(event.pointerId);movePointer(event);}
  });
  canvas.addEventListener("pointermove", (event) => {if (running && (event.pointerType === "mouse" || event.buttons)) movePointer(event);});
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && running) lastFrame = performance.now();
  });
  resetState();draw(0);
})();

/* Star Quest — a tiny constellation adventure.
 * Pure local browser interaction. No analytics, cookies, profile or server.
 * The five on-page Easter-egg stars, the modal and Star Catcher share progress.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const dialog = $("secretDialog");
  if (!dialog) return;
  const symbols = ["Y", "U", "V", "A", "N"];
  const found = new Set();
  const buttons = Array.from(document.querySelectorAll(".quest-star"));
  const pageStars = Array.from(document.querySelectorAll(".hidden-spark[data-letter]"));
  const slots = Array.from(document.querySelectorAll(".constellation-slot"));
  const connections = Array.from(document.querySelectorAll("[data-quest-line]"));
  const stage = $("questStage");
  const completion = $("questCompleted");
  const bar = $("questProgressBar");
  const fill = $("questProgressFill");
  const counter = $("questCounter");
  const live = $("questLive");
  const puzzleStatus = $("puzzleStatus");
  const hint = $("puzzleHint");
  const hintButton = $("hintButton");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let arcadeAwarded = false;

  const hints = [
    "First clue: near the giant purple planet at the top of the page.",
    "Second clue: look inside The Curious Loop's card.",
    "Third clue: explore the interactive field notes.",
    "Fourth clue: the Star Catcher section hides another star.",
    "Fifth clue: our creating-responsibly section keeps a little sparkle."
  ];
  const milestones = [
    "Your adventure starts here. Tap a glowing star!",
    "First spark collected! Four more to go.",
    "Two stars connected. Keep exploring!",
    "Three stars glowing. A constellation is forming!",
    "Four stars! One last little spark…",
    "All five stars collected. Constellation unlocked!"
  ];

  function updateUI() {
    const count = found.size;
    if (counter) counter.textContent = count + " / 5 STARS";
    if (live) live.textContent = milestones[count];
    if (fill) fill.style.width = (count / 5 * 100) + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(count));
    if (puzzleStatus) puzzleStatus.textContent =
      count === 5 ? "5 of 5 stars found! You unlocked the constellation." : count + " of 5 stars discovered";

    buttons.forEach((button, index) => {
      const selected = found.has(symbols[index]);
      button.classList.toggle("collected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", selected ?
        "Constellation star " + (index + 1) + " collected" :
        "Collect constellation star " + (index + 1));
      button.disabled = selected;
    });
    pageStars.forEach(button => {
      const isFound = found.has(button.dataset.letter);
      button.classList.toggle("discovered", isFound);
      button.setAttribute("aria-pressed", String(isFound));
    });
    slots.forEach((slot, index) => {
      slot.classList.toggle("found", found.has(symbols[index]));
      // The name stays secret on the page until all 5 stars are collected.
      slot.textContent = count === 5 ? symbols[index] : "✦";
    });
    connections.forEach((path, index) => {
      path.classList.toggle("lit", found.has(symbols[index]) && found.has(symbols[index + 1]));
    });
    if (hint && !hint.hidden) {
      const next = symbols.findIndex(letter => !found.has(letter));
      hint.textContent = next < 0 ? "All five stars found!" : hints[next];
    }
    if (stage && completion) {
      stage.hidden = count === 5;
      completion.hidden = count !== 5;
    }
  }

  function openQuest() {
    updateUI();
    if (!dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (!dialog.open) {
      // Old-browser fallback, still presents the quest as an interactive page.
      dialog.setAttribute("open", "");
    }
    if (found.size === 5) {
      dialog.classList.remove("celebrating");
      // Retrigger CSS animation on a fresh win, but never for reduced motion.
      if (!reduced) void dialog.offsetWidth;
      dialog.classList.add("celebrating");
      $("closeQuestCompleted")?.focus();
    } else {
      const next = buttons.find(button => !button.disabled);
      (next || $("closeDialogX"))?.focus();
    }
  }

  function closeQuest() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function collect(letter, source) {
    if (!symbols.includes(letter) || found.has(letter)) return false;
    found.add(letter);
    updateUI();
    if (found.size === 5) {
      openQuest();
    } else if (source === "quest") {
      buttons.find(b => !b.disabled)?.focus();
    }
    return true;
  }

  function resetQuest() {
    found.clear();
    arcadeAwarded = false;
    dialog.classList.remove("celebrating");
    pageStars.forEach(button => button.removeAttribute("title"));
    updateUI();
    buttons[0]?.focus();
  }

  ["topReveal", "revealYuvan", "planetReveal", "puzzleReveal"].forEach(id => {
    $(id)?.addEventListener("click", openQuest);
  });

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => collect(symbols[index], "quest"));
  });

  pageStars.forEach(button => {
    button.addEventListener("click", () => {
      const letter = button.dataset.letter;
      if (collect(letter, "page")) {
        button.setAttribute("title", "Star found! Open Star Quest to see your progress.");
      }
    });
  });

  // The arcade can award a single bonus star after a completed 30-second round.
  // No advantage to refreshing: all progress is intentionally session-only.
  window.starQuest = Object.freeze({
    arcadeResult(points) {
      if (arcadeAwarded || points < 30 || found.size === 5) return false;
      const next = symbols.find(letter => !found.has(letter));
      if (!next) return false;
      arcadeAwarded = true;
      collect(next, "arcade");
      return true;
    },
    progress() { return found.size; }
  });

  hintButton?.addEventListener("click", () => {
    if (!hint) return;
    hint.hidden = !hint.hidden;
    const next = symbols.findIndex(letter => !found.has(letter));
    hint.textContent = next < 0 ? "Every star has been discovered!" : hints[next];
    hintButton.textContent = hint.hidden ? "Need a clue? ↗" : "Hide clue ↑";
  });
  $("questReset")?.addEventListener("click", resetQuest);
  $("questReplay")?.addEventListener("click", resetQuest);
  ["closeDialog", "closeQuestCompleted", "closeDialogX"].forEach(id => {
    $(id)?.addEventListener("click", closeQuest);
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeQuest();
  });
  dialog.addEventListener("close", () => dialog.classList.remove("celebrating"));

  updateUI();
})();

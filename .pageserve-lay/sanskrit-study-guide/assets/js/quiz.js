// ============================================
// Practice Quiz Engine for MkDocs
// Setup → one-question-at-a-time attempt → results → review / retry
// Data: docs/practice/data/*.json (same banks, ../data/ relative URLs).
// The presentation layer was redesigned in Phase 3B; loading,
// validation, and balanced-allocation logic are preserved.
// ============================================

(function () {
  "use strict";

  const QUIZ_CONFIG = {
    /* Sources resolve relative to the rendered quiz page
       (/…/practice/quiz/), so the banks sit at ../data/. */
    sources: [
      { key: "vibhakti", label: "विभक्ति", url: "../data/vibhakti.json" },
      { key: "verb", label: "क्रियापदम्", url: "../data/verb.json" },
      { key: "writing", label: "लेखननियमाः", url: "../data/writing_rules.json" },
      { key: "avyay", label: "अव्यय", url: "../data/avyay.json" },
      { key: "adjective", label: "विशेषणम्", url: "../data/adjective.json" },
      { key: "pronoun", label: "सर्वनाम", url: "../data/pronoun.json" },
      { key: "mixed", label: "संयुक्त", url: "../data/mixed.json" }
    ],
    categoryKey: "mixed-practice",
    counts: [5, 10, 25],
    defaultCount: 10
  };

  // ── State ─────────────────────────────────────
  let quizContainer = null;
  let state = {
    phase: "setup", // setup | attempt | results | review
    categoryKey: QUIZ_CONFIG.categoryKey,
    requestedCount: QUIZ_CONFIG.defaultCount,
    questions: [],
    results: [],   // { question, selectedText, selectedCorrect, sourceLabel }
    idx: 0,
    correct: 0,
    incorrect: 0,
    answered: false
  };

  let loadedSources = [];

  // ── Shuffling / allocation (preserved from the original engine) ──
  function shuffle(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
    }
    return result;
  }

  function validateQuestion(question, sourceLabel, index) {
    if (!question || typeof question !== "object") {
      throw new Error(`${sourceLabel}: Question ${index + 1} is not a valid object.`);
    }
    if (typeof question.question !== "string" || question.question.trim() === "") {
      throw new Error(`${sourceLabel}: Question ${index + 1} has no question text.`);
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`${sourceLabel}: Question ${index + 1} must have at least two options.`);
    }
    if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
      throw new Error(`${sourceLabel}: Question ${index + 1} has an invalid correct index.`);
    }
    return question;
  }

  async function loadQuizSource(source) {
    const response = await fetch(source.url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${source.label}: Could not load ${source.url}. HTTP ${response.status}`);
    }
    const data = await response.json();
    const sourceQuestions = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(sourceQuestions)) {
      throw new Error(`${source.label}: JSON must contain a questions array.`);
    }
    const validatedQuestions = sourceQuestions.map((question, index) => ({
      ...validateQuestion(question, source.label, index),
      _sourceKey: source.key,
      _sourceLabel: source.label
    }));
    return {
      key: source.key,
      label: source.label,
      url: source.url,
      title: data.title || source.label,
      questions: validatedQuestions
    };
  }

  async function loadAllQuizSources() {
    const loadOperations = QUIZ_CONFIG.sources.map(source => loadQuizSource(source));
    loadedSources = await Promise.all(loadOperations);
    return loadedSources;
  }

  /* Round-robin allocation keeps the bank counts balanced within an
     attempt; if one bank runs out, its share goes to the others. */
  function calculateBalancedAllocation(sources, requestedTotal) {
    const activeSources = sources.filter(source => source.questions.length > 0);
    if (activeSources.length === 0) { return new Map(); }
    const available = activeSources.reduce((t, s) => t + s.questions.length, 0);
    const actualTotal = Math.min(requestedTotal, available);
    const allocation = new Map();
    activeSources.forEach(source => allocation.set(source.key, 0));
    let remaining = actualTotal;
    while (remaining > 0) {
      let assignedDuringRound = false;
      const randomized = shuffle(activeSources);
      for (const source of randomized) {
        if (remaining === 0) { break; }
        const currently = allocation.get(source.key);
        if (currently < source.questions.length) {
          allocation.set(source.key, currently + 1);
          remaining -= 1;
          assignedDuringRound = true;
        }
      }
      if (!assignedDuringRound) { break; }
    }
    return allocation;
  }

  // ── Small DOM helpers ────────────────────────
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function elHTML(tag, className, html) {
    const node = el(tag, className);
    node.innerHTML = html;
    return node;
  }

  // ── HUD ─────────────────────────────────────
  function hud() {
    return {
      bar: document.getElementById("quiz-score-bar"),
      text: document.getElementById("quiz-progress-text"),
      counts: document.getElementById("quiz-counts"),
      track: document.getElementById("quiz-progress-track"),
      fill: document.getElementById("quiz-progress-fill")
    };
  }

  function updateHUD() {
    const h = hud();
    if (!h.bar) { return; }
    const total = state.questions.length;
    const answered = state.correct + state.incorrect;
    h.bar.hidden = false;
    h.bar.classList.remove("quiz-score-bar--hidden");
    h.text.textContent = `Question ${Math.min(state.idx + 1, total)} of ${total}`;
    h.counts.textContent =
      `✓ ${state.correct} correct · ✗ ${state.incorrect} incorrect · ${total - answered} remaining`;
    const pct = total ? Math.round((answered / total) * 100) : 0;
    h.fill.style.width = pct + "%";
    if (h.track) {
      h.track.setAttribute("aria-valuenow", String(pct));
    }
  }

  function hideHUD() {
    const h = hud();
    if (h.bar) {
      h.bar.hidden = true;
      h.bar.classList.add("quiz-score-bar--hidden");
    }
  }

  // ── Setup phase ─────────────────────────────
  function buildCategorySelect() {
    const select = document.getElementById("quiz-category");
    if (!select) { return; }
    select.innerHTML = "";
    const mixed = document.createElement("option");
    mixed.value = QUIZ_CONFIG.categoryKey;
    mixed.textContent = "Mixed Practice — all sections";
    select.appendChild(mixed);
    loadedSources.forEach(source => {
      if (source.key === "mixed") {
        // mixed.json feeds the Mixed Practice pool; it is not a standalone
        // category per the approved spec.
        return;
      }
      const option = document.createElement("option");
      option.value = source.key;
      option.textContent = `${source.label} (${source.questions.length})`;
      select.appendChild(option);
    });
    select.value = state.categoryKey;
    select.addEventListener("change", updateSetupNote);
    // The question-count select must also re-sync state.requestedCount + the note.
    const countSelect = document.getElementById("quiz-count");
    if (countSelect && countSelect.dataset.quizWired !== "1") {
      countSelect.dataset.quizWired = "1";
      countSelect.addEventListener("change", updateSetupNote);
    }
    updateSetupNote();
  }

  function updateSetupNote() {
    const select = document.getElementById("quiz-category");
    const countSel = document.getElementById("quiz-count");
    const note = document.getElementById("quiz-setup-note");
    if (!select || !countSel || !note) { return; }
    state.categoryKey = select.value;
    const requested = parseInt(countSel.value, 10) || QUIZ_CONFIG.defaultCount;
    state.requestedCount = requested;

    if (select.value === QUIZ_CONFIG.categoryKey) {
      const totalQ = loadedSources.reduce((t, s) => t + s.questions.length, 0);
      // Long line for wider screens; short, dynamic line for mobile.
      setSetupNote(note,
        `Mixed Practice pools all ${loadedSources.length} sections ` +
        `(${totalQ} questions). ${requested} will be drawn, balanced across sections.`,
        `${requested} questions randomly selected across ${loadedSources.length} topics.`);
    } else {
      const source = loadedSources.filter(s => s.key === select.value)[0];
      if (!source) { setSetupNote(note, "", ""); return; }
      const n = source.questions.length;
      setSetupNote(note,
        `${source.label}: ${n} questions available.` +
        (requested > n ? ` Only ${n} will be used (no duplicates).` : ""),
        (requested > n ? `Only ${n} will be used in this topic.` :
          `${source.label}: ${n} questions available.`));
    }
  }

  // Writes both note variants; CSS decides which one shows per breakpoint.
  function setSetupNote(note, longText, shortText) {
    note.textContent = "";
    const long = el("span", "quiz-note-long", longText);
    const short = el("span", "quiz-note-short", shortText);
    note.appendChild(long);
    note.appendChild(short);
  }

  // Compact mobile count buttons keep the underlying select in sync — same
  // values, same change event, one selection at a time.
  function wireCountButtons() {
    const countSel = document.getElementById("quiz-count");
    const buttons = Array.prototype.slice.call(document.querySelectorAll(".quiz-count-btn"));
    if (!countSel || !buttons.length) { return; }
    const selectedValue = function () { return parseInt(countSel.value, 10); };
    const reflect = function () {
      buttons.forEach(function (btn) {
        const active = parseInt(btn.dataset.value, 10) === selectedValue();
        btn.classList.toggle("is-selected", active);
        btn.setAttribute("aria-checked", String(active));
      });
    };
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (countSel.value !== btn.dataset.value) {
          countSel.value = btn.dataset.value;
          countSel.dispatchEvent(new Event("change"));
        }
        reflect();
      });
    });
    countSel.addEventListener("change", reflect);
    reflect();
  }

  function showSetup() {
    state.phase = "setup";
    hideHUD();
    if (!quizContainer) { return; }
    // No empty placeholder before the quiz starts — the unified setup card
    // already tells the learner what to do. Loading/error states stay.
    quizContainer.innerHTML = "";
    const setup = document.getElementById("quiz-setup");
    if (setup) {
      buildCategorySelect();
      setup.hidden = false;
    }
  }

  // ── Attempt building ────────────────────────
  function buildAttempt() {
    if (state.categoryKey === QUIZ_CONFIG.categoryKey) {
      const allocation = calculateBalancedAllocation(loadedSources, state.requestedCount);
      const selected = [];
      loadedSources.forEach(source => {
        const take = allocation.get(source.key) || 0;
        selected.push(...shuffle(source.questions).slice(0, take));
      });
      return shuffle(selected);
    }
    const source = loadedSources.filter(s => s.key === state.categoryKey)[0];
    if (!source) { return []; }
    return shuffle(source.questions).slice(0, Math.min(state.requestedCount, source.questions.length));
  }

  function startQuiz(forcedQuestions, categoryLabel) {
    if (!loadedSources.length) { return; }
    state.phase = "attempt";
    state.questions = forcedQuestions || buildAttempt();
    state.idx = 0;
    state.correct = 0;
    state.incorrect = 0;
    state.results = [];
    state.answered = false;
    state.categoryLabel = categoryLabel || null;

    const setup = document.getElementById("quiz-setup");
    if (setup) { setup.hidden = true; }

    if (state.questions.length === 0) {
      showErrorState(new Error("No questions were found in the selected banks."));
      return;
    }
    renderQuestion();
  }

  // ── Attempt phase: one question at a time ────
  function renderQuestion() {
    const question = state.questions[state.idx];
    state.answered = false;
    updateHUD();

    quizContainer.innerHTML = "";
    const card = el("div", "quiz-question quiz-question--current");
    card.setAttribute("lang", "sa");

    // meta row
    const meta = el("div", "quiz-question-meta");
    const numbering = el("span", "quiz-run-label",
      `Question ${state.idx + 1} of ${state.questions.length}`);
    meta.appendChild(numbering);
    // In mixed mode, show which section the question comes from.
    const catLabel = state.categoryLabel || question._sourceLabel;
    meta.appendChild(elHTML("span", "quiz-source-chip", catLabel));
    // Raw question.type values (e.g. "Multiple_correction") are implementation
    // details and stay out of the learner-facing UI; data processing unchanged.
    card.appendChild(meta);

    // question text (original markup preserved)
    card.appendChild(elHTML("div", "quiz-question-text",
      `<span class="quiz-question-number">${state.idx + 1}</span>` +
      `<span>${question.question}</span>`));
    if (question.sentence) {
      card.appendChild(elHTML("div", "quiz-sentence", question.sentence));
    }
    if (question.hint) {
      card.appendChild(elHTML("div", "quiz-hint", question.hint));
    }

    // options (shuffled with correct-index mapping preserved)
    const optionModels = question.options.map((text, originalIndex) => ({
      text, isCorrect: originalIndex === question.correct
    }));
    const shuffledOptions = shuffle(optionModels);
    const optionsWrap = el("div", "quiz-options");
    let selectedOption = null;

    shuffledOptions.forEach((option, position) => {
      const btn = el("button", "quiz-option");
      btn.type = "button";
      btn.dataset.correct = String(option.isCorrect);
      btn.setAttribute("aria-pressed", "false");
      btn.appendChild(el("span", "opt-label",
        String.fromCharCode(65 + position)));
      btn.appendChild(elHTML("span", "opt-text", option.text));
      btn.addEventListener("click", function () {
        if (state.answered) { return; }
        if (selectedOption) { selectedOption.classList.remove("selected"); }
        selectedOption = btn;
        btn.classList.add("selected");
        btn.setAttribute("aria-pressed", "true");
        submitBtn.disabled = false;
      });
      optionsWrap.appendChild(btn);
    });
    card.appendChild(optionsWrap);

    // feedback + explanation
    const feedback = el("div", "quiz-feedback");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    card.appendChild(feedback);

    const explanation = elHTML("div", "quiz-explanation", question.explanation || "No explanation is available.");
    explanation.hidden = true;
    card.appendChild(explanation);

    // controls: submit, then next / see results
    const controls = el("div", "quiz-controls");
    const submitBtn = el("button", "quiz-submit-btn", "Submit Answer");
    submitBtn.type = "button";
    submitBtn.disabled = true;

    submitBtn.addEventListener("click", function () {
      if (state.answered || !selectedOption) { return; }
      state.answered = true;
      submitBtn.disabled = true;

      const isCorrect = selectedOption.dataset.correct === "true";
      state.results.push({
        question,
        selectedOption,
        selectedIsCorrect: isCorrect
      });

      // lock all options; mark results (symbols + text, not color alone)
      Array.prototype.forEach.call(optionsWrap.children, node => {
        node.disabled = true;
      });
      const optionText = selectedOption.querySelector(".opt-text").innerHTML;
      state.results[state.results.length - 1].selectedText = optionText;

      if (isCorrect) {
        state.correct += 1;
        selectedOption.classList.add("correct");
        feedback.classList.add("correct");
        feedback.textContent = "✓ Correct!";
      } else {
        state.incorrect += 1;
        selectedOption.classList.add("wrong");
        feedback.classList.add("wrong");
        feedback.textContent = "✗ Incorrect.";
        Array.prototype.forEach.call(optionsWrap.children, node => {
          if (node.dataset.correct === "true") {
            node.classList.add("correct");
            node.appendChild(el("span", "opt-tag", "Correct answer"));
          }
        });
        selectedOption.appendChild(el("span", "opt-tag", "Your answer"));
      }
      explanation.hidden = false;
      updateHUD();

      // continue control
      const isLast = state.idx === state.questions.length - 1;
      const nextBtn = el("button", "quiz-next-btn",
        isLast ? "See Results →" : "Next Question →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", function () {
        if (isLast) { showResults(); } else {
          state.idx += 1;
          renderQuestion();
        }
      });
      controls.innerHTML = "";
      controls.appendChild(nextBtn);
      nextBtn.focus();
    });

    controls.appendChild(submitBtn);
    card.appendChild(controls);
    quizContainer.appendChild(card);
  }

  // ── Results phase ────────────────────────────
  function categoryResultLabel() {
    if (state.categoryLabel) { return state.categoryLabel; }
    if (state.categoryKey === QUIZ_CONFIG.categoryKey) {
      return "Mixed Practice — all sections";
    }
    const source = loadedSources.filter(s => s.key === state.categoryKey)[0];
    return source ? source.label : state.categoryKey;
  }

  function showResults() {
    state.phase = "results";
    hideHUD();
    quizContainer.innerHTML = "";

    const total = state.results.length;
    const percentage = total ? Math.round((state.correct / total) * 100) : 0;
    let message = "Keep practicing! 💪";
    if (percentage === 100) { message = "Perfect! 🔥"; }
    else if (percentage >= 80) { message = "Excellent! 🌟"; }
    else if (percentage >= 60) { message = "Good progress! 📿"; }

    const summary = el("div", "quiz-summary");
    summary.appendChild(el("h3", null, `🎉 ${message}`));
    const grid = el("div", "quiz-result-grid");
    grid.appendChild(resultCell("Answered", String(total)));
    grid.appendChild(resultCell("Correct", String(state.correct)));
    grid.appendChild(resultCell("Incorrect", String(state.incorrect)));
    grid.appendChild(resultCell("Score", `${percentage}%`));
    summary.appendChild(grid);
    summary.appendChild(resultCell("Category", categoryResultLabel(), "quiz-result-category"));

    const actions = el("div", "quiz-actions");
    if (state.incorrect > 0) {
      actions.appendChild(makeButton("quiz-review-btn",
        `Review incorrect answers (${state.incorrect})`, showReview));
      actions.appendChild(makeButton("quiz-retry-btn",
        `Retry missed questions (${state.incorrect})`, retryMissed));
    } else {
      summary.appendChild(el("p", "quiz-perfect-note",
        "No incorrect answers — nothing to review. 🎉"));
    }
    actions.appendChild(makeButton("quiz-new-btn", "↻ Start New Quiz", function () {
      showSetup();
    }));
    summary.appendChild(actions);
    quizContainer.appendChild(summary);
    summary.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resultCell(label, value, extraClass) {
    const cell = el("div", "quiz-result-cell" + (extraClass ? " " + extraClass : ""));
    cell.appendChild(el("span", "quiz-result-label", label));
    cell.appendChild(elHTML("span", "quiz-result-value", value));
    return cell;
  }

  function makeButton(className, label, onClick) {
    const btn = el("button", className + " quiz-action-btn", label);
    btn.type = "button";
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ── Review phase ─────────────────────────────
  function showReview() {
    state.phase = "review";
    hideHUD();
    quizContainer.innerHTML = "";

    const missed = state.results.filter(r => !r.selectedIsCorrect);
    const panel = el("div", "quiz-review");

    const heading = el("h3", "quiz-review-heading",
      `Review — ${missed.length} incorrect answer${missed.length === 1 ? "" : "s"}`);
    panel.appendChild(heading);

    missed.forEach((record, i) => {
      const item = el("div", "quiz-question quiz-review-item");
      item.appendChild(elHTML("div", "quiz-question-text",
        `<span class="quiz-question-number">${i + 1}</span>` +
        `<span>${record.question.question}</span>`));
      if (record.question.sentence) {
        item.appendChild(elHTML("div", "quiz-sentence", record.question.sentence));
      }
      const optionsWrap = el("div", "quiz-options quiz-review-options");
      // learner's answer (with its own correctness state)
      const yourAns = el("button", "quiz-option wrong quiz-review-answer");
      yourAns.type = "button";
      yourAns.disabled = true;
      yourAns.appendChild(el("span", "opt-tag", "Your answer"));
      yourAns.appendChild(elHTML("span", "opt-text", record.selectedText));
      optionsWrap.appendChild(yourAns);
      // correct answer
      const correctText = record.question.options[record.question.correct];
      const corrAns = el("button", "quiz-option correct quiz-review-answer");
      corrAns.type = "button";
      corrAns.disabled = true;
      corrAns.appendChild(el("span", "opt-tag", "Correct answer"));
      corrAns.appendChild(elHTML("span", "opt-text", correctText));
      optionsWrap.appendChild(corrAns);
      item.appendChild(optionsWrap);
      item.appendChild(elHTML("div", "quiz-explanation", record.question.explanation || "No explanation is available."));
      panel.appendChild(item);
    });

    const actions = el("div", "quiz-actions");
    actions.appendChild(makeButton("quiz-retry-btn",
      `Retry missed questions (${missed.length})`, retryMissed));
    actions.appendChild(makeButton("quiz-back-results-btn", "← Back to results", showResults));
    actions.appendChild(makeButton("quiz-new-btn", "↻ Start New Quiz", function () { showSetup(); }));
    panel.appendChild(actions);
    quizContainer.appendChild(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function retryMissed() {
    const missed = state.results.filter(r => !r.selectedIsCorrect).map(r => r.question);
    if (!missed.length) { return; }
    startQuiz(shuffle(missed), `Retry — missed ${categoryResultLabel()}`);
  }

  // ── Error / loading states (preserved) ──────
  function showErrorState(error) {
    console.error("Quiz data failed to load:", error);
    quizContainer.innerHTML = "";
    const box = el("div", "quiz-error");
    box.appendChild(el("p", null, "⚠️ Failed to load quiz data."));
    box.appendChild(el("p", null, "Verify the JSON paths in QUIZ_CONFIG.sources."));
    box.appendChild(el("p", null, "Each JSON file must contain a questions array."));
    if (error && error.message) {
      box.appendChild(el("p", "quiz-error__detail", error.message));
    }
    quizContainer.appendChild(box);
  }

  function attachTopNewQuizButton() {
    // The setup card owns the start flow, so no legacy header button is needed.
  }

  // ── Initialisation ──────────────────────────
  async function initializeQuiz() {
    quizContainer = document.getElementById("quiz-container");
    if (!quizContainer) {
      console.error("Quiz container was not found.");
      return;
    }
    quizContainer.innerHTML = '<p class="quiz-loading">Loading question banks…</p>';
    try {
      await loadAllQuizSources();
      buildCategorySelect();
      updateSetupNote();
      wireCountButtons();
      attachTopNewQuizButton();

      const startBtn = document.getElementById("quiz-start");
      if (startBtn) {
        startBtn.addEventListener("click", function () { startQuiz(); });
      }
      showSetup();
    } catch (error) {
      showErrorState(error);
    }
  }

  document.addEventListener("DOMContentLoaded", initializeQuiz);
})();

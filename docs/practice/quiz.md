---
hide:
  - toc
---

# Practice Quiz

<section class="quiz-setup" id="quiz-setup" markdown>

### Quiz setup

<div class="quiz-setup__controls">

<div class="quiz-setup__field">

<label for="quiz-category">Category (विषयः)</label>

<select id="quiz-category">
</select>

</div>

<div class="quiz-setup__field">

<label for="quiz-count">Number of questions</label>

<select id="quiz-count">
  <option value="5">5 questions</option>
  <option value="10" selected="selected">10 questions</option>
  <option value="25">25 questions</option>
</select>

<div class="quiz-count-btns" role="radiogroup" aria-label="Number of questions">

<button type="button" class="quiz-count-btn" data-value="5" role="radio" aria-checked="false">5</button>
<button type="button" class="quiz-count-btn" data-value="10" role="radio" aria-checked="true">10</button>
<button type="button" class="quiz-count-btn" data-value="25" role="radio" aria-checked="false">25</button>

</div>

</div>

</div>

<button type="button" class="quiz-start-btn" id="quiz-start"><span aria-hidden="true">▶</span> Start Quiz</button>

<p class="quiz-setup-note" id="quiz-setup-note">Loading question banks…</p>

</section>

<div class="quiz-score-bar quiz-score-bar--hidden" id="quiz-score-bar" hidden>
  <div class="quiz-score-bar__top">
    <span id="quiz-progress-text">Question 0 of 0</span>
    <span id="quiz-counts">✓ 0 correct · ✗ 0 incorrect</span>
  </div>
  <div class="quiz-progress-track" role="progressbar" aria-label="Quiz progress"
       aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="quiz-progress-track">
    <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
  </div>
</div>

<div id="quiz-container"><p class="quiz-loading">Choose a category and press Start Quiz.</p></div>

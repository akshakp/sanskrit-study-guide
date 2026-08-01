// ============================================
// Dynamic Balanced Quiz Engine for MkDocs
// ============================================

(function () {
  "use strict";

  const QUIZ_CONFIG = {
    totalQuestions: 20,

    sources: [
      {
        key: "vibhakti",
        label: "विभक्ति",
        url: "../data/vibhakti.json"
      },
      {
        key: "verb",
        label: "क्रियापदम्",
        url: "../data/verb.json"
      },
      {
        key: "writing",
        label: "लेखननियमाः",
        url: "../data/writing_rules.json"
      },
      {
        key: "avyay",
        label: "अव्यय",
        url: "../data/avyay.json"
      }
    ]
  };

  let quizContainer = null;
  let scoreElement = null;

  let loadedSources = [];
  let currentQuestions = [];

  let totalAnswered = 0;
  let totalCorrect = 0;

  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [result[i], result[randomIndex]] = [
        result[randomIndex],
        result[i]
      ];
    }

    return result;
  }

    function validateQuestion(question, sourceLabel, index) {
    if (!question || typeof question !== "object") {
      throw new Error(
        `${sourceLabel}: Question ${index + 1} is not a valid object.`
      );
    }

    if (
      typeof question.question !== "string" ||
      question.question.trim() === ""
    ) {
      throw new Error(
        `${sourceLabel}: Question ${index + 1} has no question text.`
      );
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      throw new Error(
        `${sourceLabel}: Question ${index + 1} must have at least two options.`
      );
    }

    if (
      !Number.isInteger(question.correct) ||
      question.correct < 0 ||
      question.correct >= question.options.length
    ) {
      throw new Error(
        `${sourceLabel}: Question ${index + 1} has an invalid correct index.`
      );
    }

    return question;
  }

    async function loadQuizSource(source) {
    const response = await fetch(source.url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `${source.label}: Could not load ${source.url}. HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const sourceQuestions = Array.isArray(data)
      ? data
      : data.questions;

    if (!Array.isArray(sourceQuestions)) {
      throw new Error(
        `${source.label}: JSON must contain a questions array.`
      );
    }

    const validatedQuestions = sourceQuestions.map(
      (question, index) => ({
        ...validateQuestion(question, source.label, index),

        // Internal metadata added by the engine
        _sourceKey: source.key,
        _sourceLabel: source.label
      })
    );

    return {
      key: source.key,
      label: source.label,
      url: source.url,
      title: data.title || source.label,
      questions: validatedQuestions
    };
  }

    async function loadAllQuizSources() {
    const loadOperations = QUIZ_CONFIG.sources.map(
      source => loadQuizSource(source)
    );

    loadedSources = await Promise.all(loadOperations);

    return loadedSources;
  }

    function calculateBalancedAllocation(sources, requestedTotal) {
    const activeSources = sources.filter(
      source => source.questions.length > 0
    );

    if (activeSources.length === 0) {
      return new Map();
    }

    const availableQuestionCount = activeSources.reduce(
      (total, source) => total + source.questions.length,
      0
    );

    const actualTotal = Math.min(
      requestedTotal,
      availableQuestionCount
    );

    const allocation = new Map();

    activeSources.forEach(source => {
      allocation.set(source.key, 0);
    });

    let remaining = actualTotal;

    /*
     * Round-robin allocation keeps the source counts equal.
     *
     * With 4 sources and 20 questions:
     * 5 Vibhakti
     * 5 Verbs
     * 5 Writing
     * 5 Avyaya
     *
     * If one source has fewer questions, its unused allocation
     * is automatically distributed among the other sources.
     */
    while (remaining > 0) {
      let assignedDuringRound = false;

      const randomizedSources = shuffle(activeSources);

      for (const source of randomizedSources) {
        if (remaining === 0) {
          break;
        }

        const currentlyAllocated =
          allocation.get(source.key);

        if (currentlyAllocated < source.questions.length) {
          allocation.set(
            source.key,
            currentlyAllocated + 1
          );

          remaining -= 1;
          assignedDuringRound = true;
        }
      }

      if (!assignedDuringRound) {
        break;
      }
    }

    return allocation;
  }

    function buildBalancedQuestionSet() {
    const allocation = calculateBalancedAllocation(
      loadedSources,
      QUIZ_CONFIG.totalQuestions
    );

    const selectedQuestions = [];

    loadedSources.forEach(source => {
      const questionCount =
        allocation.get(source.key) || 0;

      const sourceSelection = shuffle(
        source.questions
      ).slice(0, questionCount);

      selectedQuestions.push(...sourceSelection);
    });

    return shuffle(selectedQuestions);
  }

    function resetScore() {
    totalAnswered = 0;
    totalCorrect = 0;

    updateScore();
  }

  function updateScore() {
    if (!scoreElement) {
      return;
    }

    const percentage = totalAnswered
      ? Math.round(
          (totalCorrect / totalAnswered) * 100
        )
      : 0;

    scoreElement.textContent =
      `Score: ${totalCorrect} / ${totalAnswered} answered (${percentage}%)`;
  }

    function getQuestionSourceSummary() {
    const sourceCounts = new Map();

    currentQuestions.forEach(question => {
      const label = question._sourceLabel;

      sourceCounts.set(
        label,
        (sourceCounts.get(label) || 0) + 1
      );
    });

    return Array.from(sourceCounts.entries())
      .map(([label, count]) => `${label}: ${count}`)
      .join(" · ");
  }

    function createQuestionElement(question, questionIndex) {
    const optionModels = question.options.map(
      (optionText, originalIndex) => ({
        text: optionText,
        isCorrect: originalIndex === question.correct
      })
    );

    const shuffledOptions = shuffle(optionModels);

    const questionWrapper =
      document.createElement("div");

    questionWrapper.className = "quiz-question";

    const questionText =
      document.createElement("div");

    questionText.className = "quiz-question-text";

    questionText.innerHTML = `
      <span class="quiz-question-number">
        ${questionIndex + 1}
      </span>

      <span>
        ${question.question}
      </span>
    `;

    questionWrapper.appendChild(questionText);

    if (question.sentence) {
      const sentenceElement =
        document.createElement("div");

      sentenceElement.className = "quiz-sentence";
      sentenceElement.innerHTML = question.sentence;

      questionWrapper.appendChild(sentenceElement);
    }

    if (question.hint) {
      const hintElement =
        document.createElement("div");

      hintElement.className = "quiz-hint";
      hintElement.innerHTML = question.hint;

      questionWrapper.appendChild(hintElement);
    }

    const optionsContainer =
      document.createElement("div");

    optionsContainer.className = "quiz-options";

    shuffledOptions.forEach((option, optionIndex) => {
      const optionElement =
        document.createElement("div");

      optionElement.className = "quiz-option";
      optionElement.dataset.correct =
        String(option.isCorrect);

      optionElement.innerHTML = `
        <span class="opt-label">
          ${String.fromCharCode(65 + optionIndex)}
        </span>

        <span class="opt-text">
          ${option.text}
        </span>
      `;

      optionsContainer.appendChild(optionElement);
    });

    questionWrapper.appendChild(optionsContainer);

    const feedbackElement =
      document.createElement("div");

    feedbackElement.className = "quiz-feedback";
    feedbackElement.setAttribute(
      "aria-live",
      "polite"
    );

    questionWrapper.appendChild(feedbackElement);

    const explanationElement =
      document.createElement("div");

    explanationElement.className =
      "quiz-explanation";

    explanationElement.innerHTML =
      question.explanation ||
      "No explanation is available.";

    questionWrapper.appendChild(
      explanationElement
    );

    attachOptionHandlers(
      optionsContainer,
      feedbackElement,
      explanationElement
    );

    return questionWrapper;
  }

    function attachOptionHandlers(
    optionsContainer,
    feedbackElement,
    explanationElement
  ) {
    const optionElements =
      optionsContainer.querySelectorAll(
        ".quiz-option"
      );

    let answered = false;

    optionElements.forEach(optionElement => {
      optionElement.addEventListener(
        "click",
        function () {
          if (answered) {
            return;
          }

          answered = true;
          totalAnswered += 1;

          const isCorrect =
            optionElement.dataset.correct === "true";

          if (isCorrect) {
            totalCorrect += 1;

            optionElement.classList.add("correct");

            feedbackElement.textContent =
              "✅ Correct!";

            feedbackElement.className =
              "quiz-feedback correct";
          } else {
            optionElement.classList.add("wrong");

            feedbackElement.textContent =
              "❌ Incorrect.";

            feedbackElement.className =
              "quiz-feedback wrong";

            optionElements.forEach(candidate => {
              if (
                candidate.dataset.correct === "true"
              ) {
                candidate.classList.add("correct");
              }
            });
          }

          optionElements.forEach(candidate => {
            candidate.style.pointerEvents = "none";

            if (
              !candidate.classList.contains("correct") &&
              !candidate.classList.contains("wrong")
            ) {
              candidate.style.opacity = "0.6";
            }
          });

          explanationElement.style.display = "block";
          explanationElement.style.animation =
            "fadeInUp 0.3s ease";

          updateScore();

          if (
            totalAnswered === currentQuestions.length
          ) {
            showQuizSummary();
          }
        }
      );
    });
  }

    function renderQuiz() {
    resetScore();

    currentQuestions =
      buildBalancedQuestionSet();

    quizContainer.innerHTML = "";

    if (currentQuestions.length === 0) {
      throw new Error(
        "No questions were found in the configured JSON files."
      );
    }

    const progressElement =
      document.createElement("div");

    progressElement.className = "quiz-progress";

   /** progressElement.innerHTML = `
      <strong>Mixed Sanskrit Practice</strong>
      — ${currentQuestions.length} questions

    //   <div class="quiz-source-summary">
    //     ${getQuestionSourceSummary()}
    //   </div>
    `;
 **/
    quizContainer.appendChild(progressElement);

    currentQuestions.forEach(
      (question, questionIndex) => {
        const questionElement =
          createQuestionElement(
            question,
            questionIndex
          );

        quizContainer.appendChild(
          questionElement
        );
      }
    );
  }

    function showQuizSummary() {
    const existingSummary =
      quizContainer.querySelector(
        ".quiz-summary"
      );

    if (existingSummary) {
      return;
    }

    const percentage = Math.round(
      (totalCorrect / currentQuestions.length) *
        100
    );

    let message = "Keep practicing! 💪";

    if (percentage === 100) {
      message = "Perfect! 🔥";
    } else if (percentage >= 80) {
      message = "Excellent! 🌟";
    } else if (percentage >= 60) {
      message = "Good progress! 📿";
    }

    const summaryElement =
      document.createElement("div");

    summaryElement.className = "quiz-summary";

    summaryElement.innerHTML = `
      <h3>🎉 ${message}</h3>

      <p>
        You scored
        <strong>${totalCorrect}</strong>
        out of
        <strong>${currentQuestions.length}</strong>
        (${percentage}%).
      </p>

      <p class="quiz-source-summary">
        ${getQuestionSourceSummary()}
      </p>

      <button
        type="button"
        class="quiz-reset-btn"
        data-new-quiz
      >
        ↻ Start New Quiz
      </button>
    `;

    const newQuizButton =
      summaryElement.querySelector(
        "[data-new-quiz]"
      );

    newQuizButton.addEventListener(
      "click",
      function () {
        renderQuiz();

        quizContainer.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    );

    quizContainer.appendChild(
      summaryElement
    );

    summaryElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

    function showLoadingState() {
    quizContainer.innerHTML = `
      <div class="quiz-progress">
        <strong>Loading quiz...</strong>
      </div>
    `;
  }

  function showErrorState(error) {
    console.error(
      "Quiz data failed to load:",
      error
    );

    quizContainer.innerHTML = `
      <div class="quiz-error">
        <p>
          <strong>
            ⚠️ Failed to load quiz data.
          </strong>
        </p>

        <p>
          Verify the four JSON paths in
          <code>QUIZ_CONFIG.sources</code>.
        </p>

        <p>
          Each JSON file must contain a
          <code>questions</code> array.
        </p>

        <p>
          <small>${error.message}</small>
        </p>
      </div>
    `;
  }

    function attachTopNewQuizButton() {
    const button =
      document.getElementById("quiz-new-btn");

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      function () {
        if (loadedSources.length === 0) {
          return;
        }

        renderQuiz();

        quizContainer.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    );
  }

    async function initializeQuiz() {
    quizContainer =
      document.getElementById(
        "quiz-container"
      );

    scoreElement =
      document.getElementById(
        "quiz-score"
      );

    if (!quizContainer) {
      console.error(
        "Quiz container was not found."
      );

      return;
    }

    attachTopNewQuizButton();
    showLoadingState();

    try {
      await loadAllQuizSources();
      renderQuiz();
    } catch (error) {
      showErrorState(error);
    }
  }
    document.addEventListener(
    "DOMContentLoaded",
    initializeQuiz
  );

})();
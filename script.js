
/* ============================================
   ONLINE EXAMINATION & PROCTORING SIMULATOR
   Main JavaScript
============================================ */

"use strict";

/* ---------- EXAM CONFIGURATION ---------- */

const EXAM_DURATION_MINUTES = 15;
const WARNING_LIMIT = 3;

const questions = [
  {
    question: "Which language is primarily used to structure web pages?",
    options: ["Python", "HTML", "C++", "SQL"],
    answer: 1,
    explanation: "HTML provides the structure and content of a web page."
  },
  {
    question: "Which CSS property changes the text color?",
    options: ["font-style", "background", "color", "text-weight"],
    answer: 2,
    explanation: "The CSS color property changes text color."
  },
  {
    question: "Which keyword declares a block-scoped variable in JavaScript?",
    options: ["varname", "let", "define", "dim"],
    answer: 1,
    explanation: "The let keyword declares a block-scoped variable."
  },
  {
    question: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Program Utility",
      "Control Processing User"
    ],
    answer: 0,
    explanation: "CPU stands for Central Processing Unit."
  },
  {
    question: "Which HTML element creates a hyperlink?",
    options: ["<link>", "<href>", "<a>", "<url>"],
    answer: 2,
    explanation: "The anchor element, <a>, creates hyperlinks."
  },
  {
    question: "Which method displays a message in the browser console?",
    options: [
      "document.message()",
      "console.log()",
      "print.console()",
      "browser.write()"
    ],
    answer: 1,
    explanation: "console.log() writes a message to the developer console."
  },
  {
    question: "Which protocol is commonly used for secure websites?",
    options: ["FTP", "HTTP only", "HTTPS", "SMTP"],
    answer: 2,
    explanation: "HTTPS encrypts communication between the browser and website."
  },
  {
    question: "Which data structure follows FIFO order?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    answer: 1,
    explanation: "A queue follows First In, First Out (FIFO)."
  },
  {
    question: "Which SQL command retrieves records from a table?",
    options: ["GET", "OPEN", "SELECT", "FETCH TABLE"],
    answer: 2,
    explanation: "SELECT retrieves data from database tables."
  },
  {
    question: "What is the result of 5 + 3 * 2 in JavaScript?",
    options: ["16", "11", "13", "10"],
    answer: 1,
    explanation: "Multiplication happens before addition, so the result is 11."
  }
];

/* ---------- APPLICATION STATE ---------- */

let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);
let remainingSeconds = EXAM_DURATION_MINUTES * 60;
let timerInterval = null;

let examStarted = false;
let examFinished = false;
let examStartTime = null;
let examEndTime = null;

let tabSwitchCount = 0;
let fullscreenExitCount = 0;
let warningCount = 0;

let events = [];
let riskScore = 0;
let fullscreenSupported = Boolean(document.documentElement.requestFullscreen);

/* ---------- DOM HELPERS ---------- */

function getElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function setText(ids, value) {
  const element = getElement(...ids);
  if (element) element.textContent = value;
}

function showElement(element) {
  if (element) {
    element.hidden = false;
    element.classList.remove("hidden");
  }
}

function hideElement(element) {
  if (element) {
    element.hidden = true;
    element.classList.add("hidden");
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

/* ---------- INITIALIZE APP ---------- */

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  bindButton(["startExamBtn", "startBtn", "beginExamBtn"], startExam);
  bindButton(["previousBtn", "prevBtn"], previousQuestion);
  bindButton(["nextBtn"], nextQuestion);
  bindButton(["markReviewBtn", "reviewBtn"], toggleReview);
  bindButton(["submitExamBtn", "submitBtn"], confirmSubmit);
  bindButton(["exportBtn", "downloadReportBtn"], exportReport);
  bindButton(["restartBtn", "retakeBtn"], restartExam);
  bindButton(["helpBtn"], openHelp);
  bindButton(["closeHelpBtn"], closeHelp);

  renderQuestionGrid();
  updateTimerDisplay();
  updateProgress();
  updateStartButton();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  // Initial log explains the simulator's limitations.
  logEvent(
    "INFO",
    "Simulator initialized. Monitoring uses browser events and demo rules; it is not an AI cheating detector."
  );
}

function bindButton(ids, handler) {
  const button = getElement(...ids);
  if (button) button.addEventListener("click", handler);
}

function updateStartButton() {
  const consent = getElement("consentCheckbox", "consent", "agreeConsent");
  const startButton = getElement("startExamBtn", "startBtn", "beginExamBtn");

  if (consent && startButton) {
    startButton.disabled = !consent.checked;
    consent.addEventListener("change", () => {
      startButton.disabled = !consent.checked;
    });
  }
}

/* ---------- START EXAM ---------- */

async function startExam() {
  if (examStarted || examFinished) return;

  const nameInput = getElement("studentName", "candidateName", "name");
  const emailInput = getElement("studentEmail", "candidateEmail", "email");
  const consent = getElement("consentCheckbox", "consent", "agreeConsent");

  if (nameInput && !nameInput.value.trim()) {
    alert("Please enter your name before starting the exam.");
    nameInput.focus();
    return;
  }

  if (consent && !consent.checked) {
    alert("Please read and accept the monitoring notice before continuing.");
    return;
  }

  const studentName = nameInput?.value.trim() || "Demo Student";
  const studentEmail = emailInput?.value.trim() || "Not provided";

  sessionStorage.setItem("examStudentName", studentName);
  sessionStorage.setItem("examStudentEmail", studentEmail);

  examStarted = true;
  examStartTime = new Date();

  logEvent("INFO", "Exam started.");

  hideElement(getElement("startScreen", "welcomeScreen", "landingScreen"));
  showElement(getElement("examScreen", "examContainer", "examSection"));

  renderQuestionGrid();
  renderQuestion();
  startTimer();

  if (fullscreenSupported) {
    try {
      await document.documentElement.requestFullscreen();
      logEvent("INFO", "Fullscreen mode enabled.");
    } catch {
      logEvent("INFO", "Fullscreen was not enabled. You can continue the exam.");
    }
  }

  updateProctoringPanel();
}

/* ---------- QUESTION RENDERING ---------- */

function renderQuestion() {
  const item = questions[currentQuestion];

  if (!item) return;

  setText(["questionNumber", "currentQuestionNumber"],
    `Question ${currentQuestion + 1} of ${questions.length}`);

  setText(["questionText", "questionTitle"], item.question);

  const optionsContainer = getElement("optionsContainer", "optionsList", "answerOptions");

  if (optionsContainer) {
    optionsContainer.replaceChildren();

    item.options.forEach((optionText, index) => {
      const label = document.createElement("label");
      label.className = "option option-item";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = String(index);
      input.checked = answers[currentQuestion] === index;

      const text = document.createElement("span");
      text.textContent = optionText;

      input.addEventListener("change", () => {
        answers[currentQuestion] = index;
        renderQuestionGrid();
        updateProgress();
        logEvent("ANSWER", `Answer selected for Question ${currentQuestion + 1}.`);
      });

      label.append(input, text);

      if (input.checked) {
        label.classList.add("selected");
      }

      optionsContainer.appendChild(label);
    });
  }

  const previousButton = getElement("previousBtn", "prevBtn");
  const nextButton = getElement("nextBtn");

  if (previousButton) previousButton.disabled = currentQuestion === 0;

  if (nextButton) {
    nextButton.textContent =
      currentQuestion === questions.length - 1 ? "Last Question" : "Next Question";
    nextButton.disabled = currentQuestion === questions.length - 1;
  }

  const reviewButton = getElement("markReviewBtn", "reviewBtn");
  if (reviewButton) {
    reviewButton.textContent = reviewFlags[currentQuestion]
      ? "Unmark Review"
      : "Mark for Review";
  }

  renderQuestionGrid();
  updateProgress();
}

function nextQuestion() {
  if (!examStarted || examFinished) return;

  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  }
}

function previousQuestion() {
  if (!examStarted || examFinished) return;

  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

/* ---------- QUESTION NAVIGATION ---------- */

let reviewFlags = new Array(questions.length).fill(false);

function renderQuestionGrid() {
  const grid = getElement("questionGrid", "questionNavigation", "questionNav");

  if (!grid) return;

  grid.replaceChildren();

  questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.setAttribute("aria-label", `Go to question ${index + 1}`);

    if (index === currentQuestion) button.classList.add("active");
    if (answers[index] !== null) button.classList.add("answered");
    if (reviewFlags[index]) button.classList.add("review");

    button.addEventListener("click", () => {
      if (!examStarted || examFinished) return;

      currentQuestion = index;
      renderQuestion();
    });

    grid.appendChild(button);
  });
}

function toggleReview() {
  if (!examStarted || examFinished) return;

  reviewFlags[currentQuestion] = !reviewFlags[currentQuestion];

  logEvent(
    "INFO",
    `Question ${currentQuestion + 1} ${
      reviewFlags[currentQuestion] ? "marked" : "unmarked"
    } for review.`
  );

  renderQuestion();
}

/* ---------- PROGRESS ---------- */

function updateProgress() {
  const answeredCount = answers.filter(answer => answer !== null).length;
  const percentage = (answeredCount / questions.length) * 100;

  setText(["answeredCount", "answeredQuestions"], answeredCount);
  setText(["totalQuestions"], questions.length);
  setText(["progressText"], `${Math.round(percentage)}% completed`);

  const progressBar = getElement("progressBar", "progressFill");

  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", String(Math.round(percentage)));
  }
}

/* ---------- EXAM TIMER ---------- */

function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (examFinished) {
      clearInterval(timerInterval);
      return;
    }

    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds === 300) {
      logEvent("WARNING", "Five minutes remain.");
    }

    if (remainingSeconds === 60) {
      logEvent("WARNING", "One minute remains.");
    }

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(timerInterval);
      logEvent("INFO", "Time limit reached. Exam submitted automatically.");
      finishExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timer = getElement("timer", "examTimer", "timeRemaining");

  if (timer) {
    timer.textContent = formatTime(remainingSeconds);

    timer.classList.toggle("warning", remainingSeconds <= 300 && remainingSeconds > 60);
    timer.classList.toggle("danger", remainingSeconds <= 60);
  }

  setText(["timerText"], formatTime(remainingSeconds));
}

/* ---------- PROCTORING SIMULATION ---------- */

// These are transparent browser-event signals, not proof of misconduct.
// The demo does not access the webcam or record audio/video.

function handleVisibilityChange() {
  if (!examStarted || examFinished) return;

  if (document.hidden) {
    tabSwitchCount++;
    warningCount++;

    logEvent(
      "WARNING",
      `Exam page became hidden. Visibility events: ${tabSwitchCount}.`
    );

    updateRiskScore();
    updateProctoringPanel();

    if (warningCount === WARNING_LIMIT) {
      showWarning(
        "Several page visibility events have occurred. This demo records events only; they do not prove cheating."
      );
    }
  } else {
    logEvent("INFO", "Exam page became visible again.");
    updateProctoringPanel();
  }
}

function handleFullscreenChange() {
  if (!examStarted || examFinished) return;

  if (!document.fullscreenElement) {
    fullscreenExitCount++;
    warningCount++;

    logEvent("WARNING", "Fullscreen mode exited.");
    updateRiskScore();
    updateProctoringPanel();
  } else {
    logEvent("INFO", "Fullscreen mode is active.");
  }
}

function updateRiskScore() {
  // A deliberately simple demonstration score, not an AI prediction.
  riskScore = Math.min(
    100,
    tabSwitchCount * 10 + fullscreenExitCount * 15
  );

  const riskElement = getElement("riskScore", "riskValue");
  const riskLabel = getElement("riskLabel", "riskStatus");

  if (riskElement) riskElement.textContent = `${riskScore}/100`;

  if (riskLabel) {
    if (riskScore < 25) {
      riskLabel.textContent = "Low demo signal";
      riskLabel.className = "risk-low";
    } else if (riskScore < 60) {
      riskLabel.textContent = "Moderate demo signal";
      riskLabel.className = "risk-medium";
    } else {
      riskLabel.textContent = "High demo signal";
      riskLabel.className = "risk-high";
    }
  }
}

function updateProctoringPanel() {
  setText(["tabSwitchCount", "tabSwitches"], tabSwitchCount);
  setText(["fullscreenExitCount", "fullscreenExits"], fullscreenExitCount);
  setText(["warningCount", "warnings"], warningCount);

  updateRiskScore();
}

function showWarning(message) {
  const warningArea = getElement("warningArea", "warningMessage", "alertBox");

  if (!warningArea) {
    alert(message);
    return;
  }

  warningArea.textContent = message;
  warningArea.classList.remove("hidden");
  warningArea.hidden = false;
}

/* ---------- EVENT LOG ---------- */

function logEvent(type, message) {
  const event = {
    time: new Date().toISOString(),
    type,
    message
  };

  events.push(event);

  const logContainer = getElement("eventLog", "proctoringLog", "logList");

  if (!logContainer) return;

  const item = document.createElement("div");
  item.className = "log-item";

  if (type === "WARNING") item.classList.add("warning");
  if (type === "ERROR") item.classList.add("danger");
  if (type === "ANSWER") item.classList.add("success");

  const title = document.createElement("p");
  title.textContent = message;

  const time = document.createElement("small");
  time.textContent = new Date(event.time).toLocaleTimeString();

  item.append(title, time);
  logContainer.prepend(item);
}

/* ---------- SUBMIT EXAM ---------- */

function confirmSubmit() {
  if (!examStarted || examFinished) return;

  const unanswered = answers.filter(answer => answer === null).length;

  const message = unanswered > 0
    ? `You have ${unanswered} unanswered question(s). Submit anyway?`
    : "Are you sure you want to submit your exam?";

  if (window.confirm(message)) {
    finishExam(false);
  }
}

function calculateResults() {
  let score = 0;

  questions.forEach((question, index) => {
    if (answers[index] === question.answer) score++;
  });

  return {
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
    answered: answers.filter(answer => answer !== null).length,
    unanswered: answers.filter(answer => answer === null).length
  };
}

function finishExam(autoSubmitted = false) {
  if (examFinished) return;

  examFinished = true;
  examStarted = false;
  examEndTime = new Date();

  clearInterval(timerInterval);

  logEvent(
    "INFO",
    autoSubmitted ? "Exam auto-submitted." : "Exam submitted by the student."
  );

  const result = calculateResults();

  renderResults(result, autoSubmitted);

  hideElement(getElement("examScreen", "examContainer", "examSection"));
  hideElement(getElement("startScreen", "welcomeScreen", "landingScreen"));
  showElement(getElement("resultScreen", "resultsScreen", "resultContainer"));

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- RESULTS DISPLAY ---------- */

function renderResults(result, autoSubmitted) {
  setText(
    ["resultTitle", "resultsTitle"],
    autoSubmitted ? "Time's Up!" : "Exam Completed!"
  );

  setText(["finalScore", "scoreValue"], `${result.score}/${result.total}`);
  setText(["percentageScore", "scorePercentage"], `${result.percentage}%`);
  setText(["correctAnswers"], result.score);
  setText(["incorrectAnswers"], result.answered - result.score);
  setText(["unansweredResults"], result.unanswered);
  setText(["resultAnswered"], result.answered);

  const studentName =
    sessionStorage.getItem("examStudentName") || "Demo Student";

  setText(["resultStudentName", "studentResultName"], studentName);

  const resultMessage = getElement("resultMessage", "feedbackMessage");

  if (resultMessage) {
    if (result.percentage >= 80) {
      resultMessage.textContent = "Excellent work! You demonstrated strong understanding.";
    } else if (result.percentage >= 60) {
      resultMessage.textContent = "Good effort! Review the questions you missed to improve.";
    } else {
      resultMessage.textContent = "Keep practicing. Review the explanations and try again.";
    }
  }

  renderAnswerReview();
}

function renderAnswerReview() {
  const reviewContainer = getElement("answerReview", "reviewContainer", "answersReview");

  if (!reviewContainer) return;

  reviewContainer.replaceChildren();

  questions.forEach((question, index) => {
    const correct = answers[index] === question.answer;
    const item = document.createElement("article");

    item.className = `review-item ${correct ? "correct" : "incorrect"}`;

    const title = document.createElement("h3");
    title.textContent = `Question ${index + 1}: ${question.question}`;

    const yourAnswer = document.createElement("p");
    yourAnswer.textContent = "Your answer: " +
      (answers[index] === null
        ? "Not answered"
        : question.options[answers[index]]);

    const correctAnswer = document.createElement("p");
    correctAnswer.textContent =
      `Correct answer: ${question.options[question.answer]}`;

    const explanation = document.createElement("p");
    explanation.textContent = `Explanation: ${question.explanation}`;

    item.append(title, yourAnswer, correctAnswer, explanation);
    reviewContainer.appendChild(item);
  });
}

/* ---------- EXPORT REPORT ---------- */

function exportReport() {
  const result = calculateResults();

  const report = {
    project: "Online Examination & Proctoring Simulator",
    reportType: "Demonstration report",
    student: {
      name: sessionStorage.getItem("examStudentName") || "Demo Student",
      email: sessionStorage.getItem("examStudentEmail") || "Not provided"
    },
    exam: {
      startedAt: examStartTime?.toISOString() || null,
      submittedAt: examEndTime?.toISOString() || null,
      durationMinutes: EXAM_DURATION_MINUTES,
      autoSubmitted: remainingSeconds <= 0,
      ...result
    },
    proctoring: {
      tabSwitchCount,
      fullscreenExitCount,
      warningCount,
      demoRiskScore: riskScore,
      disclaimer: "Browser-event demonstration only. Signals do not establish cheating or misconduct."
    },
    answers: questions.map((question, index) => ({
      question: question.question,
      selectedAnswer:
        answers[index] === null ? null : question.options[answers[index]],
      correctAnswer: question.options[question.answer],
      correct: answers[index] === question.answer,
      markedForReview: reviewFlags[index]
    })),
    eventLog: events
  };

  const blob = new Blob(
    [JSON.stringify(report, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "exam-report.json";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  logEvent("INFO", "Exam report exported as JSON.");
}

/* ---------- HELP ---------- */

function openHelp() {
  const modal = getElement("helpModal", "helpDialog");

  if (!modal) {
    alert(
      "Help: Select an answer, navigate between questions, and submit before the timer ends. Browser-event alerts are demonstration signals only."
    );
    return;
  }

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    showElement(modal);
  }
}

function closeHelp() {
  const modal = getElement("helpModal", "helpDialog");

  if (!modal) return;

  if (typeof modal.close === "function" && modal.open) {
    modal.close();
  } else {
    hideElement(modal);
  }
}

/* ---------- RESTART EXAM ---------- */

function restartExam() {
  clearInterval(timerInterval);

  currentQuestion = 0;
  answers = new Array(questions.length).fill(null);
  reviewFlags = new Array(questions.length).fill(false);

  remainingSeconds = EXAM_DURATION_MINUTES * 60;

  examStarted = false;
  examFinished = false;
  examStartTime = null;
  examEndTime = null;

  tabSwitchCount = 0;
  fullscreenExitCount = 0;
  warningCount = 0;
  riskScore = 0;
  events = [];

  const logContainer = getElement("eventLog", "proctoringLog", "logList");
  if (logContainer) logContainer.replaceChildren();

  const warningArea = getElement("warningArea", "warningMessage", "alertBox");
  if (warningArea) {
    warningArea.textContent = "";
    hideElement(warningArea);
  }

  hideElement(getElement("resultScreen", "resultsScreen", "resultContainer"));
  hideElement(getElement("examScreen", "examContainer", "examSection"));
  showElement(getElement("startScreen", "welcomeScreen", "landingScreen"));

  const consent = getElement("consentCheckbox", "consent", "agreeConsent");
  if (consent) consent.checked = false;

  updateStartButton();
  renderQuestionGrid();
  updateTimerDisplay();
  updateProgress();
  updateProctoringPanel();

  logEvent("INFO", "A new exam session is ready.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}


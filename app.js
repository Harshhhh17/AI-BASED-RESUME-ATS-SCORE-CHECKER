const themeBtn = document.querySelector("#themeBtn");
const resumeText = document.querySelector("#resumeText");
const jobText = document.querySelector("#jobText");
const analyzeBtn = document.querySelector("#analyzeBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const clearBtn = document.querySelector("#clearBtn");
const resumeFile = document.querySelector("#resumeFile");
const statusText = document.querySelector("#statusText");

const scoreRing = document.querySelector("#scoreRing");
const scoreValue = document.querySelector("#scoreValue");
const scoreTitle = document.querySelector("#scoreTitle");
const scoreSummary = document.querySelector("#scoreSummary");
const keywordMetric = document.querySelector("#keywordMetric");
const sectionMetric = document.querySelector("#sectionMetric");
const impactMetric = document.querySelector("#impactMetric");
const formatMetric = document.querySelector("#formatMetric");
const fixList = document.querySelector("#fixList");
const rewriteList = document.querySelector("#rewriteList");
const matchedKeywords = document.querySelector("#matchedKeywords");
const missingKeywords = document.querySelector("#missingKeywords");
const detailsBtn = document.querySelector("#detailsBtn");
const tipsBtn = document.querySelector("#tipsBtn");
const toast = document.querySelector("#toast");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalClose = document.querySelector("#modalClose");
const modalEyebrow = document.querySelector("#modalEyebrow");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");

let toastTimer;
let lastAnalysis = null;

const stopWords = new Set([
  "a", "about", "across", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "into", "is", "it", "of", "on", "or", "our", "that",
  "the", "their", "this", "to", "using", "with", "will", "you", "your", "we",
  "an", "can", "more", "new", "than", "within", "work", "team", "role"
]);

const sampleResume = `Jordan Lee
Product Analyst
jordan.lee@email.com | 555-230-1111 | linkedin.com/in/jordanlee

Summary
Product analyst with 4 years of experience improving SaaS onboarding, retention, and reporting workflows. Skilled in SQL, Tableau, experimentation, stakeholder management, and customer journey analysis.

Experience
Product Analyst, Northstar Software
2022 - Present
- Built Tableau dashboards that reduced weekly reporting time by 45% for product and sales leaders.
- Analyzed onboarding funnels with SQL and identified activation gaps, increasing trial-to-paid conversion by 18%.
- Partnered with engineering and design to launch 7 A/B tests across signup, billing, and lifecycle email flows.

Data Analyst, Bluefin Retail
2020 - 2022
- Automated monthly revenue reporting and improved forecast accuracy by 12%.
- Created customer segmentation models used by marketing for retention campaigns.

Skills
SQL, Tableau, Excel, Python, A/B testing, funnel analysis, product analytics, stakeholder communication

Education
B.S. Business Analytics, State University`;

const sampleJob = `We are hiring a Product Analyst to improve activation, retention, and monetization across a B2B SaaS product. The ideal candidate has strong SQL, Tableau or Looker experience, product analytics, experimentation, funnel analysis, KPI reporting, stakeholder communication, and the ability to translate customer behavior into product recommendations. Python and lifecycle analytics are a plus.`;

function normalize(text) {
  return text.toLowerCase().replace(/[^\w+#./ -]/g, " ");
}

function words(text) {
  return normalize(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function topTerms(text, limit = 26) {
  const counts = new Map();
  words(text).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function percent(value) {
  return `${Math.round(value)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function renderList(node, items) {
  node.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No urgent issues found.";
    node.append(empty);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    node.append(li);
  });
}

function renderChips(node, terms, emptyText) {
  node.innerHTML = "";
  if (!terms.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = emptyText;
    node.append(empty);
    return;
  }
  terms.forEach((term) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = term;
    node.append(chip);
  });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function openPopup(title, eyebrow, html) {
  modalTitle.textContent = title;
  modalEyebrow.textContent = eyebrow;
  modalBody.innerHTML = html;
  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function closePopup() {
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

function metricExplanation(type) {
  const explanations = {
    keyword: {
      title: "Keyword match",
      body: "This checks how many important words from the job description also appear in your resume. Add missing terms only when they honestly describe your experience."
    },
    section: {
      title: "Section health",
      body: "This checks whether your resume has standard ATS-friendly sections like Summary, Experience, Skills, Education, and contact details."
    },
    impact: {
      title: "Impact signals",
      body: "This rewards measurable results, action verbs, and clear bullets. Strong ATS resumes show what changed because of your work."
    },
    format: {
      title: "ATS format",
      body: "This looks for parsing risks such as unusual symbols, table-like spacing, very long lines, and missing standard headings."
    }
  };
  const item = explanations[type];
  if (!item) return;
  const score = document.querySelector(`[data-popup="${type}"] span`)?.textContent || "0%";
  openPopup(
    item.title,
    "Metric insight",
    `<p><strong>Current score:</strong> ${score}</p><p>${item.body}</p>`
  );
}

function openScoreDetails() {
  if (!lastAnalysis) {
    openPopup(
      "Score details",
      "Resume insight",
      "<p>Run an analysis first, then this popup will show your latest score breakdown.</p>"
    );
    return;
  }

  openPopup(
    "Score details",
    "Resume insight",
    `<p><strong>Overall ATS score:</strong> ${lastAnalysis.total}/100</p>
    <ul>
      <li>Keyword match contributes 38% of the final score.</li>
      <li>Section health contributes 22% of the final score.</li>
      <li>Impact signals contribute 24% of the final score.</li>
      <li>ATS format contributes 16% of the final score.</li>
    </ul>
    <p>Your resume matched <strong>${lastAnalysis.matchedCount}</strong> of <strong>${lastAnalysis.termCount}</strong> target terms.</p>`
  );
}

function openTips() {
  openPopup(
    "ATS improvement tips",
    "Quick guidance",
    `<ul>
      <li>Use the exact job title and core tools from the job description when they apply.</li>
      <li>Keep headings simple: Summary, Experience, Skills, Education, Certifications.</li>
      <li>Write bullets with action, tool, and result: Improved onboarding by 18% using SQL funnel analysis.</li>
      <li>Avoid tables, text boxes, icons, and heavy graphics in ATS versions of your resume.</li>
    </ul>`
  );
}

function analyzeResume() {
  const resume = resumeText.value.trim();
  const job = jobText.value.trim();
  if (!resume) {
    statusText.textContent = "Paste a resume first.";
    resumeText.focus();
    return;
  }

  const jobTerms = job ? topTerms(job) : topTerms(resume, 18);
  const resumeTokens = new Set(words(resume));
  const matched = jobTerms.filter((term) => resumeTokens.has(term));
  const missing = jobTerms.filter((term) => !resumeTokens.has(term)).slice(0, 14);
  const keywordScore = jobTerms.length ? (matched.length / jobTerms.length) * 100 : 62;

  const sectionChecks = [
    { name: "contact details", ok: /@|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|linkedin/i.test(resume) },
    { name: "summary", ok: /\b(summary|profile|objective)\b/i.test(resume) },
    { name: "experience", ok: /\b(experience|employment|work history)\b/i.test(resume) },
    { name: "skills", ok: /\b(skills|technical skills|tools)\b/i.test(resume) },
    { name: "education", ok: /\b(education|degree|university|college)\b/i.test(resume) }
  ];
  const sectionScore = (sectionChecks.filter((item) => item.ok).length / sectionChecks.length) * 100;

  const bulletCount = (resume.match(/(^|\n)\s*[-*]/g) || []).length;
  const numberCount = (resume.match(/\b\d+%?|\$\d+|\d+x\b/gi) || []).length;
  const actionVerbCount = (resume.match(/\b(led|built|created|improved|reduced|increased|launched|managed|designed|automated|analyzed|delivered|optimized|partnered|owned)\b/gi) || []).length;
  const impactScore = clamp(numberCount * 9 + actionVerbCount * 5 + bulletCount * 2, 0, 100);

  const riskyFormatting = [
    { name: "tables or columns", bad: /\t| {6,}/.test(resume) },
    { name: "graphics or decorative symbols", bad: /[<>|{}[\]~^]/.test(resume) },
    { name: "very long lines", bad: resume.split("\n").some((line) => line.length > 150) },
    { name: "headers hidden in unusual casing", bad: !/\b(experience|skills|education)\b/i.test(resume) }
  ];
  const formatScore = 100 - riskyFormatting.filter((item) => item.bad).length * 20;

  const total = Math.round(
    keywordScore * 0.38 + sectionScore * 0.22 + impactScore * 0.24 + formatScore * 0.16
  );
  lastAnalysis = {
    total,
    keywordScore,
    sectionScore,
    impactScore,
    formatScore,
    matchedCount: matched.length,
    termCount: jobTerms.length
  };

  const fixes = [];
  if (job && missing.length) fixes.push(`Add relevant missing keywords naturally: ${missing.slice(0, 6).join(", ")}.`);
  sectionChecks.filter((item) => !item.ok).forEach((item) => fixes.push(`Add a clear ${item.name} section using a standard heading.`));
  if (numberCount < 5) fixes.push("Add more measurable outcomes, such as percentages, time saved, revenue, volume, or accuracy improvements.");
  if (bulletCount < 6) fixes.push("Use concise bullet points for experience so ATS systems and recruiters can scan achievements quickly.");
  riskyFormatting.filter((item) => item.bad).forEach((item) => fixes.push(`Reduce ATS parsing risk from ${item.name}.`));

  const rewrites = [
    "Start bullets with strong action verbs, then add the business result: Improved X by Y using Z.",
    "Mirror exact role terms from the job description only when they truthfully fit your experience.",
    "Keep section headings simple: Summary, Experience, Skills, Education, Certifications.",
    "Group skills by category if you have many tools, such as Analytics, Programming, Platforms, and Methods."
  ];

  scoreRing.style.setProperty("--score", total);
  scoreValue.textContent = total;
  scoreTitle.textContent = total >= 85 ? "Strong ATS match" : total >= 70 ? "Good base with clear upgrade paths" : "Needs targeted optimization";
  scoreSummary.textContent = job
    ? `Your resume matches ${matched.length} of ${jobTerms.length} target terms. Improve the score by closing keyword gaps and sharpening quantified achievements.`
    : "Add a job description for a sharper match score. This general scan still checks structure, impact, readability, and ATS parsing risk.";

  keywordMetric.textContent = percent(keywordScore);
  sectionMetric.textContent = percent(sectionScore);
  impactMetric.textContent = percent(impactScore);
  formatMetric.textContent = percent(formatScore);

  renderList(fixList, fixes.slice(0, 7));
  renderList(rewriteList, rewrites);
  renderChips(matchedKeywords, matched.slice(0, 16), "No keyword matches yet.");
  renderChips(missingKeywords, missing, "No missing keywords found.");
}

function safeRenderChips() {
  const job = jobText.value.trim();
  const resume = resumeText.value.trim();
  const jobTerms = job ? topTerms(job) : [];
  const resumeTokens = new Set(words(resume));
  const matched = jobTerms.filter((term) => resumeTokens.has(term));
  const missing = jobTerms.filter((term) => !resumeTokens.has(term)).slice(0, 14);
  renderChips(matchedKeywords, matched.slice(0, 16), "No keyword matches yet.");
  renderChips(missingKeywords, missing, "No missing keywords found.");
}

function loadSample() {
  resumeText.value = sampleResume;
  jobText.value = sampleJob;
  statusText.textContent = "Sample loaded.";
  analyzeResume();
  showToast("Sample resume loaded and analyzed.");
}

function clearAll(silent = false) {
  resumeText.value = "";
  jobText.value = "";
  statusText.textContent = "Cleared.";
  scoreRing.style.setProperty("--score", 0);
  scoreValue.textContent = "--";
  scoreTitle.textContent = "Add your resume to begin";
  scoreSummary.textContent = "The checker reviews keyword fit, section structure, measurable impact, readability, and common ATS parsing risks.";
  [keywordMetric, sectionMetric, impactMetric, formatMetric].forEach((node) => {
    node.textContent = "0%";
  });
  renderList(fixList, []);
  renderList(rewriteList, []);
  renderChips(matchedKeywords, [], "No keyword matches yet.");
  renderChips(missingKeywords, [], "No missing keywords found.");
  lastAnalysis = null;
  if (!silent) showToast("Inputs and results cleared.");
}

analyzeBtn.addEventListener("click", () => {
  analyzeResume();
  safeRenderChips();
  statusText.textContent = "Analysis complete.";
  if (resumeText.value.trim()) showToast("Analysis complete. Click any metric for details.");
});

sampleBtn.addEventListener("click", loadSample);
clearBtn.addEventListener("click", () => clearAll());

resumeFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  resumeText.value = await file.text();
  statusText.textContent = `${file.name} loaded.`;
  showToast(`${file.name} loaded.`);
});

detailsBtn.addEventListener("click", openScoreDetails);
tipsBtn.addEventListener("click", openTips);
modalClose.addEventListener("click", closePopup);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closePopup();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePopup();
});
document.querySelectorAll(".metric").forEach((metric) => {
  metric.addEventListener("click", () => metricExplanation(metric.dataset.popup));
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("resumeTheme", isDark ? "dark" : "light");

  showToast(isDark ? "Dark mode enabled." : "Light mode enabled.");
});

if (localStorage.getItem("resumeTheme") === "dark") {
  document.body.classList.add("dark");
}

clearAll(true);

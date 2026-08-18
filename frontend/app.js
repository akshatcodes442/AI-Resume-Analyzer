"use strict";

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8001"
        : "https://ai-resume-analyzer-api-gr6p.onrender.com";

const resumeFile = document.getElementById("resumeFile");
let selectedFile = null;
const fileName = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");

const resultFile = document.getElementById("resultFile");
const atsScore = document.getElementById("atsScore");
const rating = document.getElementById("rating");

const skills = document.getElementById("skills");
const skillCount = document.getElementById("skillCount");

const email = document.getElementById("email");
const phone = document.getElementById("phone");

const education = document.getElementById("education");
const experience = document.getElementById("experience");

const breakdown = document.getElementById("breakdown");
const resumeText = document.getElementById("resumeText");
const wordCount = document.getElementById("wordCount");
const suggestionsContainer =
    document.getElementById("suggestions");

const suggestionPriority =
    document.getElementById("suggestionPriority");
const downloadReportBtn =
    document.getElementById("downloadReportBtn");
/* =========================================================
   FILE SELECTION
   ========================================================= */

resumeFile.addEventListener("change", () => {

    const file = resumeFile.files[0];

selectedFile = file || null;

    hideError();

    if (!file) {
        fileName.textContent = "";
        analyzeBtn.disabled = true;
        return;
    }

    if (file.type !== "application/pdf") {
        showError("Please select a valid PDF resume.");
        resumeFile.value = "";
        fileName.textContent = "";
        analyzeBtn.disabled = true;
        return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
        showError("PDF size must be less than 10 MB.");
        resumeFile.value = "";
        fileName.textContent = "";
        analyzeBtn.disabled = true;
        return;
    }

    fileName.textContent = file.name;
    analyzeBtn.disabled = false;

    results.classList.add("hidden");
});


/* =========================================================
   ANALYZE BUTTON
   ========================================================= */

analyzeBtn.addEventListener("click", analyzeResume);


async function analyzeResume() {

    const file = resumeFile.files[0];

    if (!file) {
        showError("Please select a PDF resume first.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    hideError();
    results.classList.add("hidden");

    try {

        const response = await fetch(
            `${API_URL}/analyze-resume`,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Resume analysis failed."
            );
        }

        // Store the latest analysis globally
        // for premium AKSH AI result components.
        window.lastAnalysisResult = data;

        displayResults(data);

        // Render premium ATS breakdown.
        if (
            data &&
            data.ats_score &&
            data.ats_score.breakdown
        ) {
            renderAKSHBreakdown(
                data.ats_score.breakdown
            );
        }

    } catch (error) {

        console.error("Analysis Error:", error);

        showError(
            error.message ||
            "Unable to connect to the Resume Analyzer API."
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   DISPLAY RESULTS
   ========================================================= */

function displayResults(data) {

    const analysis = data.analysis || {};
    const ats = data.ats_score || {};
    const suggestionsData = data.suggestions || {};

    resultFile.textContent =
        data.filename || "-";


    /* ATS SCORE */

    const currentScore =
        Number(ats.ats_score ?? 0);

    // Premium ATS score animation
    atsScore.textContent = 0;
    animateAKSHScore(currentScore);

    const scoreCircle =
        document.querySelector(".score-circle");

    if (scoreCircle) {
        const safeScore =
            Math.max(0, Math.min(100, currentScore));

        scoreCircle.style.setProperty(
            "--score-deg",
            `${safeScore * 3.6}deg`
        );
    }

    rating.textContent =
        ats.rating || "-";


    /* SKILLS */

    skills.innerHTML = "";

    const skillList =
        Array.isArray(analysis.skills)
            ? analysis.skills
            : [];

    if (skillList.length === 0) {

        skills.innerHTML =
            `<span class="muted">No skills detected</span>`;

    } else {

        skillList.forEach(skill => {

            const tag =
                document.createElement("span");

            tag.className = "tag";
            tag.textContent = skill;

            skills.appendChild(tag);
        });
    }

    skillCount.textContent =
        `${analysis.skill_count || 0} skill(s) detected`;


    /* CONTACT */

    email.textContent =
        analysis.email || "Not detected";

    phone.textContent =
        analysis.phone || "Not detected";


    /* EDUCATION */

    renderTags(
        education,
        analysis.education_keywords,
        "No education keywords detected"
    );


    /* EXPERIENCE */

    renderTags(
        experience,
        analysis.experience_mentions,
        "No experience mentions detected"
    );


    /* SCORE BREAKDOWN */

    renderBreakdown(
        ats.breakdown || {}
    );
renderSuggestions(
    suggestionsContainer,
    suggestionPriority,
    suggestionsData
);


    /* RESUME TEXT */

    resumeText.textContent =
        data.extracted_text ||
        "Text extraction successful. Full text is available from the backend.";

    wordCount.textContent =
        `${ats.word_count || 0} words`;


    /* SHOW RESULTS */

    results.classList.remove("hidden");
downloadReportBtn.onclick = () => {
    downloadReport(data);
};   
 results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* ========================================================
   TAG RENDERER
   ========================================================= */
function renderSuggestions(container, priorityElement, data) {

    container.innerHTML = "";

    priorityElement.textContent =
        data.priority || "Review";

    if (!Array.isArray(data.suggestions) ||
        data.suggestions.length === 0) {

        priorityElement.className =
            "suggestion-priority success";

        priorityElement.textContent =
            "Excellent";

        container.innerHTML = `
            <div class="suggestion-success">
                <span class="success-icon">✓</span>

                <div>
                    <strong>No major issues found</strong>
                    <p>
                        Your resume looks strong based on
                        the current ATS analysis.
                    </p>
                </div>
            </div>
        `;

        return;
    }

    priorityElement.className =
        "suggestion-priority";

    data.suggestions.forEach((suggestion, index) => {

        const item =
            document.createElement("div");

        item.className = "suggestion-item";

        item.innerHTML = `
            <span class="suggestion-number">
                ${index + 1}
            </span>

            <p>${suggestion}</p>
        `;

        container.appendChild(item);
    });
}

function renderTags(container, items, emptyMessage) {
    container.innerHTML = "";

    if (!items || !items.length) {
        container.innerHTML = `<span class="muted">${emptyMessage}</span>`;
        return;
    }

    const skills = Array.isArray(items)
        ? items
        : String(items)
            .split(/[,|]+/)
            .map(item => item.trim())
            .filter(Boolean);

    skills.forEach(skill => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = skill;
        container.appendChild(tag);
    });
}


/* =========================================================
   SCORE BREAKDOWN
   ========================================================= */

function renderBreakdown(data) {

    breakdown.innerHTML = "";

    const entries =
        Object.entries(data);

    if (entries.length === 0) {

        breakdown.innerHTML =
            `<p class="muted">No score breakdown available.</p>`;

        return;
    }

    entries.forEach(([key, value]) => {

        const row =
            document.createElement("div");

        row.className = "breakdown-row";

        const label =
            document.createElement("span");

        label.textContent =
            formatLabel(key);

        const score =
            document.createElement("strong");

        score.textContent =
            `${value}`;

        row.appendChild(label);
        row.appendChild(score);

        breakdown.appendChild(row);
    });
}


/* =========================================================
   LABEL FORMATTER
   ========================================================= */

function formatLabel(text) {

    return String(text)
        .replace(/_/g, " ")
        .replace(/\b\w/g, char =>
            char.toUpperCase()
        );
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(isLoading) {

    if (isLoading) {

        loading.classList.remove("hidden");

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "Analyzing...";

    } else {

        loading.classList.add("hidden");

        analyzeBtn.disabled =
            !resumeFile.files.length;

        analyzeBtn.textContent =
            "Analyze Resume";
    }
}


/* =========================================================
   ERROR HANDLING
   ========================================================= */

function showError(message) {

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}


function hideError() {

    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}
/* =========================================================
   DOWNLOAD ANALYSIS REPORT
   ========================================================= */

function downloadReport(data) {
    const score = data?.ats_score?.ats_score ?? 0;
    const rating = data?.ats_score?.rating ?? "N/A";

    const breakdown = data?.ats_score?.breakdown ?? {};
    const analysis = data?.analysis ?? {};
    const suggestions = data?.suggestions?.suggestions ?? [];

    const skills = analysis.skills?.length
        ? analysis.skills.join(", ")
        : "No skills detected";

    const education = analysis.education_keywords?.length
        ? analysis.education_keywords.join(", ")
        : "No education keywords detected";

    const experience = analysis.experience_mentions?.length
        ? analysis.experience_mentions.join(", ")
        : "No experience detected";

    const email = analysis.email || "Not detected";
    const phone = analysis.phone || "Not detected";

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Please allow pop-ups to generate the report.");
        return;
    }

    reportWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<title>AI Resume ATS Report</title>

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 40px;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;

    background: #f4f7fb;
    color: #172033;
}

.report {
    max-width: 900px;
    margin: auto;
    background: white;
    padding: 45px;
    border-radius: 18px;
    box-shadow: 0 15px 50px rgba(0,0,0,0.08);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;

    padding-bottom: 25px;
    border-bottom: 2px solid #edf1f7;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-box {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;

    border-radius: 12px;

    background:
        linear-gradient(
            135deg,
            #4f8cff,
            #7c3aed
        );

    color: white;
    font-weight: 900;
}

.logo h1 {
    margin: 0;
    font-size: 20px;
}

.logo p {
    margin: 4px 0 0;
    color: #7b8799;
    font-size: 12px;
}

.date {
    color: #7b8799;
    font-size: 12px;
}

.hero {
    margin-top: 35px;
    padding: 30px;

    border-radius: 16px;

    background:
        linear-gradient(
            135deg,
            #f1f6ff,
            #f8f5ff
        );

    display: flex;
    align-items: center;
    gap: 30px;
}

.score {
    width: 140px;
    height: 140px;

    min-width: 140px;

    border-radius: 50%;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    background:
        conic-gradient(
            #4f8cff ${score * 3.6}deg,
            #e7edf7 ${score * 3.6}deg
        );
}

.score-inner {
    width: 108px;
    height: 108px;

    border-radius: 50%;

    background: white;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.score-number {
    font-size: 34px;
    font-weight: 900;
}

.score-total {
    font-size: 11px;
    color: #8a95a5;
}

.hero-info h2 {
    margin: 0 0 7px;
    font-size: 28px;
}

.hero-info p {
    margin: 0;
    color: #6d7889;
    line-height: 1.6;
}

.section {
    margin-top: 30px;
}

.section-title {
    margin-bottom: 15px;

    font-size: 17px;
    font-weight: 800;

    color: #172033;
}

.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.card {
    padding: 20px;

    border: 1px solid #e8edf4;
    border-radius: 13px;

    background: #fff;
}

.card h3 {
    margin: 0 0 14px;
    font-size: 14px;
}

.card p {
    margin: 7px 0;
    color: #596579;
    font-size: 13px;
    line-height: 1.6;
}

.label {
    color: #8a95a5;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
}

.tag {
    padding: 6px 10px;

    border-radius: 7px;

    background: #f0f5ff;
    color: #3269d6;

    font-size: 11px;
    font-weight: 700;
}

.breakdown-item {
    margin-bottom: 16px;
}

.breakdown-header {
    display: flex;
    justify-content: space-between;

    margin-bottom: 6px;

    font-size: 12px;
    font-weight: 700;
}

.bar {
    height: 8px;

    border-radius: 20px;

    background: #edf1f7;

    overflow: hidden;
}

.fill {
    height: 100%;

    background:
        linear-gradient(
            90deg,
            #4f8cff,
            #7c3aed
        );

    border-radius: inherit;
}

.suggestion {
    display: flex;
    gap: 12px;

    padding: 13px;

    margin-bottom: 9px;

    background: #f8faff;

    border: 1px solid #e7edf7;

    border-radius: 10px;

    font-size: 12px;

    line-height: 1.6;
}

.number {
    width: 25px;
    height: 25px;

    min-width: 25px;

    display: grid;
    place-items: center;

    border-radius: 7px;

    background: #eaf1ff;

    color: #3269d6;

    font-weight: 900;
}

.resume-text {
    padding: 18px;

    background: #f7f9fc;

    border-radius: 10px;

    white-space: pre-wrap;

    font-family: monospace;

    font-size: 11px;

    line-height: 1.7;

    color: #536074;
}

.footer {
    margin-top: 35px;
    padding-top: 20px;

    border-top: 1px solid #edf1f7;

    text-align: center;

    color: #8a95a5;

    font-size: 11px;
}

.print-button {
    margin: 25px auto 0;

    display: block;

    padding: 12px 22px;

    border: none;
    border-radius: 9px;

    background: #4f8cff;

    color: white;

    font-weight: 800;

    cursor: pointer;
}

@media print {

    body {
        padding: 0;
        background: white;
    }

    .report {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
    }

    .print-button {
        display: none;
    }
}

@media (max-width: 650px) {

    body {
        padding: 15px;
    }

    .report {
        padding: 25px;
    }

    .hero {
        flex-direction: column;
        text-align: center;
    }

    .grid {
        grid-template-columns: 1fr;
    }

    .header {
        flex-direction: column;
        align-items: flex-start;
    }
}

</style>
</head>

<body>

<div class="report">

    <div class="header">

        <div class="logo">

            <div class="logo-box">
                AI
            </div>

            <div>
                <h1>AI Resume Analyzer</h1>
                <p>Professional ATS Resume Report</p>
            </div>

        </div>

        <div class="date">
            ${new Date().toLocaleDateString()}
        </div>

    </div>


    <div class="hero">

        <div class="score">

            <div class="score-inner">

                <div class="score-number">
                    ${score}
                </div>

                <div class="score-total">
                    ATS SCORE / 100
                </div>

            </div>

        </div>


        <div class="hero-info">

            <h2>${rating}</h2>

            <p>
                Your resume has been analyzed based on
                ATS compatibility, skills, contact information,
                education, experience and resume structure.
            </p>

        </div>

    </div>


    <div class="section">

        <div class="section-title">
            Resume Information
        </div>

        <div class="grid">

            <div class="card">

                <h3>Contact Information</h3>

                <p>
                    <span class="label">Email:</span>
                    ${email}
                </p>

                <p>
                    <span class="label">Phone:</span>
                    ${phone}
                </p>

            </div>


            <div class="card">

                <h3>Resume Statistics</h3>

                <p>
                    <span class="label">Word Count:</span>
                    ${data?.ats_score?.word_count ?? 0}
                </p>

                <p>
                    <span class="label">Extracted Text:</span>
                    ${data?.text_length ?? 0} characters
                </p>

            </div>

        </div>

    </div>


    <div class="section">

        <div class="section-title">
            Skills Analysis
        </div>

        <div class="card">

            <div class="tags">

                ${
                    analysis.skills?.length
                    ? analysis.skills.map(skill =>
                        `<span class="tag">${skill}</span>`
                    ).join("")
                    : `<span class="label">No skills detected</span>`
                }

            </div>

        </div>

    </div>


    <div class="section">

        <div class="section-title">
            Education & Experience
        </div>

        <div class="grid">

            <div class="card">

                <h3>Education</h3>

                <p>${education}</p>

            </div>


            <div class="card">

                <h3>Experience</h3>

                <p>${experience}</p>

            </div>

        </div>

    </div>


    <div class="section">

        <div class="section-title">
            ATS Score Breakdown
        </div>

        <div class="card">

            ${Object.entries(breakdown).map(([key, value]) => {

                const max =
                    key === "resume_length"
                    ? 10
                    : key === "education"
                    ? 10
                    : 20;

                const percentage =
                    Math.min((value / max) * 100, 100);

                const label =
                    key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase());

                return `
                    <div class="breakdown-item">

                        <div class="breakdown-header">

                            <span>${label}</span>

                            <span>${value}</span>

                        </div>

                        <div class="bar">

                            <div
                                class="fill"
                                style="width:${percentage}%">
                            </div>

                        </div>

                    </div>
                `;

            }).join("")}

        </div>

    </div>


    <div class="section">

        <div class="section-title">
            AI Resume Improvement Suggestions
        </div>

        ${
            suggestions.length
            ? suggestions.map((item, index) => `
                <div class="suggestion">

                    <div class="number">
                        ${index + 1}
                    </div>

                    <div>
                        ${item}
                    </div>

                </div>
            `).join("")
            : `
                <div class="card">
                    No improvement suggestions available.
                </div>
            `
        }

    </div>


    <div class="section">

        <div class="section-title">
            Extracted Resume Text
        </div>

        <div class="resume-text">
            ${data?.text || "No text extracted."}
        </div>

    </div>


    <button
        class="print-button"
        onclick="window.print()">

        Download / Save as PDF

    </button>


    <div class="footer">

        AI Resume Analyzer
        •
        FastAPI & Python
        •
        Professional ATS Report

    </div>

</div>

</body>
</html>
    `);

    reportWindow.document.close();
}


function formatReportList(items) {

    if (!items) {
        return "None detected";
    }

    if (!Array.isArray(items)) {
        return String(items);
    }

    if (items.length === 0) {
        return "None detected";
    }

    return items
        .map(item => `• ${item}`)
        .join("\n");
}


function formatReportBreakdown(data) {

    const entries = Object.entries(data);

    if (entries.length === 0) {
        return "No breakdown available";
    }

    return entries
        .map(([key, value]) =>
            `${formatLabel(key)}: ${value}`
        )
        .join("\n");
}


function removeExtension(filename) {

    return filename
        .replace(/\.[^/.]+$/, "");
}

const jobDescription =
    document.getElementById("jobDescription");

const jobMatchBtn =
    document.getElementById("jobMatchBtn");

const jobMatchLoading =
    document.getElementById("jobMatchLoading");

const jobMatchError =
    document.getElementById("jobMatchError");

const jobMatchResults =
    document.getElementById("jobMatchResults");


jobDescription.addEventListener("input", () => {

    const hasResume =
        selectedFile !== null;

    const hasJobDescription =
        jobDescription.value.trim().length > 20;

    jobMatchBtn.disabled =
        !(hasResume && hasJobDescription);

});


jobMatchBtn.addEventListener("click", async () => {

    if (!selectedFile) {
        showJobMatchError(
            "Please analyze your resume first."
        );
        return;
    }

    const description =
        jobDescription.value.trim();

    if (!description) {
        showJobMatchError(
            "Please paste a job description."
        );
        return;
    }

    jobMatchLoading.classList.remove("hidden");

    jobMatchError.classList.add("hidden");

    jobMatchResults.classList.add("hidden");

    try {

        const resumeResponse =
            await fetch(
                `${API_URL}/analyze-resume`,
                {
                    method: "POST",
                    body: (() => {

                        const formData =
                            new FormData();

                        formData.append(
                            "file",
                            selectedFile
                        );

                        return formData;

                    })()
                }
            );

        if (!resumeResponse.ok) {
            throw new Error(
                "Resume analysis failed."
            );
        }

        const resumeData =
            await resumeResponse.json();


        const response =
            await fetch(
                `${API_URL}/job-match`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        resume_text:
                            resumeData.resume_text || resumeData.resume_text || resumeData.text || "",

                        job_description:
                            description

                    })
                }
            );


        if (!response.ok) {
            throw new Error(
                "Job matching failed."
            );
        }


        const data =
            await response.json();


        renderJobMatch(data);

    }

    catch (error) {

        console.error(
            "Job Match Error:",
            error
        );

        showJobMatchError(
            "Unable to match resume. Please check that the API is running."
        );

    }

    finally {

        jobMatchLoading
            .classList
            .add("hidden");

    }

});


function renderJobMatch(data) {

    const score = Math.max(
        0,
        Math.min(100, Number(data.match_score) || 0)
    );

    const scoreElement =
        document.getElementById("matchScore");

    const ratingElement =
        document.getElementById("matchRating");

    const matchingElement =
        document.getElementById("matchingSkills");

    const missingElement =
        document.getElementById("missingSkills");

    const recommendations =
        document.getElementById("jobRecommendations");

    if (scoreElement) {
        scoreElement.textContent = score;
    }

    renderSkillGapAnalysis(data);

    if (ratingElement) {
        ratingElement.textContent =
            data.rating || "-";
    }

    /* =========================================
       MATCHING SKILLS
    ========================================= */

    if (matchingElement) {
        matchingElement.innerHTML =
            renderJobTags(
                data.matching_skills,
                "No matching skills detected."
            );
    }

    /* =========================================
       MISSING SKILLS
    ========================================= */

    if (missingElement) {
        missingElement.innerHTML =
            renderJobTags(
                data.missing_skills,
                "No major missing skills."
            );
    }

    /* =========================================
       REQUIRED SKILLS
    ========================================= */

    const requiredElement =
        document.getElementById("requiredSkills");

    if (requiredElement) {
        requiredElement.innerHTML =
            renderJobTags(
                data.required_skills,
                "No required skills detected."
            );
    }

    /* =========================================
       RECOMMENDATIONS
    ========================================= */

    if (recommendations) {

        recommendations.innerHTML = "";

        const items =
            Array.isArray(data.recommendations)
                ? data.recommendations
                : [];

        if (!items.length) {

            recommendations.innerHTML = `
                <div class="job-recommendation success">
                    <span>✓</span>
                    <p>
                        Your resume is well aligned
                        with this job description.
                    </p>
                </div>
            `;

        } else {

            items.forEach((item, index) => {

                const div =
                    document.createElement("div");

                div.className =
                    "job-recommendation";

                div.innerHTML = `
                    <span>${index + 1}</span>
                    <p>${item}</p>
                `;

                recommendations.appendChild(div);
            });
        }
    }

    /* =========================================
       PREMIUM SCORE CIRCLE
    ========================================= */

    const circle =
        document.querySelector(
            ".match-score-circle"
        );

    if (circle) {

        circle.style.setProperty(
            "--match-deg",
            `${score * 3.6}deg`
        );
    }

    /* =========================================
       PREMIUM SCORE ANIMATION
    ========================================= */

    animateJobMatchScore(score);

    /* =========================================
       SHOW RESULTS
    ========================================= */

    if (jobMatchResults) {

        jobMatchResults
            .classList
            .remove("hidden");

        jobMatchResults
            .scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }
}


/* =========================================
   JOB MATCH SCORE ANIMATION
========================================= */

function animateJobMatchScore(target) {

    const element =
        document.getElementById("matchScore");

    if (!element) return;

    const finalScore = Math.max(
        0,
        Math.min(100, Number(target) || 0)
    );

    const duration = 1000;
    const start = performance.now();

    function update(now) {

        const progress =
            Math.min(
                (now - start) / duration,
                1
            );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const current =
            Math.round(
                finalScore * eased
            );

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = finalScore;
        }
    }

    requestAnimationFrame(update);
}



function renderSkillGapAnalysis(data) {

    const required =
        Array.isArray(data.required_skills)
            ? data.required_skills.length
            : 0;

    const matching =
        Array.isArray(data.matching_skills)
            ? data.matching_skills.length
            : 0;

    const missing =
        Array.isArray(data.missing_skills)
            ? data.missing_skills.length
            : 0;

    let readiness =
        Number(data.match_score) || 0;

    readiness = Math.max(
        0,
        Math.min(100, Math.round(readiness))
    );


    const percent =
        document.getElementById("skillGapPercent");

    const matched =
        document.getElementById("skillGapMatched");

    const missingElement =
        document.getElementById("skillGapMissing");

    const requiredElement =
        document.getElementById("skillGapRequired");

    const progress =
        document.getElementById("skillGapProgress");

    const message =
        document.getElementById("skillGapMessage");


    if (percent) {
        percent.textContent =
            `${readiness}%`;
    }

    if (matched) {
        matched.textContent =
            matching;
    }

    if (missingElement) {
        missingElement.textContent =
            missing;
    }

    if (requiredElement) {
        requiredElement.textContent =
            required;
    }


    if (progress) {

        requestAnimationFrame(() => {

            progress.style.width =
                `${readiness}%`;

        });

    }


    if (message) {

        if (readiness >= 85) {

            message.textContent =
                "Excellent readiness. Your skill profile is strongly aligned with this role.";

        } else if (readiness >= 70) {

            message.textContent =
                "Good readiness. A few improvements can make your profile even stronger.";

        } else if (readiness >= 50) {

            message.textContent =
                "Moderate readiness. Focus on the missing skills before applying.";

        } else {

            message.textContent =
                "Your skill gap is significant. Prioritize the missing skills shown above.";

        }

    }

}


function renderJobTags(
    items,
    emptyMessage
) {

    if (!items || !items.length) {

        return `
            <span class="muted">
                ${emptyMessage}
            </span>
        `;

    }


    return items.map(
        item => `
            <span class="tag">
                ${item}
            </span>
        `
    ).join("");

}


function showJobMatchError(message) {

    jobMatchError.textContent =
        message;

    jobMatchError
        .classList
        .remove("hidden");

}

/* =================================
   AKSH AI — MOBILE MENU
================================= */


function openHistoryDetail(item) {
    const modal = document.getElementById("historyDetailModal");

    if (!modal) return;

    const score = Number(item.score ?? item.ats_score ?? 0);
    const analysis = item.analysis || {};
    const suggestions = item.suggestions || {};

    const filename =
        item.filename ||
        item.file_name ||
        "Resume Analysis";

    const skills =
        analysis.skills ||
        analysis.detected_skills ||
        [];

    const suggestionItems =
        suggestions.suggestions ||
        suggestions.items ||
        suggestions.recommendations ||
        [];

    document.getElementById("historyDetailTitle").textContent =
        filename;

    document.getElementById("historyDetailDate").textContent =
        formatHistoryDate(item.created_at);

    document.getElementById("historyDetailScore").textContent =
        score;

    document.getElementById("historyDetailRating").textContent =
        item.rating || getHistoryRating(score);

    document.getElementById("historyDetailWords").textContent =
        item.word_count || 0;

    document.getElementById("historyDetailSkills").textContent =
        item.skill_count || skills.length || 0;

    document.getElementById("historyDetailSuggestions").textContent =
        item.suggestion_count || suggestionItems.length || 0;

    const skillsList =
        document.getElementById("historyDetailSkillsList");

    if (skillsList) {
        skillsList.innerHTML = skills.length
            ? skills.map(skill => `
                <span class="history-detail-tag">
                    ${escapeHistoryHTML(skill)}
                </span>
            `).join("")
            : '<span class="history-detail-muted">No skills detected.</span>';
    }

    const suggestionsList =
        document.getElementById("historyDetailSuggestionsList");

    if (suggestionsList) {
        suggestionsList.innerHTML = suggestionItems.length
            ? suggestionItems.map((suggestion, index) => {
                const value =
                    typeof suggestion === "string"
                        ? suggestion
                        : suggestion.text ||
                          suggestion.message ||
                          suggestion.description ||
                          JSON.stringify(suggestion);

                return `
                    <div class="history-detail-suggestion">
                        <span>${index + 1}</span>
                        <p>${escapeHistoryHTML(value)}</p>
                    </div>
                `;
            }).join("")
            : '<div class="history-detail-muted">No suggestions available.</div>';
    }

    modal.classList.remove("hidden");
    document.body.classList.add("history-modal-open");
}

function closeHistoryDetail() {
    const modal =
        document.getElementById("historyDetailModal");

    if (!modal) return;

    modal.classList.add("hidden");
    document.body.classList.remove("history-modal-open");
}

document.addEventListener("DOMContentLoaded", () => {

    const menuToggle = document.getElementById("menuToggle");
    const topNav = document.getElementById("topNav");

    if (!menuToggle || !topNav) return;

    menuToggle.addEventListener("click", () => {
        topNav.classList.toggle("active");

        const isOpen = topNav.classList.contains("active");

        menuToggle.textContent = isOpen ? "✕" : "☰";
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close menu" : "Open menu"
        );
    });

    const closeHistoryDetailBtn =
        document.getElementById("closeHistoryDetail");

    const historyDetailOverlay =
        document.getElementById("historyDetailOverlay");

    closeHistoryDetailBtn?.addEventListener(
        "click",
        closeHistoryDetail
    );

    historyDetailOverlay?.addEventListener(
        "click",
        closeHistoryDetail
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeHistoryDetail();
        }
    });

    topNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            topNav.classList.remove("active");
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-label", "Open menu");
        });
    });

});

/* =========================================
   AKSH AI — PREMIUM ATS SCORE ANIMATION
========================================= */

function animateAKSHScore(target) {
    const scoreElement = document.getElementById("atsScore");

    if (!scoreElement) return;

    const finalScore = Math.max(
        0,
        Math.min(100, Number(target) || 0)
    );

    const duration = 1200;
    const start = performance.now();

    function updateScore(now) {
        const progress = Math.min(
            (now - start) / duration,
            1
        );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const current =
            Math.round(finalScore * eased);

        scoreElement.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(updateScore);
        } else {
            scoreElement.textContent = finalScore;
        }
    }

    requestAnimationFrame(updateScore);
}

/* =========================================
   AKSH AI — PREMIUM ATS BREAKDOWN
========================================= */

function renderAKSHBreakdown(breakdown) {

    if (!breakdown || typeof breakdown !== "object") {
        return;
    }

    let container =
        document.getElementById("atsBreakdown");

    if (!container) {

        const scoreCard =
            document.querySelector(".score-card");

        if (!scoreCard) {
            console.warn("AKSH AI: .score-card not found");
            return;
        }

        container =
            document.createElement("div");

        container.id = "atsBreakdown";
        container.className = "ats-breakdown";

        scoreCard.appendChild(container);
    }

    const labels = {
        skills: "Technical Skills",
        contact_information: "Contact Information",
        education: "Education",
        experience: "Experience",
        resume_sections: "Resume Structure",
        resume_length: "Resume Length"
    };

    const maxScores = {
        skills: 25,
        contact_information: 10,
        education: 10,
        experience: 15,
        resume_sections: 20,
        resume_length: 15
    };

    container.innerHTML = "";

    Object.entries(labels).forEach(
        ([key, label]) => {

            const value =
                Number(breakdown[key]) || 0;

            const max =
                maxScores[key] || 100;

            const percentage =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (value / max) * 100
                    )
                );

            const item =
                document.createElement("div");

            item.className =
                "ats-breakdown-item";

            item.innerHTML = `
                <div class="ats-breakdown-top">
                    <span class="ats-breakdown-label">
                        ${label}
                    </span>

                    <span class="ats-breakdown-value">
                        ${value}/${max}
                    </span>
                </div>

                <div class="ats-progress">
                    <div
                        class="ats-progress-bar"
                        style="width: 0%">
                    </div>
                </div>
            `;

            container.appendChild(item);

            requestAnimationFrame(() => {

                const bar =
                    item.querySelector(
                        ".ats-progress-bar"
                    );

                if (bar) {
                    bar.style.width =
                        `${percentage}%`;
                }

            });
        }
    );
}

/* =========================================================
   ANALYZE ANOTHER RESUME — RESET FLOW
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const newAnalysisBtn = document.getElementById("newAnalysisBtn");

    if (!newAnalysisBtn) {
        console.warn("newAnalysisBtn not found");
        return;
    }

    newAnalysisBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const fileInput = document.getElementById("resumeFile");
        const fileNameEl = document.getElementById("fileName");
        const resultsEl = document.getElementById("results");

        // Reset file input
        if (fileInput) {
            fileInput.value = "";
        }

        // Reset selected file
        selectedFile = null;

        // Reset filename
        if (fileNameEl) {
            fileNameEl.textContent = "";
        }

        // Hide previous analysis
        if (resultsEl) {
            resultsEl.classList.add("hidden");
        }

        // Reset error
        hideError();

        // Reset analyze button
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = "Analyze Resume";
        }

        // Clear previous analysis state
        window.latestAnalysis = null;
        window.latestResumeText = "";

        // Scroll back to upload section
        const uploadCard = document.querySelector(".upload-card");

        if (uploadCard) {
            uploadCard.classList.add("new-analysis-focus");

            uploadCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            setTimeout(() => {
                uploadCard.classList.remove("new-analysis-focus");
            }, 1200);
        }

        // Open PDF picker
        setTimeout(() => {
            if (fileInput) {
                fileInput.click();
            }
        }, 450);
    });
});


/* =========================================================
   ANALYSIS HISTORY
   ========================================================= */

async function loadAnalysisHistory() {
    const historyList = document.getElementById("historyList");
    const historyLoading = document.getElementById("historyLoading");
    const historyError = document.getElementById("historyError");
    const historyEmpty = document.getElementById("historyEmpty");

    if (!historyList) return;

    historyLoading?.classList.remove("hidden");
    historyError?.classList.add("hidden");
    historyEmpty?.classList.add("hidden");
    historyList.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}/history`);

        if (!response.ok) {
            throw new Error("Unable to load analysis history.");
        }

        const data = await response.json();
        const history = Array.isArray(data.history)
            ? data.history
            : [];

        window.analysisHistory = history;

        historyLoading?.classList.add("hidden");

        if (history.length === 0) {
            historyEmpty?.classList.remove("hidden");
            return;
        }

        historyList.innerHTML = history.map((item, index) => {
            const score = Number(item.ats_score ?? item.score ?? 0);
            const filename =
                item.filename ||
                item.file_name ||
                "Resume";

            const date =
                item.timestamp ||
                item.created_at ||
                item.date ||
                "";

            const ratingText =
                item.rating ||
                getHistoryRating(score);

            return `
                <article class="history-card">
                    <div class="history-file">
                        <div class="history-file-icon">PDF</div>

                        <div class="history-file-info">
                            <h3>${escapeHistoryHTML(filename)}</h3>
                            <p>${formatHistoryDate(date)}</p>
                        </div>
                    </div>

                    <div class="history-score">
                        <strong>${score}</strong>
                        <span>/100</span>
                    </div>

                    <div class="history-rating">
                        ${escapeHistoryHTML(ratingText)}
                    </div>

                    <div class="history-card-actions">
                        <button
                            type="button"
                            class="history-view-btn"
                            onclick="openHistoryDetail(window.analysisHistory[${index}])">
                            View Details
                        </button>

                        <button
                            type="button"
                            class="history-delete-btn"
                            onclick="deleteHistoryRecord(window.analysisHistory[${index}].id)">
                            🗑️ Delete
                        </button>
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("History error:", error);

        historyLoading?.classList.add("hidden");

        if (historyError) {
            historyError.textContent =
                error.message || "Unable to load analysis history.";
            historyError.classList.remove("hidden");
        }
    }
}


async function deleteHistoryRecord(recordId) {
    if (!recordId) {
        alert("Unable to identify this history record.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this analysis?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_URL}/history/${encodeURIComponent(recordId)}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || "Unable to delete history record."
            );
        }

        await loadAnalysisHistory();

    } catch (error) {
        console.error("Delete history error:", error);
        alert(error.message || "Unable to delete history record.");
    }
}


async function clearAllHistory() {
    const confirmed = confirm(
        "Are you sure you want to delete ALL analysis history?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_URL}/history`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || "Unable to clear analysis history."
            );
        }

        await loadAnalysisHistory();

    } catch (error) {
        console.error("Clear history error:", error);
        alert(error.message || "Unable to clear analysis history.");
    }
}


function getHistoryRating(score) {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Needs Work";
}

function formatHistoryDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHistoryHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
    const refreshHistoryBtn =
        document.getElementById("refreshHistoryBtn");

    const clearHistoryBtn =
        document.getElementById("clearHistoryBtn");

    clearHistoryBtn?.addEventListener(
        "click",
        clearAllHistory
    );

    refreshHistoryBtn?.addEventListener(
        "click",
        loadAnalysisHistory
    );

    loadAnalysisHistory();
});

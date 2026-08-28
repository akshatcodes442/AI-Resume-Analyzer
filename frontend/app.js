"use strict";

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000"
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

        const token = getAuthToken();

        if (!token) {
            throw new Error("Please login before analyzing a resume.");
        }

        const response = await fetch(
            `${API_URL}/analyze-resume`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
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

        const token = getAuthToken();

        if (!token) {
            throw new Error("Please login before using Job Match.");
        }

        const resumeResponse =
            await fetch(
                `${API_URL}/analyze-resume`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
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


const settingsChangePasswordBtn = document.getElementById("settingsChangePasswordBtn");
const settingsCurrentPassword = document.getElementById("settingsCurrentPassword");
const settingsNewPassword = document.getElementById("settingsNewPassword");
const settingsConfirmPassword = document.getElementById("settingsConfirmPassword");
const settingsPasswordMessage = document.getElementById("settingsPasswordMessage");

settingsChangePasswordBtn?.addEventListener("click", async () => {
    const currentPassword = settingsCurrentPassword?.value || "";
    const newPassword = settingsNewPassword?.value || "";
    const confirmPassword = settingsConfirmPassword?.value || "";

    if (!settingsPasswordMessage) return;

    settingsPasswordMessage.textContent = "";
    settingsPasswordMessage.className = "settings-password-message";

    if (!currentPassword || !newPassword || !confirmPassword) {
        settingsPasswordMessage.textContent = "Please fill all password fields.";
        settingsPasswordMessage.classList.add("error");
        return;
    }

    if (newPassword.length < 8) {
        settingsPasswordMessage.textContent =
            "New password must be at least 8 characters.";
        settingsPasswordMessage.classList.add("error");
        return;
    }

    if (newPassword !== confirmPassword) {
        settingsPasswordMessage.textContent =
            "New password and confirm password do not match.";
        settingsPasswordMessage.classList.add("error");
        return;
    }

    if (currentPassword === newPassword) {
        settingsPasswordMessage.textContent =
            "New password must be different from current password.";
        settingsPasswordMessage.classList.add("error");
        return;
    }

    const token = localStorage.getItem("aksh_ai_access_token");

    if (!token) {
        settingsPasswordMessage.textContent =
            "Please login again before changing your password.";
        settingsPasswordMessage.classList.add("error");
        return;
    }

    const originalText = settingsChangePasswordBtn.textContent;
    settingsChangePasswordBtn.disabled = true;
    settingsChangePasswordBtn.textContent = "Changing...";

    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to change password.");
        }

        settingsPasswordMessage.textContent =
            data.message || "Password changed successfully.";
        settingsPasswordMessage.classList.add("success");

        if (settingsCurrentPassword) settingsCurrentPassword.value = "";
        if (settingsNewPassword) settingsNewPassword.value = "";
        if (settingsConfirmPassword) settingsConfirmPassword.value = "";

    } catch (error) {
        settingsPasswordMessage.textContent =
            error.message || "Something went wrong.";
        settingsPasswordMessage.classList.add("error");
    } finally {
        settingsChangePasswordBtn.disabled = false;
        settingsChangePasswordBtn.textContent = originalText;
    }
});

document.querySelectorAll(".settings-password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);

        if (!input) return;

        if (input.type === "password") {
            input.type = "text";
            button.setAttribute("aria-label", "Hide password");
        } else {
            input.type = "password";
            button.setAttribute("aria-label", "Show password");
        }
    });
});


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


function updateDashboardStats(history) {
    const totalEl = document.getElementById("dashboardTotalAnalyses");
    const averageEl = document.getElementById("dashboardAverageScore");
    const bestEl = document.getElementById("dashboardBestScore");
    const latestEl = document.getElementById("dashboardLatestScore");

    if (!totalEl || !averageEl || !bestEl || !latestEl) return;

    const records = Array.isArray(history) ? history : [];

    let total = records.length;
    let scoreTotal = 0;
    let scoreCount = 0;
    let best = 0;
    let latest = 0;

    for (let i = 0; i < records.length; i++) {
        const score = Number(
            records[i]?.ats_score ??
            records[i]?.score ??
            0
        );

        if (!Number.isFinite(score)) continue;

        scoreTotal += score;
        scoreCount++;

        if (score > best) {
            best = score;
        }

        if (i === 0) {
            latest = score;
        }
    }

    const average = scoreCount
        ? Math.round(scoreTotal / scoreCount)
        : 0;

    totalEl.textContent = String(total);
    averageEl.textContent = String(average);
    bestEl.textContent = String(best);
    latestEl.textContent = String(latest);
}

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
        const token = getAuthToken();

        if (!token) {
            historyLoading?.classList.add("hidden");
            historyEmpty?.classList.remove("hidden");
            return;
        }

        const response = await fetch(`${API_URL}/history`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Unable to load analysis history.");
        }

        const data = await response.json();
        const history = Array.isArray(data.history)
            ? data.history
            : [];

        window.analysisHistory = history;
        updateDashboardStats(history);

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
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${getAuthToken()}`
                }
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
        const token = getAuthToken();

        if (!token) {
            throw new Error("Please login before clearing history.");
        }

        const response = await fetch(
            `${API_URL}/history`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
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
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
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


/* =========================================================
   AKSH AI AUTHENTICATION
   ========================================================= */

const AUTH_TOKEN_KEY = "aksh_ai_access_token";
const AUTH_USER_KEY = "aksh_ai_user";

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function saveAuthSession(data) {
    if (data.access_token) {
        localStorage.setItem(
            AUTH_TOKEN_KEY,
            data.access_token
        );
    }

    if (data.user) {
        localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify(data.user)
        );
    }
}

function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function getSavedUser() {
    try {
        return JSON.parse(
            localStorage.getItem(AUTH_USER_KEY)
        );
    } catch {
        return null;
    }
}

async function getCurrentUser() {
    const token = getAuthToken();

    if (!token) {
        return null;
    }

    try {
        const response = await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            clearAuthSession();
            return null;
        }

        const data = await response.json();

        if (data.user) {
            localStorage.setItem(
                AUTH_USER_KEY,
                JSON.stringify(data.user)
            );
        }

        return data.user || null;

    } catch (error) {
        console.error(
            "Auth session check failed:",
            error
        );

        return null;
    }
}

async function logoutAKSHAI() {
    clearAuthSession();

    window.dispatchEvent(
        new CustomEvent("aksh-ai-logout")
    );

    console.log("AKSH AI: Logged out");
}


/* =========================================================
   AUTH API HELPERS
   ========================================================= */

async function signupAKSHAI(
    name,
    email,
    password
) {
    const response = await fetch(
        `${API_URL}/auth/signup`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail ||
            "Signup failed."
        );
    }

    saveAuthSession(data);

    return data;
}


async function loginAKSHAI(
    email,
    password
) {
    const response = await fetch(
        `${API_URL}/auth/login`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail ||
            "Login failed."
        );
    }

    saveAuthSession(data);

    return data;
}


/* =========================================================
   AUTH SESSION INITIALIZATION
   ========================================================= */

async function initializeAKSHAIAuth() {

    const savedUser = getSavedUser();

    if (savedUser) {
        console.log(
            "AKSH AI user:",
            savedUser.email
        );
    }

    const currentUser =
        await getCurrentUser();

    if (currentUser) {
        console.log(
            "AKSH AI session verified:",
            currentUser.email
        );

        await loadAnalysisHistory();
    } else {
        console.log(
            "AKSH AI: Guest session"
        );
    }

    window.dispatchEvent(
        new CustomEvent(
            "aksh-ai-auth-ready",
            {
                detail: {
                    user: currentUser
                }
            }
        )
    );
}


document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeAKSHAIAuth();
    }
);


/* =========================================================
   AUTH STATE HELPERS
   ========================================================= */

function isLoggedIn() {
    return Boolean(
        getAuthToken()
    );
}

function getLoggedInUser() {
    return getSavedUser();
}


/* Make auth functions available globally */

window.AKSHAIAuth = {
    signup: signupAKSHAI,
    login: loginAKSHAI,
    logout: logoutAKSHAI,
    getCurrentUser,
    getToken: getAuthToken,
    getUser: getLoggedInUser,
    isLoggedIn
};




/* =========================================================
   AKSH AI PROFILE UI
   ========================================================= */

(function initAKSHAIProfileUI() {

    const profileBtn =
        document.getElementById("profileBtn");

    const profileOverlay =
        document.getElementById("profileOverlay");

    const profileClose =
        document.getElementById("profileClose");

    const profileSaveBtn =
        document.getElementById("profileSaveBtn");

    const profileSaveMessage =
        document.getElementById("profileSaveMessage");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profilePhone =
        document.getElementById("profilePhone");

    const profileRole =
        document.getElementById("profileRole");

    const profileExperience =
        document.getElementById("profileExperience");

    const profileSkills =
        document.getElementById("profileSkills");

    const profileBio =
        document.getElementById("profileBio");

    const profileAvatarLarge =
        document.getElementById("profileAvatarLarge");


    if (!profileOverlay) {
        console.warn("AKSH AI Profile UI not found.");
        return;
    }


    function showProfileMessage(message, type = "success") {

        if (!profileSaveMessage) return;

        profileSaveMessage.textContent = message;

        profileSaveMessage.className =
            `profile-save-message ${type}`;

        setTimeout(() => {

            if (profileSaveMessage) {
                profileSaveMessage.textContent = "";
                profileSaveMessage.className =
                    "profile-save-message";
            }

        }, 2500);
    }


    function updateProfileAvatar(name) {

        const firstLetter =
            (name || "A").trim().charAt(0).toUpperCase();

        if (profileAvatarLarge) {
            profileAvatarLarge.textContent =
                firstLetter || "A";
        }

        const authAvatar =
            document.querySelector(".auth-avatar");

        if (authAvatar) {
            authAvatar.textContent =
                firstLetter || "A";
        }

        const authUserName =
            document.getElementById("authUserName");

        if (authUserName && name) {
            authUserName.textContent = name;
        }
    }


    function openProfile() {

        loadProfile();

        profileOverlay.classList.remove("hidden");

        document.body.classList.add(
            "profile-modal-open"
        );
    }


    function closeProfile() {

        profileOverlay.classList.add("hidden");

        document.body.classList.remove(
            "profile-modal-open"
        );
    }


    async function loadProfile() {

        const token =
            window.AKSHAIAuth?.getToken?.();

        const user =
            window.AKSHAIAuth?.getUser?.();


        if (!token) {

            showProfileMessage(
                "Please login to manage your profile.",
                "error"
            );

            if (profileName) {
                profileName.value =
                    user?.name || "";
            }

            if (profileEmail) {
                profileEmail.value =
                    user?.email || "";
            }

            return;
        }


        try {

            const response =
                await fetch(
                    `${API_URL}/auth/profile`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to load profile."
                );
            }


            const profile =
                data.profile || {};


            if (profileName) {
                profileName.value =
                    profile.name || "";
            }

            if (profileEmail) {
                profileEmail.value =
                    profile.email || "";
            }

            if (profilePhone) {
                profilePhone.value =
                    profile.phone || "";
            }

            if (profileRole) {
                profileRole.value =
                    profile.role || "";
            }

            if (profileExperience) {
                profileExperience.value =
                    profile.experience || "";
            }

            if (profileSkills) {
                profileSkills.value =
                    profile.skills || "";
            }

            if (profileBio) {
                profileBio.value =
                    profile.bio || "";
            }


            updateProfileAvatar(
                profile.name || user?.name || "A"
            );


            console.log(
                "AKSH AI profile loaded from backend."
            );

        } catch (error) {

            console.error(
                "Profile load failed:",
                error
            );

            showProfileMessage(
                error.message ||
                "Failed to load profile.",
                "error"
            );
        }
    }


    async function saveProfile() {

        const token =
            window.AKSHAIAuth?.getToken?.();


        if (!token) {

            showProfileMessage(
                "Please login before saving your profile.",
                "error"
            );

            return;
        }


        const profile = {

            name:
                profileName?.value.trim() || "",

            phone:
                profilePhone?.value.trim() || "",

            role:
                profileRole?.value.trim() || "",

            experience:
                profileExperience?.value || "",

            skills:
                profileSkills?.value.trim() || "",

            bio:
                profileBio?.value.trim() || ""

        };


        if (!profile.name) {

            showProfileMessage(
                "Full name is required.",
                "error"
            );

            profileName?.focus();

            return;
        }


        if (profileSaveBtn) {

            profileSaveBtn.disabled = true;

            profileSaveBtn.dataset.originalText =
                profileSaveBtn.textContent;

            profileSaveBtn.textContent =
                "Saving...";
        }


        try {

            const response =
                await fetch(
                    `${API_URL}/auth/profile`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify(profile)
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Profile update failed."
                );
            }


            const updatedProfile =
                data.profile || profile;


            /*
             * Keep the local auth user synchronized
             * with the backend profile.
             */

            const authUser =
                window.AKSHAIAuth?.getUser?.();


            if (authUser) {

                authUser.name =
                    updatedProfile.name ||
                    authUser.name;

                localStorage.setItem(
                    "aksh_ai_user",
                    JSON.stringify(authUser)
                );
            }


            updateProfileAvatar(
                updatedProfile.name
            );


            /*
             * Optional local cache for faster UI.
             */

            const cacheKey =
                `aksh_ai_profile_${
                    updatedProfile.email ||
                    authUser?.email ||
                    "guest"
                }`;


            localStorage.setItem(
                cacheKey,
                JSON.stringify({
                    ...updatedProfile,
                    updatedAt:
                        new Date().toISOString()
                })
            );


            showProfileMessage(
                "✓ Profile updated successfully!"
            );


            console.log(
                "AKSH AI profile saved to backend."
            );

        } catch (error) {

            console.error(
                "Profile save failed:",
                error
            );

            showProfileMessage(
                error.message ||
                "Failed to save profile.",
                "error"
            );

        } finally {

            if (profileSaveBtn) {

                profileSaveBtn.disabled = false;

                profileSaveBtn.textContent =
                    profileSaveBtn.dataset.originalText ||
                    "Save Profile";
            }
        }
    }


    profileBtn?.addEventListener(
        "click",
        openProfile
    );


    profileClose?.addEventListener(
        "click",
        closeProfile
    );


    profileOverlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                profileOverlay
            ) {

                closeProfile();
            }
        }
    );


    profileSaveBtn?.addEventListener(
        "click",
        saveProfile
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                !profileOverlay.classList.contains(
                    "hidden"
                )
            ) {

                closeProfile();
            }
        }
    );


    window.addEventListener(
        "aksh-ai-auth-ready",
        (event) => {

            const user =
                event.detail?.user;

            if (user) {
                updateProfileAvatar(
                    user.name || "A"
                );
            }

            if (
                !profileOverlay.classList.contains(
                    "hidden"
                )
            ) {

                loadProfile();
            }
        }
    );


    console.log(
        "AKSH AI Profile UI initialized."
    );

})();

/* =========================================================
   AKSH AI SETTINGS UI
   ========================================================= */
(function initAKSHAISettings() {
    const settingsOverlay =
        document.getElementById("settingsOverlay");
    const settingsBtn =
        document.getElementById("settingsBtn");
    const settingsClose =
        document.getElementById("settingsClose");
    const settingsDarkMode =
        document.getElementById("settingsDarkMode");
    const settingsNotifications =
        document.getElementById("settingsNotifications");
    const settingsSaveBtn =
        document.getElementById("settingsSaveBtn");
    const settingsSaveMessage =
        document.getElementById("settingsSaveMessage");
    const settingsLogoutBtn =
        document.getElementById("settingsLogoutBtn");
    const settingsUserName =
        document.getElementById("settingsUserName");
    const settingsUserEmail =
        document.getElementById("settingsUserEmail");
    const settingsAvatar =
        document.getElementById("settingsAvatar");

    function getToken() {
        return localStorage.getItem("aksh_ai_access_token");
    }

    function updateSettingsProfile() {
        const user =
            window.AKSHAIAuth?.getUser?.();

        const name =
            user?.name ||
            user?.fullname ||
            user?.full_name ||
            user?.email ||
            "User";

        const email =
            user?.email ||
            "Not signed in";

        if (settingsUserName) {
            settingsUserName.textContent = name;
        }

        if (settingsUserEmail) {
            settingsUserEmail.textContent = email;
        }

        if (settingsAvatar) {
            settingsAvatar.textContent =
                name.charAt(0).toUpperCase();
        }
    }

    if (!settingsOverlay) {
        console.warn("AKSH AI Settings UI not found.");
        return;
    }

    async function loadPreferences() {
        const token = getToken();

        if (!token) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/auth/preferences`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Preferences load failed: ${response.status}`
                );
            }

            const data = await response.json();
            const preferences = data.preferences || {};

            const theme =
                preferences.theme || "dark";

            const notifications =
                preferences.notifications !== false;

            if (settingsDarkMode) {
                settingsDarkMode.checked =
                    theme === "dark";
            }

            if (settingsNotifications) {
                settingsNotifications.checked =
                    notifications;
            }

            document.body.classList.toggle(
                "settings-dark-mode",
                theme === "dark"
            );

            localStorage.setItem(
                "aksh_ai_dark_mode",
                String(theme === "dark")
            );

            localStorage.setItem(
                "aksh_ai_notifications",
                String(notifications)
            );

            console.log(
                "AKSH AI preferences loaded.",
                preferences
            );
        } catch (error) {
            console.warn(
                "Could not load preferences:",
                error
            );
        }
    }

    function openSettings() {
        updateSettingsProfile();

        settingsOverlay.classList.remove("hidden");

        loadPreferences();
    }

    function closeSettings() {
        settingsOverlay.classList.add("hidden");
    }

    function showSaveMessage(
        message,
        type = "success"
    ) {
        if (!settingsSaveMessage) return;

        settingsSaveMessage.textContent = message;

        settingsSaveMessage.className =
            `settings-save-message ${type}`;

        setTimeout(() => {
            settingsSaveMessage.textContent = "";
            settingsSaveMessage.className =
                "settings-save-message";
        }, 2500);
    }

    settingsBtn?.addEventListener(
        "click",
        openSettings
    );

    window.addEventListener(
        "aksh-ai-auth-ready",
        () => {
            updateSettingsProfile();
        }
    );

    window.addEventListener(
        "aksh-ai-profile-updated",
        updateSettingsProfile
    );

    settingsClose?.addEventListener(
        "click",
        closeSettings
    );

    settingsOverlay.addEventListener(
        "click",
        (event) => {
            if (event.target === settingsOverlay) {
                closeSettings();
            }
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                !settingsOverlay.classList.contains(
                    "hidden"
                )
            ) {
                closeSettings();
            }
        }
    );

    settingsSaveBtn?.addEventListener(
        "click",
        async () => {
            const token = getToken();

            const darkMode =
                Boolean(settingsDarkMode?.checked);

            const notifications =
                settingsNotifications
                    ? Boolean(
                        settingsNotifications.checked
                    )
                    : true;

            if (!token) {
                showSaveMessage(
                    "Please login first.",
                    "error"
                );
                return;
            }

            const originalText =
                settingsSaveBtn.textContent;

            settingsSaveBtn.disabled = true;
            settingsSaveBtn.textContent =
                "Saving...";

            try {
                const response = await fetch(
                    `${API_URL}/auth/preferences`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization:
                                `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            theme: darkMode
                                ? "dark"
                                : "light",
                            notifications:
                                notifications,
                            email_notifications:
                                notifications
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        "Failed to save preferences."
                    );
                }

                localStorage.setItem(
                    "aksh_ai_dark_mode",
                    String(darkMode)
                );

                localStorage.setItem(
                    "aksh_ai_notifications",
                    String(notifications)
                );

                document.body.classList.toggle(
                    "settings-dark-mode",
                    darkMode
                );

                showSaveMessage(
                    "✓ Settings saved successfully."
                );

                console.log(
                    "AKSH AI preferences saved.",
                    data.preferences
                );
            } catch (error) {
                console.error(
                    "Settings save error:",
                    error
                );

                showSaveMessage(
                    error.message ||
                    "Could not save settings.",
                    "error"
                );
            } finally {
                settingsSaveBtn.disabled = false;
                settingsSaveBtn.textContent =
                    originalText || "Save Settings";
            }
        }
    );

    settingsLogoutBtn?.addEventListener(
        "click",
        async () => {
            try {
                await window.AKSHAIAuth?.logout();
            } catch (error) {
                console.warn(
                    "Settings logout warning:",
                    error
                );
            }

            localStorage.removeItem(
                "aksh_ai_access_token"
            );

            localStorage.removeItem(
                "aksh_ai_user"
            );

            localStorage.removeItem(
                "aksh_ai_dark_mode"
            );

            localStorage.removeItem(
                "aksh_ai_notifications"
            );

            document.body.classList.remove(
                "settings-dark-mode"
            );

            closeSettings();

            window.location.href =
                "index.html?auth=login";
        }
    );

    const savedDarkMode =
        localStorage.getItem(
            "aksh_ai_dark_mode"
        ) === "true";

    document.body.classList.toggle(
        "settings-dark-mode",
        savedDarkMode
    );

    console.log(
        "AKSH AI Settings UI initialized."
    );
})();

/* =========================================================
   AKSH AI AUTH UI
   ========================================================= */

(function initAKSHAIAuthUI() {

    const overlay = document.getElementById("authOverlay");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const authClose = document.getElementById("authClose");
    const showSignup = document.getElementById("showSignup");
    const showLogin = document.getElementById("showLogin");

    const authGuest = document.getElementById("authGuest");
    const authUser = document.getElementById("authUser");
    const authUserName = document.getElementById("authUserName");

    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const authMessage = document.getElementById("authMessage");

    if (!overlay) {
        console.warn("AKSH AI Auth UI not found.");
        return;
    }

    function openAuth(mode = "login") {
        overlay.classList.remove("hidden");
        showAuthMode(mode);
        clearAuthMessage();
    }

    function closeAuth() {
        overlay.classList.add("hidden");
        clearAuthMessage();
    }

    function showAuthMode(mode) {

        const loginMode = mode === "login";

        loginForm.classList.toggle("hidden", !loginMode);
        signupForm.classList.toggle("hidden", loginMode);

        authTitle.textContent =
            loginMode ? "Welcome Back" : "Create Your Account";

        authSubtitle.textContent =
            loginMode
                ? "Sign in to access your career intelligence dashboard."
                : "Create your AKSH AI account and start analyzing your career.";
    }

    function showAuthMessage(message, type = "error") {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    function clearAuthMessage() {
        authMessage.textContent = "";
        authMessage.className = "auth-message hidden";
    }

    function updateAuthUI(user) {

        const loggedIn = Boolean(user);

        if (authGuest) {
            authGuest.hidden = loggedIn;
            authGuest.style.display = loggedIn ? "none" : "flex";
        }

        if (authUser) {
            authUser.hidden = !loggedIn;
            authUser.style.display = loggedIn ? "flex" : "none";
        }

        if (loggedIn) {
            const name = user.name || user.email || "User";

            if (authUserName) {
                authUserName.textContent = name;
            }

            const avatar =
                document.querySelector(".auth-avatar");

            if (avatar) {
                avatar.textContent =
                    name.charAt(0).toUpperCase();
            }
        }
    }

    loginBtn?.addEventListener("click", () => {
        openAuth("login");
    });

    if (
        new URLSearchParams(window.location.search).get("auth") === "login" &&
        !window.AKSHAIAuth.getUser()
    ) {
        openAuth("login");
    }

    signupBtn?.addEventListener("click", () => {
        openAuth("signup");
    });

    authClose?.addEventListener("click", closeAuth);

    showSignup?.addEventListener("click", () => {
        showAuthMode("signup");
        clearAuthMessage();
    });

    showLogin?.addEventListener("click", () => {
        showAuthMode("login");
        clearAuthMessage();
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeAuth();
        }
    });

    loginForm?.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        if (!email || !password) {
            showAuthMessage("Please enter email and password.");
            return;
        }

        const submit =
            loginForm.querySelector(".auth-submit");

        submit.disabled = true;
        submit.textContent = "Signing in...";

        try {

            const data =
                await window.AKSHAIAuth.login(
                    email,
                    password
                );

            updateAuthUI(data.user);

            showAuthMessage(
                "Login successful. Welcome to AKSH AI!",
                "success"
            );

            setTimeout(() => {
                closeAuth();
                loginForm.reset();
            }, 700);

        } catch (error) {

            showAuthMessage(
                error.message || "Login failed."
            );

        } finally {

            submit.disabled = false;
            submit.textContent = "Sign In";

        }
    });

    signupForm?.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name =
            document.getElementById("signupName").value.trim();

        const email =
            document.getElementById("signupEmail").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        if (!name || !email || !password) {
            showAuthMessage("Please fill all fields.");
            return;
        }

        if (password.length < 8) {
            showAuthMessage(
                "Password must contain at least 8 characters."
            );
            return;
        }

        const submit =
            signupForm.querySelector(".auth-submit");

        submit.disabled = true;
        submit.textContent = "Creating account...";

        try {

            const data =
                await window.AKSHAIAuth.signup(
                    name,
                    email,
                    password
                );

            updateAuthUI(data.user);

            showAuthMessage(
                "Account created successfully!",
                "success"
            );

            setTimeout(() => {
                closeAuth();
                signupForm.reset();
            }, 700);

        } catch (error) {

            showAuthMessage(
                error.message || "Signup failed."
            );

        } finally {

            submit.disabled = false;
            submit.textContent = "Create Account";

        }
    });

    logoutBtn?.addEventListener("click", async () => {

        await window.AKSHAIAuth.logout();

        localStorage.removeItem("aksh_ai_access_token");
        localStorage.removeItem("aksh_ai_user");

        updateAuthUI(null);

        console.log("AKSH AI logout successful");

        window.location.href = "index.html?auth=login";
    });

    window.addEventListener(
        "aksh-ai-auth-ready",
        (event) => {
            updateAuthUI(
                event.detail?.user || null
            );
        }
    );

    window.addEventListener(
        "aksh-ai-logout",
        () => {
            updateAuthUI(null);
        }
    );

    const existingUser =
        window.AKSHAIAuth.getUser();

    if (existingUser) {
        updateAuthUI(existingUser);
    } else {
        updateAuthUI(null);
    }

})();

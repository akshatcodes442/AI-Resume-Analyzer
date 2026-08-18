from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.analyzer import analyze_resume
from backend.resume_parser import extract_text_from_pdf
from backend.scorer import calculate_ats_score
from backend.suggestions import generate_suggestions


app = FastAPI(
    title="AI Resume Analyzer",
    description="AI-powered Resume Analysis API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from backend.history import (
    save_history,
    load_history,
    create_history_record
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/")
def root():
    return {
        "status": "success",
        "message": "AI Resume Analyzer API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
@app.post("/analyze-resume")
async def analyze_resume_endpoint(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    file_path = UPLOAD_DIR / file.filename

    try:
        contents = await file.read()

        with open(file_path, "wb") as f:
            f.write(contents)

        resume_text = extract_text_from_pdf(str(file_path))

        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the PDF."
            )

        analysis = analyze_resume(resume_text)

        ats_score = calculate_ats_score(
            resume_text,
            analysis
        )

        suggestions = generate_suggestions(
            analysis,
            ats_score
        )

        history_record = create_history_record(
            file.filename,
            ats_score,
            analysis,
            suggestions
        )

        save_history(history_record)

        return {
    "status": "success",
    "filename": file.filename,
    "ats_score": ats_score,
    "analysis": analysis,
    "suggestions": suggestions,
    "resume_text": resume_text,
    "text_length": len(resume_text)
}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/history")
def get_history():
    return {
        "status": "success",
        "history": load_history()
    }


from pydantic import BaseModel



class ResumeImprovementRequest(BaseModel):
    resume_text: str


@app.post("/resume-improvement")
def resume_improvement(request: ResumeImprovementRequest):

    resume = request.resume_text.strip()

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty."
        )

    text = resume.lower()

    improvements = []
    keyword_suggestions = []
    section_scores = {}

    # Contact information
    contact_score = 0

    if "@" in resume:
        contact_score += 50

    if any(char.isdigit() for char in resume):
        contact_score += 50

    section_scores["Contact Information"] = contact_score

    if contact_score < 100:
        improvements.append(
            "Add complete professional contact information including email and phone number."
        )

    # Summary
    summary_keywords = [
        "summary",
        "profile",
        "objective",
        "professional summary"
    ]

    summary_score = 100 if any(
        keyword in text for keyword in summary_keywords
    ) else 0

    section_scores["Professional Summary"] = summary_score

    if summary_score == 0:
        improvements.append(
            "Add a concise professional summary focused on your role, strongest skills and career value."
        )

    # Skills
    important_skills = [
        "python",
        "java",
        "javascript",
        "typescript",
        "react",
        "node.js",
        "django",
        "flask",
        "fastapi",
        "sql",
        "mysql",
        "postgresql",
        "mongodb",
        "git",
        "github",
        "docker",
        "aws",
        "azure",
        "power bi",
        "excel",
        "tableau",
        "machine learning",
        "data analysis",
        "rest api"
    ]

    detected_skills = [
        skill for skill in important_skills
        if skill in text
    ]

    skills_score = min(
        round((len(detected_skills) / 8) * 100),
        100
    )

    section_scores["Technical Skills"] = skills_score

    if len(detected_skills) < 5:
        improvements.append(
            "Strengthen the Technical Skills section with relevant tools, technologies and job-specific skills."
        )

    # Experience
    experience_keywords = [
        "experience",
        "developer",
        "worked",
        "intern",
        "internship",
        "professional"
    ]

    experience_score = min(
        100,
        sum(keyword in text for keyword in experience_keywords) * 20
    )

    section_scores["Experience"] = experience_score

    if experience_score < 60:
        improvements.append(
            "Add measurable work experience, responsibilities and achievements."
        )

    # Projects
    project_keywords = [
        "project",
        "projects",
        "developed",
        "built",
        "created",
        "implemented"
    ]

    project_score = min(
        100,
        sum(keyword in text for keyword in project_keywords) * 20
    )

    section_scores["Projects"] = project_score

    if project_score < 60:
        improvements.append(
            "Add 2–4 strong projects with technologies used, your contribution and measurable results."
        )

    # Education
    education_keywords = [
        "education",
        "bca",
        "mca",
        "b.tech",
        "btech",
        "degree",
        "diploma",
        "computer science"
    ]

    education_score = min(
        100,
        sum(keyword in text for keyword in education_keywords) * 25
    )

    section_scores["Education"] = education_score

    if education_score < 50:
        improvements.append(
            "Make your education and relevant technical qualifications clearly visible."
        )

    # ATS keywords
    ats_keywords = [
        "developed",
        "implemented",
        "optimized",
        "managed",
        "designed",
        "automated",
        "integrated",
        "analyzed",
        "improved",
        "deployed"
    ]

    missing_ats_keywords = [
        keyword for keyword in ats_keywords
        if keyword not in text
    ]

    keyword_suggestions.extend(
        missing_ats_keywords[:6]
    )

    if keyword_suggestions:
        improvements.append(
            "Use strong action verbs naturally, such as "
            + ", ".join(keyword_suggestions)
            + "."
        )

    # Resume length
    word_count = len(resume.split())

    if word_count < 250:
        improvements.append(
            "Your resume appears short. Add relevant projects, achievements and technical experience."
        )
    elif word_count > 1200:
        improvements.append(
            "Your resume may be too long. Remove repetitive or low-value content."
        )

    # Overall score
    overall_score = round(
        sum(section_scores.values()) /
        max(len(section_scores), 1)
    )

    if overall_score >= 85:
        rating = "Excellent Resume"
    elif overall_score >= 70:
        rating = "Strong Resume"
    elif overall_score >= 50:
        rating = "Needs Improvement"
    else:
        rating = "Major Improvements Needed"

    # Professional rewrite suggestions
    rewrite_suggestions = [
        "Replace generic responsibilities with achievement-focused statements.",
        "Start bullet points with strong action verbs.",
        "Add numbers, percentages or measurable outcomes wherever possible.",
        "Keep formatting consistent across all resume sections.",
        "Prioritize keywords that directly match your target job."
    ]

    return {
        "status": "success",
        "overall_score": overall_score,
        "rating": rating,
        "word_count": word_count,
        "detected_skills": detected_skills,
        "section_scores": section_scores,
        "improvements": improvements,
        "ats_keywords": keyword_suggestions,
        "rewrite_suggestions": rewrite_suggestions
    }


class ImproveResumeRequest(BaseModel):
    resume_text: str


@app.post("/improve-resume")
def improve_resume(request: ImproveResumeRequest):

    resume = request.resume_text.strip()
    text = resume.lower()

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty."
        )

    improvements = []
    keyword_suggestions = []
    section_scores = {}

    # Contact information
    contact_score = 100

    has_email = "@" in resume
    has_phone = any(char.isdigit() for char in resume)

    if not has_email:
        contact_score -= 50
        improvements.append(
            "Add a professional email address to your resume."
        )

    if not has_phone:
        contact_score -= 50
        improvements.append(
            "Add a professional phone number."
        )

    section_scores["Contact"] = max(contact_score, 0)

    # Skills
    skills = [
        "python",
        "javascript",
        "java",
        "c++",
        "sql",
        "html",
        "css",
        "react",
        "django",
        "flask",
        "fastapi",
        "git",
        "github",
        "docker",
        "aws",
        "azure",
        "mongodb",
        "mysql",
        "postgresql",
        "power bi",
        "excel",
        "tableau",
        "pandas",
        "numpy",
        "machine learning",
        "artificial intelligence"
    ]

    detected_skills = [
        skill for skill in skills
        if skill in text
    ]

    skill_score = min(
        100,
        len(detected_skills) * 8
    )

    section_scores["Skills"] = skill_score

    if skill_score < 60:
        improvements.append(
            "Add more relevant technical skills that match your target job."
        )

    # Experience
    experience_keywords = [
        "experience",
        "worked",
        "developer",
        "development",
        "internship",
        "intern",
        "employment",
        "professional experience"
    ]

    experience_score = min(
        100,
        sum(keyword in text for keyword in experience_keywords) * 15
    )

    section_scores["Experience"] = experience_score

    if experience_score < 60:
        improvements.append(
            "Add a clear Experience section with responsibilities, achievements and measurable results."
        )

    # Projects
    project_keywords = [
        "project",
        "projects",
        "developed",
        "built",
        "created",
        "implemented"
    ]

    project_score = min(
        100,
        sum(keyword in text for keyword in project_keywords) * 20
    )

    section_scores["Projects"] = project_score

    if project_score < 60:
        improvements.append(
            "Add 2–4 strong projects with technologies used, your contribution and measurable results."
        )

    # Education
    education_keywords = [
        "education",
        "bca",
        "mca",
        "b.tech",
        "btech",
        "degree",
        "diploma",
        "computer science"
    ]

    education_score = min(
        100,
        sum(keyword in text for keyword in education_keywords) * 25
    )

    section_scores["Education"] = education_score

    if education_score < 50:
        improvements.append(
            "Make your education and relevant technical qualifications clearly visible."
        )

    # ATS action keywords
    ats_keywords = [
        "developed",
        "implemented",
        "optimized",
        "managed",
        "designed",
        "automated",
        "integrated",
        "analyzed",
        "improved",
        "deployed"
    ]

    missing_ats_keywords = [
        keyword for keyword in ats_keywords
        if keyword not in text
    ]

    keyword_suggestions.extend(
        missing_ats_keywords[:6]
    )

    if keyword_suggestions:
        improvements.append(
            "Use strong action verbs naturally, such as "
            + ", ".join(keyword_suggestions)
            + "."
        )

    # Resume length
    word_count = len(resume.split())

    if word_count < 250:
        improvements.append(
            "Your resume appears short. Add relevant projects, achievements and technical experience."
        )
    elif word_count > 1200:
        improvements.append(
            "Your resume may be too long. Remove repetitive or low-value content."
        )

    # Overall score
    overall_score = round(
        sum(section_scores.values())
        / max(len(section_scores), 1)
    )

    if overall_score >= 85:
        rating = "Excellent Resume"
    elif overall_score >= 70:
        rating = "Strong Resume"
    elif overall_score >= 50:
        rating = "Needs Improvement"
    else:
        rating = "Major Improvements Needed"

    rewrite_suggestions = [
        "Replace generic responsibilities with achievement-focused statements.",
        "Start bullet points with strong action verbs.",
        "Add numbers, percentages or measurable outcomes wherever possible.",
        "Keep formatting consistent across all resume sections.",
        "Prioritize keywords that directly match your target job."
    ]

    return {
        "status": "success",
        "overall_score": overall_score,
        "rating": rating,
        "word_count": word_count,
        "detected_skills": detected_skills,
        "section_scores": section_scores,
        "improvements": improvements,
        "ats_keywords": keyword_suggestions,
        "rewrite_suggestions": rewrite_suggestions
    }


class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str


@app.post("/job-match")
def job_match(request: JobMatchRequest):

    resume_text = request.resume_text.lower()
    job_description = request.job_description.lower()

    # Skill aliases
    skill_groups = {
        "python": ["python", "python3"],
        "java": ["java programming", "core java", "java developer"],
        "javascript": ["javascript", "js"],
        "typescript": ["typescript", "ts"],
        "html": ["html", "html5"],
        "css": ["css", "css3"],
        "react": ["react", "reactjs", "react.js"],
        "node.js": ["node.js", "nodejs", "node js"],
        "django": ["django"],
        "flask": ["flask"],
        "fastapi": ["fastapi"],
        "sql": ["sql", "structured query language"],
        "mysql": ["mysql"],
        "postgresql": ["postgresql", "postgres"],
        "mongodb": ["mongodb", "mongo db"],
        "git": ["git", "version control"],
        "github": ["github"],
        "docker": ["docker", "containerization"],
        "aws": ["aws", "amazon web services"],
        "azure": ["azure", "microsoft azure"],
        "power bi": ["power bi", "powerbi"],
        "excel": [
            "excel",
            "microsoft excel",
            "ms excel",
            "advanced excel"
        ],
        "tableau": ["tableau"],
        "data analysis": [
            "data analysis",
            "data analytics",
            "data analyst",
            "data analysis skills"
        ],
        "machine learning": [
            "machine learning",
            "machine-learning",
            "ml"
        ],
        "artificial intelligence": [
            "artificial intelligence",
            "artificial intelligence",
            "ai"
        ],
        "api": [
            "api",
            "apis",
            "application programming interface"
        ],
        "rest api": [
            "rest api",
            "restful api",
            "rest services"
        ],
        "linux": ["linux", "unix"],
        "c": ["c programming", "programming in c"],
        "c++": ["c++", "cpp"],
        "pandas": ["pandas"],
        "numpy": ["numpy"],
        "matplotlib": ["matplotlib"],
        "statistics": ["statistics", "statistical analysis"],
        "data visualization": [
            "data visualization",
            "data visualisation",
            "visualization"
        ],
    }

    required_skills = []

    # Find skills required by job description
    for skill, aliases in skill_groups.items():

        if any(alias in job_description for alias in aliases):
            required_skills.append(skill)

    matching_skills = []
    missing_skills = []

    # Compare resume with required skills
    for skill in required_skills:

        aliases = skill_groups[skill]

        if any(alias in resume_text for alias in aliases):
            matching_skills.append(skill)
        else:
            missing_skills.append(skill)

    # If no technical skills were detected,
    # perform a basic keyword comparison
    if not required_skills:

        jd_words = set(
            word.strip(".,:;()[]{}")
            for word in job_description.split()
            if len(word) > 3
        )

        resume_words = set(
            word.strip(".,:;()[]{}")
            for word in resume_text.split()
            if len(word) > 3
        )

        common_words = jd_words.intersection(resume_words)

        match_score = min(
            round((len(common_words) / max(len(jd_words), 1)) * 100),
            100
        )

        rating = (
            "Excellent Match" if match_score >= 80
            else "Good Match" if match_score >= 60
            else "Moderate Match" if match_score >= 40
            else "Low Match"
        )

        return {
            "status": "success",
            "match_score": match_score,
            "rating": rating,
            "required_skills": [],
            "matching_skills": list(common_words)[:20],
            "missing_skills": [],
            "recommendations": [
                "No specific technical skills were detected in the job description.",
                "Add relevant keywords from the job description to improve ATS compatibility."
            ]
        }

    # Calculate realistic weighted Job Match score
    skill_score = (
        (len(matching_skills) / len(required_skills)) * 50
        if required_skills else 0
    )

    # Experience relevance
    experience_keywords = [
        "experience",
        "developer",
        "development",
        "project",
        "application",
        "software",
        "web",
        "programming",
        "database",
        "api",
    ]

    experience_matches = sum(
        1 for keyword in experience_keywords
        if keyword in resume_text and keyword in job_description
    )

    experience_score = min(
        (experience_matches / 5) * 20,
        20
    )

    # Education relevance
    education_keywords = [
        "mca",
        "bca",
        "computer science",
        "computer applications",
        "engineering",
        "degree",
        "diploma",
    ]

    education_matches = sum(
        1 for keyword in education_keywords
        if keyword in resume_text and keyword in job_description
    )

    education_score = min(
        (education_matches / 2) * 10,
        10
    )

    # Important job-description keywords
    job_keywords = [
        "authentication",
        "admin dashboard",
        "database",
        "responsive",
        "rest api",
        "api",
        "git",
        "github",
        "problem-solving",
        "communication",
        "teamwork",
        "machine learning",
        "artificial intelligence",
    ]

    keyword_matches = sum(
        1 for keyword in job_keywords
        if keyword in job_description and keyword in resume_text
    )

    keyword_score = min(
        (keyword_matches / 5) * 10,
        10
    )

    # Project / responsibility relevance
    project_keywords = [
        "project",
        "developed",
        "implemented",
        "built",
        "created",
        "responsive",
        "authentication",
        "dashboard",
        "database",
        "crud",
    ]

    project_matches = sum(
        1 for keyword in project_keywords
        if keyword in resume_text and keyword in job_description
    )

    project_score = min(
        (project_matches / 5) * 10,
        10
    )

    match_score = round(
        skill_score
        + experience_score
        + education_score
        + keyword_score
        + project_score
    )

    match_score = min(max(match_score, 0), 100)

    if match_score >= 85:
        rating = "Excellent Match"
    elif match_score >= 70:
        rating = "Strong Match"
    elif match_score >= 55:
        rating = "Good Match"
    elif match_score >= 40:
        rating = "Moderate Match"
    else:
        rating = "Low Match"

    recommendations = []

    if missing_skills:
        recommendations.append(
            "Add or strengthen these skills: "
            + ", ".join(missing_skills)
        )

    if experience_score < 12:
        recommendations.append(
            "Add more job-relevant experience, responsibilities and measurable achievements."
        )

    if education_score < 5:
        recommendations.append(
            "Highlight your most relevant education or technical qualifications."
        )

    if keyword_score < 6:
        recommendations.append(
            "Add important keywords from the job description naturally to your resume."
        )

    if project_score < 6:
        recommendations.append(
            "Highlight projects that demonstrate the responsibilities mentioned in the job description."
        )

    if not recommendations:
        recommendations.append(
            "Your resume has strong alignment with this job description."
        )

    return {
        "status": "success",
        "match_score": match_score,
        "rating": rating,
        "required_skills": required_skills,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "recommendations": recommendations,
    }


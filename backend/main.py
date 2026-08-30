from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from pydantic import BaseModel, EmailStr
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

from backend.analyzer import analyze_resume
from backend.resume_parser import extract_text_from_pdf
from backend.scorer import calculate_ats_score
from backend.suggestions import generate_suggestions


from backend.auth import (
    load_users,
    save_users,
    find_user_by_email,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)


app = FastAPI(
    title="AI Resume Analyzer",
    description="AI-powered Resume Analysis API",
    version="1.0.0"
)


# =========================
# AUTH REQUEST MODELS
# =========================

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )

    email = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    user = find_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    return user

# =========================
# AUTH ROUTES
# =========================

@app.post("/auth/signup")
def auth_signup(data: SignupRequest):
    email = str(data.email).strip().lower()

    existing_user = find_user_by_email(email)

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters."
        )

    user = {
        "name": data.name.strip(),
        "email": email,
        "hashed_password": hash_password(data.password),
        "phone": "",
        "role": "",
        "experience": "",
        "skills": "",
        "bio": "",
        "theme": "dark",
        "notifications": True,
        "email_notifications": True
    }

    users = load_users()
    users.append(user)
    save_users(users)

    token = create_access_token({
        "sub": email
    })

    safe_user = {
        key: value
        for key, value in user.items()
        if key != "hashed_password"
    }

    return {
        "status": "success",
        "message": "Account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user
    }


@app.post("/auth/login")
def auth_login(data: LoginRequest):
    email = str(data.email).strip().lower()

    user = find_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    try:
        password_valid = verify_password(
            data.password,
            user.get("hashed_password", "")
        )
    except Exception:
        password_valid = False

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token({
        "sub": email
    })

    safe_user = {
        key: value
        for key, value in user.items()
        if key != "hashed_password"
    }

    return {
        "status": "success",
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user
    }


@app.get("/auth/me")
def auth_me(current_user=Depends(get_current_user)):
    safe_user = {
        key: value
        for key, value in current_user.items()
        if key != "hashed_password"
    }

    return {
        "status": "success",
        "user": safe_user
    }



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://ai-resume-analyzer.as3042157.workers.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from backend.history import (
    save_history,
    load_history,
    create_history_record,
    delete_history_record,
    clear_history
)

# =========================
# AUTHENTICATION DEPENDENCY
# =========================


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
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

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
            suggestions,
            user_email=current_user.get("email")
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
def get_history(current_user=Depends(get_current_user)):
    user_email = current_user.get("email")

    return {
        "status": "success",
        "history": load_history(user_email)
    }


@app.delete("/history/{record_id}")
def delete_history(
    record_id: str,
    current_user=Depends(get_current_user)
):
    user_email = current_user.get("email")

    deleted = delete_history_record(
        record_id,
        user_email=user_email
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="History record not found."
        )

    return {
        "status": "success",
        "message": "History record deleted."
    }


@app.delete("/history")
def clear_all_history(
    current_user=Depends(get_current_user)
):
    user_email = current_user.get("email")

    clear_history(user_email=user_email)

    return {
        "status": "success",
        "message": "Your history cleared successfully."
    }


from pydantic import BaseModel, EmailStr



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

    import re

    resume_text = request.resume_text.lower()
    job_description = request.job_description.lower()

    # ---------------------------------------------------------
    # ACCURATE SKILL DETECTION
    # ---------------------------------------------------------
    # Use word boundaries instead of simple substring matching.
    # This prevents short aliases such as "ts", "js", "c" and
    # "api" from creating false-positive skill matches.
    def skill_present(alias, text):
        pattern = r"(?<!\w)" + re.escape(alias.lower()) + r"(?!\w)"
        return re.search(pattern, text) is not None

    # ---------------------------------------------------------
    # SKILL GROUPS
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # DETECT REQUIRED SKILLS
    # ---------------------------------------------------------
    required_skills = []

    for skill, aliases in skill_groups.items():
        if any(skill_present(alias, job_description) for alias in aliases):
            required_skills.append(skill)

    # REST API already includes API.
    # Do not count both as independent technical requirements.
    if "rest api" in required_skills and "api" in required_skills:
        required_skills.remove("api")

    matching_skills = []
    missing_skills = []

    for skill in required_skills:
        aliases = skill_groups[skill]

        if any(skill_present(alias, resume_text) for alias in aliases):
            matching_skills.append(skill)
        else:
            missing_skills.append(skill)

    # ---------------------------------------------------------
    # FALLBACK FOR JOB DESCRIPTIONS WITHOUT KNOWN TECH SKILLS
    # ---------------------------------------------------------
    if not required_skills:

        stop_words = {
            "this", "that", "with", "from", "have", "will",
            "your", "their", "they", "them", "should",
            "would", "could", "into", "about", "looking",
            "candidate", "years", "year", "work", "working",
            "team", "using", "role", "must", "able"
        }

        jd_words = {
            word.strip(".,:;()[]{}!?")
            for word in job_description.split()
            if len(word.strip(".,:;()[]{}!?")) > 3
            and word.strip(".,:;()[]{}!?") not in stop_words
        }

        resume_words = {
            word.strip(".,:;()[]{}!?")
            for word in resume_text.split()
            if len(word.strip(".,:;()[]{}!?")) > 3
            and word.strip(".,:;()[]{}!?") not in stop_words
        }

        common_words = jd_words.intersection(resume_words)

        match_score = min(
            round(
                (len(common_words) / max(len(jd_words), 1)) * 100
            ),
            100
        )

        if match_score >= 80:
            rating = "Excellent Match"
        elif match_score >= 65:
            rating = "Strong Match"
        elif match_score >= 50:
            rating = "Good Match"
        elif match_score >= 35:
            rating = "Moderate Match"
        else:
            rating = "Low Match"

        return {
            "status": "success",
            "match_score": match_score,
            "rating": rating,
            "required_skills": [],
            "matching_skills": sorted(list(common_words))[:20],
            "missing_skills": [],
            "recommendations": [
                "No specific technical skills were detected in the job description.",
                "Add relevant keywords from the job description to improve ATS compatibility."
            ]
        }

    # ---------------------------------------------------------
    # IMPROVED JOB MATCH SCORING
    # ---------------------------------------------------------

    # Technical Skills — 50%
    skill_score = (
        (len(matching_skills) / len(required_skills)) * 50
        if required_skills
        else 0
    )

    # ---------------------------------------------------------
    # EXPERIENCE / RESPONSIBILITY RELEVANCE — 20%
    # ---------------------------------------------------------

    experience_groups = {
        "development": [
            "developer",
            "development",
            "developed",
            "software development",
            "application development",
        ],
        "programming": [
            "programming",
            "coding",
            "software",
        ],
        "projects": [
            "project",
            "projects",
            "built",
            "created",
            "implemented",
        ],
        "web": [
            "web",
            "website",
            "web application",
            "frontend",
            "backend",
        ],
        "database": [
            "database",
            "sql",
            "mysql",
            "postgresql",
            "mongodb",
        ],
        "api": [
            "api",
            "rest api",
            "restful api",
            "integration",
        ],
        "testing": [
            "testing",
            "test",
            "debugging",
            "quality assurance",
        ],
        "deployment": [
            "deployment",
            "deployed",
            "production",
            "hosting",
            "cloud",
        ],
        "teamwork": [
            "team",
            "teamwork",
            "collaboration",
            "collaborate",
        ],
    }

    experience_required = []
    experience_matched = []

    for group, aliases in experience_groups.items():
        if any(skill_present(alias, job_description) for alias in aliases):
            experience_required.append(group)

            if any(skill_present(alias, resume_text) for alias in aliases):
                experience_matched.append(group)

    if experience_required:
        experience_score = (
            len(experience_matched) / len(experience_required)
        ) * 20
    else:
        experience_score = 10

    # ---------------------------------------------------------
    # EDUCATION RELEVANCE — 10%
    # ---------------------------------------------------------

    education_groups = {
        "computer science": [
            "computer science",
            "computer applications",
            "computer engineering",
        ],
        "bca": ["bca"],
        "mca": ["mca"],
        "engineering": [
            "engineering",
            "b.tech",
            "btech",
            "m.tech",
            "mtech",
        ],
        "degree": [
            "degree",
            "bachelor",
            "master",
            "graduation",
        ],
        "diploma": [
            "diploma",
            "pgdca",
        ],
    }

    education_required = []
    education_matched = []

    for group, aliases in education_groups.items():
        if any(skill_present(alias, job_description) for alias in aliases):
            education_required.append(group)

            if any(skill_present(alias, resume_text) for alias in aliases):
                education_matched.append(group)

    if education_required:
        education_score = (
            len(education_matched) / len(education_required)
        ) * 10
    else:
        education_score = 5

    # ---------------------------------------------------------
    # JD KEYWORD ALIGNMENT — 10%
    # ---------------------------------------------------------

    keyword_groups = {
        "authentication": [
            "authentication",
            "auth",
            "login",
            "signup",
            "authorization",
        ],
        "dashboard": [
            "dashboard",
            "admin dashboard",
        ],
        "database": [
            "database",
            "sql",
            "mysql",
            "postgresql",
            "mongodb",
        ],
        "responsive": [
            "responsive",
            "mobile friendly",
            "mobile-friendly",
        ],
        "api": [
            "rest api",
            "restful api",
            "api",
        ],
        "git": [
            "git",
            "github",
            "gitlab",
            "version control",
        ],
        "problem solving": [
            "problem-solving",
            "problem solving",
            "analytical",
            "analytical skills",
        ],
        "communication": [
            "communication",
            "communication skills",
        ],
        "teamwork": [
            "teamwork",
            "collaboration",
            "collaborative",
        ],
        "ai": [
            "machine learning",
            "artificial intelligence",
            "ai",
        ],
        "testing": [
            "testing",
            "unit testing",
            "software testing",
        ],
        "deployment": [
            "deployment",
            "deployed",
            "production",
        ],
        "cloud": [
            "cloud",
            "aws",
            "azure",
            "gcp",
        ],
        "security": [
            "security",
            "cybersecurity",
        ],
    }

    keyword_required = []
    keyword_matched = []

    for group, aliases in keyword_groups.items():
        if any(skill_present(alias, job_description) for alias in aliases):
            keyword_required.append(group)

            if any(skill_present(alias, resume_text) for alias in aliases):
                keyword_matched.append(group)

    if keyword_required:
        keyword_score = (
            len(keyword_matched) / len(keyword_required)
        ) * 10
    else:
        keyword_score = 5

    # ---------------------------------------------------------
    # PROJECT / RESPONSIBILITY RELEVANCE — 10%
    # ---------------------------------------------------------

    project_groups = {
        "projects": [
            "project",
            "projects",
        ],
        "development": [
            "developed",
            "built",
            "created",
            "implemented",
        ],
        "application": [
            "application",
            "web application",
            "software",
        ],
        "dashboard": [
            "dashboard",
            "admin dashboard",
        ],
        "database": [
            "database",
            "sql",
            "mysql",
            "mongodb",
        ],
        "authentication": [
            "authentication",
            "login",
            "signup",
            "authorization",
        ],
        "api": [
            "api",
            "rest api",
            "restful api",
        ],
        "deployment": [
            "deployment",
            "deployed",
            "production",
            "hosting",
        ],
        "integration": [
            "integration",
            "integrated",
        ],
    }

    project_required = []
    project_matched = []

    for group, aliases in project_groups.items():
        if any(skill_present(alias, job_description) for alias in aliases):
            project_required.append(group)

            if any(skill_present(alias, resume_text) for alias in aliases):
                project_matched.append(group)

    if project_required:
        project_score = (
            len(project_matched) / len(project_required)
        ) * 10
    else:
        project_score = 5

    # ---------------------------------------------------------
    # FINAL SCORE
    # ---------------------------------------------------------

    match_score = round(
        skill_score
        + experience_score
        + education_score
        + keyword_score
        + project_score
    )

    match_score = min(
        max(match_score, 0),
        100
    )

    # ---------------------------------------------------------
    # RATING
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # RECOMMENDATIONS
    # ---------------------------------------------------------

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



# ============================================================
# AKSH AI — SETTINGS / PREFERENCES API
# ============================================================

class PreferencesUpdateRequest(BaseModel):
    theme: str = "dark"
    notifications: bool = True
    email_notifications: bool = True


@app.put("/auth/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user=Depends(get_current_user)
):
    if not verify_password(
        request.current_password,
        current_user["hashed_password"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect."
        )

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters."
        )

    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password."
        )

    users = load_users()
    email = current_user.get("email", "").strip().lower()

    for user in users:
        if user.get("email", "").strip().lower() == email:
            user["hashed_password"] = hash_password(
                request.new_password
            )
            break
    else:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    save_users(users)

    return {
        "status": "success",
        "message": "Password changed successfully."
    }



class ProfileUpdateRequest(BaseModel):
    name: str
    phone: str = ""
    role: str = ""
    experience: str = ""
    skills: str = ""
    bio: str = ""


@app.get("/auth/profile")
def get_profile(
    current_user=Depends(get_current_user)
):
    email = current_user.get("email", "").strip().lower()

    user = find_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "status": "success",
        "profile": {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", ""),
            "experience": user.get("experience", ""),
            "skills": user.get("skills", ""),
            "bio": user.get("bio", "")
        }
    }


@app.put("/auth/profile")
def update_profile(
    request: ProfileUpdateRequest,
    current_user=Depends(get_current_user)
):
    email = current_user.get("email", "").strip().lower()

    users = load_users()

    for user in users:
        if user.get("email", "").strip().lower() == email:
            user["name"] = request.name.strip()
            user["phone"] = request.phone.strip()
            user["role"] = request.role.strip()
            user["experience"] = request.experience.strip()
            user["skills"] = request.skills.strip()
            user["bio"] = request.bio.strip()

            save_users(users)

            return {
                "status": "success",
                "message": "Profile updated successfully.",
                "profile": {
                    "name": user["name"],
                    "email": user.get("email", ""),
                    "phone": user["phone"],
                    "role": user["role"],
                    "experience": user["experience"],
                    "skills": user["skills"],
                    "bio": user["bio"]
                }
            }

    raise HTTPException(
        status_code=404,
        detail="User not found."
    )

@app.get("/auth/preferences")
def get_preferences(
    current_user=Depends(get_current_user)
):
    return {
        "status": "success",
        "preferences": {
            "theme": current_user.get("theme", "dark"),
            "notifications": current_user.get(
                "notifications", True
            ),
            "email_notifications": current_user.get(
                "email_notifications", True
            )
        }
    }


@app.put("/auth/preferences")
def update_preferences(
    request: PreferencesUpdateRequest,
    current_user=Depends(get_current_user)
):
    allowed_themes = {"dark", "light"}

    if request.theme not in allowed_themes:
        raise HTTPException(
            status_code=400,
            detail="Theme must be dark or light."
        )

    users = load_users()

    email = current_user.get(
        "email", ""
    ).strip().lower()

    for user in users:
        if user.get(
            "email", ""
        ).strip().lower() == email:

            user["theme"] = request.theme
            user["notifications"] = request.notifications
            user["email_notifications"] = (
                request.email_notifications
            )

            break

    else:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    save_users(users)

    return {
        "status": "success",
        "message": "Preferences updated successfully.",
        "preferences": {
            "theme": request.theme,
            "notifications": request.notifications,
            "email_notifications": request.email_notifications
        }
    }

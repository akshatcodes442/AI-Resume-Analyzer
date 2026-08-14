import re


SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "html",
    "css",
    "react",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "git",
    "github",
    "docker",
    "aws",
    "azure",
    "machine learning",
    "data analysis",
    "excel",
    "power bi",
    "figma",
]


def analyze_resume(text: str) -> dict:
    text_lower = text.lower()

    found_skills = [
        skill
        for skill in SKILLS
        if skill.lower() in text_lower
    ]

    email_match = re.search(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        text
    )

    phone_match = re.search(
        r"(?:\+91[\s-]?)?[6-9]\d{9}",
        text
    )

    education_keywords = [
        "b.tech",
        "btech",
        "b.e",
        "bca",
        "mca",
        "m.tech",
        "mba",
        "b.sc",
        "m.sc",
        "bachelor",
        "master",
        "diploma",
        "degree",
    ]

    education = [
        keyword
        for keyword in education_keywords
        if keyword in text_lower
    ]

    experience_match = re.findall(
        r"\b\d+(?:\.\d+)?\+?\s*(?:years?|yrs?)\b",
        text_lower
    )

    return {
        "skills": found_skills,
        "skill_count": len(found_skills),
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "education_keywords": education,
        "experience_mentions": experience_match,
    }

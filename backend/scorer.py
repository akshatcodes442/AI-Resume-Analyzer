def calculate_ats_score(text: str, analysis: dict) -> dict:
    text_lower = text.lower()

    score = 0
    breakdown = {}

    # 1. Skills
    skill_count = analysis.get("skill_count", 0)

    if skill_count >= 10:
        skill_score = 25
    elif skill_count >= 7:
        skill_score = 20
    elif skill_count >= 4:
        skill_score = 15
    elif skill_count >= 2:
        skill_score = 10
    elif skill_count >= 1:
        skill_score = 5
    else:
        skill_score = 0

    score += skill_score
    breakdown["skills"] = skill_score

    # 2. Contact information
    contact_score = 0

    if analysis.get("email"):
        contact_score += 5

    if analysis.get("phone"):
        contact_score += 5

    score += contact_score
    breakdown["contact_information"] = contact_score

    # 3. Education
    education_score = 10 if analysis.get("education_keywords") else 0

    score += education_score
    breakdown["education"] = education_score

    # 4. Experience
    experience_score = 15 if analysis.get("experience_mentions") else 0

    score += experience_score
    breakdown["experience"] = experience_score

    # 5. Important resume sections
    sections = {
        "summary": ["summary", "profile", "objective"],
        "experience": ["experience", "work history"],
        "projects": ["projects", "project"],
        "skills": ["skills", "technical skills"],
        "education": ["education", "qualification"],
    }

    section_count = 0

    for keywords in sections.values():
        if any(keyword in text_lower for keyword in keywords):
            section_count += 1

    section_score = section_count * 4
    score += section_score
    breakdown["resume_sections"] = section_score

    # 6. Resume length
    word_count = len(text.split())

    if 400 <= word_count <= 1200:
        length_score = 15
    elif 250 <= word_count < 400:
        length_score = 10
    elif word_count > 1200:
        length_score = 8
    else:
        length_score = 3

    score += length_score
    breakdown["resume_length"] = length_score

    # Maximum score is 100
    score = min(score, 100)

    if score >= 80:
        rating = "Excellent"
    elif score >= 65:
        rating = "Good"
    elif score >= 50:
        rating = "Average"
    else:
        rating = "Needs Improvement"

    return {
        "ats_score": score,
        "rating": rating,
        "breakdown": breakdown,
        "word_count": word_count,
    }

def generate_suggestions(analysis, ats_result):
    suggestions = []

    # Skills
    if analysis["skill_count"] < 5:
        suggestions.append(
            "Add more relevant technical skills to improve ATS keyword matching."
        )

    # Contact information
    if not analysis.get("email"):
        suggestions.append(
            "Add a professional email address to your resume."
        )

    if not analysis.get("phone"):
        suggestions.append(
            "Add a phone number so recruiters can contact you easily."
        )

    # Education
    if not analysis.get("education_keywords"):
        suggestions.append(
            "Add a clear Education section with your degree, institution and graduation year."
        )

    # Experience
    if not analysis.get("experience_mentions"):
        suggestions.append(
            "Add measurable work experience, internships or relevant project experience."
        )

    # Resume sections
    breakdown = ats_result.get("breakdown", {})

    if breakdown.get("resume_sections", 0) < 16:
        suggestions.append(
            "Improve resume structure using clear sections such as Summary, Skills, Experience, Education and Projects."
        )

    # Resume length
    if ats_result.get("word_count", 0) < 250:
        suggestions.append(
            "Your resume appears short. Add relevant projects, achievements and responsibilities."
        )
    elif ats_result.get("word_count", 0) > 1200:
        suggestions.append(
            "Your resume may be too long. Remove unnecessary information and keep the content focused."
        )

    # ATS score
    score = ats_result.get("ats_score", 0)

    if score < 50:
        priority = "High Priority"
    elif score < 70:
        priority = "Medium Priority"
    else:
        priority = "Low Priority"

    return {
        "priority": priority,
        "suggestion_count": len(suggestions),
        "suggestions": suggestions,
    }

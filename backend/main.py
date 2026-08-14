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
async def analyze_resume_api(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    safe_filename = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_filename

    content = await file.read()
    file_path.write_bytes(content)

    try:
        extracted_text = extract_text_from_pdf(str(file_path))

        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this PDF"
            )

        analysis = analyze_resume(extracted_text)

        ats_result = calculate_ats_score(
            extracted_text,
            analysis
        )

        suggestions = generate_suggestions(
            analysis,
            ats_result
        )

    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise

    except Exception as error:
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=f"Resume analysis failed: {error}"
        )

    return {
        "status": "success",
        "filename": safe_filename,
        "text_length": len(extracted_text),
        "analysis": analysis,
        "ats_result": ats_result,
        "suggestions": suggestions
    }

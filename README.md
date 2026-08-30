# 🚀 AI Resume Analyzer

An AI-powered resume analysis platform that helps job seekers evaluate their resumes, understand ATS performance, identify improvement areas, and track their analysis history.

## ✨ Features

* 📄 **Resume Upload & Parsing**

  * Upload resume files for automated analysis
  * Extract resume content and structured information

* 🎯 **ATS Score**

  * Automated ATS compatibility scoring
  * Clear score presentation and performance rating
  * Detailed ATS breakdown

* 💡 **Resume Suggestions**

  * Identifies areas that can be improved
  * Provides actionable resume improvement suggestions

* 🤖 **Resume Improvement Analysis**

  * Dedicated improvement analysis after resume processing
  * Prioritizes recommendations based on the overall ATS performance

* 🔐 **Authentication**

  * User registration and login
  * JWT-based authentication
  * Protected analysis and history endpoints

* 📚 **Analysis History**

  * Save previous resume analyses
  * View historical analysis results
  * Track resume performance over time

* 📊 **Dashboard**

  * Total analyses
  * Average ATS score
  * Best ATS score
  * Latest ATS score

* 🎯 **Job Match**

  * Resume-to-job matching functionality
  * Helps evaluate resume relevance against job requirements

* 🌐 **Production Deployment**

  * FastAPI backend deployed on Render
  * Static frontend deployed separately
  * Production API connected through CORS configuration

---

## 🧠 How It Works

```text
Upload Resume
      ↓
Resume Text Extraction
      ↓
Resume Analysis
      ↓
ATS Scoring
      ↓
Skills / Contact / Education / Experience Analysis
      ↓
Improvement Suggestions
      ↓
Save Analysis History
      ↓
Dashboard Statistics
```

---

## 📊 ATS Scoring

The application evaluates the resume and generates an ATS score based on the implemented resume-analysis and scoring logic.

The UI uses performance levels such as:

| Score    | Rating            |
| -------- | ----------------- |
| 85–100   | Excellent         |
| 70–84    | Strong            |
| 50–69    | Needs Improvement |
| Below 50 | High Priority     |

The score is presented together with actionable improvement recommendations.

---

## 🔐 Authentication

The application uses token-based authentication to protect user-specific functionality.

Authentication includes:

* User signup
* User login
* JWT access tokens
* Protected API requests
* User-specific analysis history

---

## 📚 Analysis History

Each completed analysis can be stored in the user's history.

The dashboard can use this history to calculate:

* Total analyses
* Average score
* Best score
* Latest score

This allows users to monitor their resume improvement over time.

---

## 🛠️ Tech Stack

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* JWT Authentication
* Passlib
* bcrypt
* PyPDF

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive UI

### Deployment

* Render — Backend API
* Cloudflare Pages — Frontend
* GitHub — Source Control

---

## 📁 Project Structure

```text
AI-Resume-Analyzer/
│
├── backend/
│   ├── main.py
│   ├── analyzer.py
│   ├── resume_parser.py
│   ├── scorer.py
│   └── suggestions.py
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── uploads/
│
├── requirements.txt
├── render.yaml
├── wrangler.jsonc
├── .gitignore
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/akshatcodes442/AI-Resume-Analyzer.git
cd AI-Resume-Analyzer
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
```

### 3. Activate the environment

macOS / Linux:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Start the backend

```bash
uvicorn backend.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

### 6. Check the API

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "healthy"
}
```

---

## 🔌 API

Main API routes include:

```text
GET  /
GET  /health

POST /signup
POST /login

POST /analyze-resume
POST /improve-resume

GET  /history
```

Authentication-protected endpoints require a valid Bearer token.

---

## 🌐 Production

The backend is deployed and currently available at:

```text
https://aksh-ai-backend.onrender.com
```

Health endpoint:

```text
https://aksh-ai-backend.onrender.com/health
```

Production health response:

```json
{
  "status": "healthy"
}
```

---

## 🧪 Production Verification

The production deployment has been verified for:

* Backend availability ✅
* Health endpoint ✅
* API root endpoint ✅
* Frontend-to-backend connection ✅
* Authentication ✅
* Resume upload ✅
* ATS analysis ✅
* ATS scoring ✅
* Suggestions ✅
* Resume improvement ✅
* Analysis history ✅
* Dashboard statistics ✅

---

## 🔮 Future Improvements

Potential future enhancements include:

* AI-powered resume rewriting
* Job description keyword extraction
* Advanced job matching
* Multiple resume versions
* Resume comparison
* PDF resume generation
* More detailed ATS category scoring
* Interview preparation
* Personalized career recommendations
* Analytics and progress charts

---

## 👨‍💻 Author

**Akshat Sharma**

GitHub:
https://github.com/akshatcodes442

---

## ⭐ Project

If you find this project useful, consider giving the repository a ⭐ on GitHub.

Built with **Python, FastAPI, JavaScript and a focus on practical AI-powered career tools.**


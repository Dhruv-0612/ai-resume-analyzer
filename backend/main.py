from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from groq import Groq
from dotenv import load_dotenv
import io
import json
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@app.get("/")
def root():
    return {"message": "AI Resume Analyzer Backend Running"}


def extract_text_from_pdf(pdf_bytes):
    pdf_stream = io.BytesIO(pdf_bytes)
    reader = PdfReader(pdf_stream)
    extracted_text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            extracted_text += page_text + "\n"

    return extracted_text.strip()


def keyword_resume_check(text):
    text_lower = text.lower()

    resume_keywords = [
        "name",
        "email",
        "phone",
        "contact",
        "address",
        "linkedin",
        "github",
        "summary",
        "profile",
        "objective",
        "education",
        "skills",
        "technical skills",
        "experience",
        "work experience",
        "employment",
        "projects",
        "internship",
        "internships",
        "certifications",
        "achievements",
        "languages",
    ]

    matched_keywords = [keyword for keyword in resume_keywords if keyword in text_lower]
    return matched_keywords


def validate_resume_with_ai(text):
    validation_prompt = f"""
You are a document classifier.

Your task is to determine whether the following text is a resume/CV or not.

Return only valid JSON in this exact format:

{{
  "is_resume": true,
  "confidence": 0,
  "reason": "short reason"
}}

Rules:
- is_resume must be true or false
- confidence must be an integer between 0 and 100
- reason must be short and clear
- return JSON only
- do not include markdown
- do not include explanation outside JSON

Document text:
{text[:4000]}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a strict classifier that returns only valid JSON."
            },
            {
                "role": "user",
                "content": validation_prompt
            }
        ],
        temperature=0.1,
    )

    raw_output = response.choices[0].message.content
    return json.loads(raw_output)


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        if file.content_type != "application/pdf":
            return {"error": "Only PDF files are allowed."}

        pdf_bytes = await file.read()
        extracted_text = extract_text_from_pdf(pdf_bytes)

        return {
            "filename": file.filename,
            "text": extracted_text
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    try:
        if file.content_type != "application/pdf":
            return {
                "success": False,
                "message": "Please upload a PDF file only."
            }

        pdf_bytes = await file.read()
        extracted_text = extract_text_from_pdf(pdf_bytes)

        if not extracted_text:
            return {
                "success": False,
                "message": "We could not extract readable text from this PDF. Please try another file."
            }

        matched_keywords = keyword_resume_check(extracted_text)
        ai_validation = validate_resume_with_ai(extracted_text)

        is_resume = ai_validation.get("is_resume", False)
        confidence = ai_validation.get("confidence", 0)
        reason = ai_validation.get("reason", "No reason provided.")

        if len(matched_keywords) < 4 or not is_resume or confidence < 60:
            return {
                "success": False,
                "message": "We couldn’t identify this file as a resume. Please upload a valid resume PDF to continue.",
                "validation": {
                    "matched_keywords": matched_keywords,
                    "ai_confidence": confidence,
                    "ai_reason": reason
                }
            }

        prompt = f"""
You are a highly experienced ATS (Applicant Tracking System) resume evaluator and career coach.

Your task is to analyze the resume text and return a structured, realistic, and professional evaluation.

Return ONLY valid JSON in this exact format:

{{
  "ats_score": 0,
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2", "point 3"],
  "suggestions": ["point 1", "point 2", "point 3"]
}}

Evaluation Guidelines:

ATS Score (0–100):
- Consider keyword relevance
- Section clarity (education, experience, skills)
- Formatting and structure
- Use of measurable achievements
- Overall readability

Strengths:
- Return exactly 3 points
- Must be specific and resume-based
- Avoid generic phrases
- Focus on what is done well
- Keep each point 1 line

Weaknesses:
- Return exactly 3 points
- Must identify real gaps or missing elements
- Be precise (not vague)
- Focus on improvement areas
- Keep each point 1 line

Suggestions:
- Return exactly 3 points
- Must be actionable and practical
- Should directly fix weaknesses
- Include examples where helpful
- Keep each point 1 line (slightly descriptive)

Rules:
- Do NOT return more than 3 points in any list
- Do NOT return fewer than 3 points in any list
- Do NOT use generic statements
- Do NOT repeat similar points
- Do NOT include markdown
- Do NOT include explanation outside JSON
- Keep language professional and concise

Resume Text:
{extracted_text}
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict ATS resume analyzer that returns only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
        )

        raw_output = response.choices[0].message.content

        try:
            parsed_output = json.loads(raw_output)
            return {
                "success": True,
                "filename": file.filename,
                "analysis": parsed_output
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "filename": file.filename,
                "message": "The analysis was generated, but the response format was invalid. Please try again.",
                "raw_response": raw_output
            }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }
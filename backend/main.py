from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import PyPDF2
import io
import os

from dotenv import load_dotenv
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}

class QuestionRequest(BaseModel):
    session_id: str
    job_role: str

class AnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), session_id: str = "default"):
    contents = await file.read()
    reader = PyPDF2.PdfReader(io.BytesIO(contents))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    # Extract candidate name using AI
    name_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": f"Extract only the full name of the candidate from this resume. Return ONLY the name, nothing else.\n\n{text[:1000]}"}],
        max_tokens=20
    )
    candidate_name = name_response.choices[0].message.content.strip()

    sessions[session_id] = {
        "resume": text,
        "candidate_name": candidate_name,
        "history": [],
        "scores": [],
        "job_role": ""
    }
    return {"message": "Resume uploaded", "session_id": session_id, "candidate_name": candidate_name}

@app.post("/generate-question")
async def generate_question(req: QuestionRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload resume first.")

    history_text = "\n".join(
        [f"Q: {h['question']}\nA: {h['answer']}" for h in session["history"]]
    ) or "None yet."

    question_number = len(session["history"]) + 1

    if question_number <= 2:
        prompt = f"""
You are an expert technical interviewer conducting a real interview.
Job Role: {req.job_role}

Candidate Resume:
{session['resume'][:3000]}

Previous Q&A:
{history_text}

Generate ONE interview question based specifically on something from the candidate's resume.
For example their projects, skills, experience or education.
Return ONLY the question text, nothing else.
"""
    else:
        prompt = f"""
You are an expert technical interviewer conducting a real interview.
Job Role: {req.job_role}

Previous Q&A:
{history_text}

Generate ONE new interview question for the job role.
Mix technical, behavioral and situational questions.
Do NOT repeat previous questions.
Return ONLY the question text, nothing else.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200
    )
    return {"question": response.choices[0].message.content.strip()}

@app.post("/evaluate-answer")
async def evaluate_answer(req: AnswerRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    prompt = f"""
You are a strict but fair interview evaluator.

Question: {req.question}
Candidate's Answer: {req.answer}

Evaluate the answer and respond in this exact format:
SCORE: <number from 1 to 10>
FEEDBACK: <2-3 sentences of constructive feedback>
IDEAL_ANSWER: <a brief ideal answer in 2-3 sentences>
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )
    raw = response.choices[0].message.content.strip()

    score = 5
    feedback = ""
    ideal = ""

    for line in raw.splitlines():
        if line.startswith("SCORE:"):
            try:
                score = int(line.replace("SCORE:", "").strip())
            except:
                score = 5
        elif line.startswith("FEEDBACK:"):
            feedback = line.replace("FEEDBACK:", "").strip()
        elif line.startswith("IDEAL_ANSWER:"):
            ideal = line.replace("IDEAL_ANSWER:", "").strip()

    session["history"].append({"question": req.question, "answer": req.answer})
    session["scores"].append(score)

    return {"score": score, "feedback": feedback, "ideal_answer": ideal}

@app.get("/session-summary/{session_id}")
async def session_summary(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    history = session["history"]

    prompt = f"""
You are an expert interview coach. Analyze this complete interview and give detailed feedback.

Job Role: {session.get('job_role', 'Not specified')}

Interview Questions and Answers:
{chr(10).join([f"Q{i+1}: {h['question']}{chr(10)}A{i+1}: {h['answer']}" for i, h in enumerate(history)])}

Respond in this EXACT format:
OVERALL_SCORE: <number from 1 to 10>
SUMMARY: <3-4 sentence overall summary>
STRENGTHS:
- <strength 1>
- <strength 2>
- <strength 3>
IMPROVEMENTS:
- <area to improve 1>
- <area to improve 2>
- <area to improve 3>
IDEAL_ANSWERS:
Q1: <ideal answer for question 1 in 2-3 sentences>
Q2: <ideal answer for question 2 in 2-3 sentences>
Q3: <ideal answer for question 3 in 2-3 sentences>
Q4: <ideal answer for question 4 in 2-3 sentences>
Q5: <ideal answer for question 5 in 2-3 sentences>
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500
    )
    raw = response.choices[0].message.content.strip()

    overall_score = 5
    summary = ""
    strengths = []
    improvements = []
    ideal_answers = []
    current_section = None

    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("OVERALL_SCORE:"):
            try:
                overall_score = int(line.replace("OVERALL_SCORE:", "").strip())
            except:
                overall_score = 5
        elif line.startswith("SUMMARY:"):
            summary = line.replace("SUMMARY:", "").strip()
            current_section = "summary"
        elif line == "STRENGTHS:":
            current_section = "strengths"
        elif line == "IMPROVEMENTS:":
            current_section = "improvements"
        elif line == "IDEAL_ANSWERS:":
            current_section = "ideal_answers"
        elif line.startswith("- ") and current_section in ["strengths", "improvements"]:
            item = line[2:].strip()
            if current_section == "strengths":
                strengths.append(item)
            elif current_section == "improvements":
                improvements.append(item)
        elif line.startswith("Q") and current_section == "ideal_answers":
            parts = line.split(":", 1)
            if len(parts) == 2:
                ideal_answers.append({
                    "question": history[len(ideal_answers)]["question"] if len(ideal_answers) < len(history) else "",
                    "ideal": parts[1].strip()
                })

    return {
        "total_questions": len(history),
        "overall_score": overall_score,
        "summary": summary,
        "strengths": strengths,
        "improvements": improvements,
        "ideal_answers": ideal_answers,
        "history": history
    }
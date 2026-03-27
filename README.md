# 🤖 AI Interview Simulator

A real-time AI-powered mock interview platform that conducts voice-based interviews using your resume and provides detailed performance feedback.

## 🎥 Live Demo
🔴 **Live:** https://ai-interview-simulator-frontend.onrender.com

## ✨ Features

- 📄 **Resume-based questions** — AI reads your resume and asks personalized questions
- 🎤 **Voice only interview** — No typing needed, speak your answers naturally
- 📹 **Camera support** — Real video call style interview experience
- 🤖 **Animated AI interviewer** — Talking avatar that greets you by name
- 🧠 **Smart question mix** — 2 resume-based + 3 role-based questions
- 📊 **Detailed feedback report** — Strengths, areas to improve and ideal answers
- 🔁 **Retry logic** — AI asks again if it doesn't hear you clearly

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Python, FastAPI, Uvicorn |
| AI Model | Groq API (Llama 3.3 70B) |
| PDF Parsing | PyPDF2 |
| Voice Input | Web Speech API (browser built-in) |
| Voice Output | Web Speech Synthesis API (browser built-in) |
| Deployment | Render (backend + frontend) |

## 📁 Project Structure
```
ai-interview-simulator/
├── backend/
│   ├── main.py          # FastAPI server
│   ├── requirements.txt # Python dependencies
│   └── .env             # API keys (not pushed to GitHub)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ResumeUpload.jsx  # Resume upload page
    │   │   ├── Interview.jsx     # Main interview screen
    │   │   └── Summary.jsx       # Final feedback report
    │   ├── hooks/
    │   │   └── useSpeech.js      # Voice input/output hook
    │   ├── api.js                # API calls to backend
    │   └── App.jsx               # Main app component
    └── package.json
```

## 🚀 How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at https://console.groq.com)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

Create `.env` file in the `backend` folder:
```
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:
```bash
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open **Chrome** and go to:
```
http://localhost:5173
```

> ⚠️ Chrome is required for Web Speech API (voice features)

## 🎯 How It Works

1. **Upload Resume** — Upload your PDF resume and enter the job role
2. **AI Reads Resume** — Backend extracts your name and resume content
3. **Greeting** — AI greets you by name and asks if you are ready
4. **Interview Begins** — AI asks 5 questions (2 from resume + 3 role-based)
5. **Voice Answers** — Speak your answers, AI listens and saves them
6. **Final Report** — Get detailed feedback with strengths, improvements and ideal answers

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-resume` | Upload PDF and extract candidate info |
| POST | `/generate-question` | Generate next interview question |
| POST | `/evaluate-answer` | Save answer for evaluation |
| GET | `/session-summary/{id}` | Get full interview feedback report |

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |

## 📸 Screenshots

> Upload resume → AI greets you → Voice interview → Detailed feedback report

## 🙋 Author

**Soham Dhekale**
- GitHub: [@sohamm05](https://github.com/sohamm05)

## 📄 License
MIT License

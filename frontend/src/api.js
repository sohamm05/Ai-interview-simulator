import axios from "axios";

const API = axios.create({ baseURL: "https://ai-interview-simulator-v6s6.onrender.com" });

export const uploadResume = (formData, sessionId) =>
  API.post(`/upload-resume?session_id=${sessionId}`, formData);

export const generateQuestion = (sessionId, jobRole) =>
  API.post("/generate-question", { session_id: sessionId, job_role: jobRole });

export const evaluateAnswer = (sessionId, question, answer) =>
  API.post("/evaluate-answer", { session_id: sessionId, question, answer });

export const getSessionSummary = (sessionId) =>
  API.get(`/session-summary/${sessionId}`);
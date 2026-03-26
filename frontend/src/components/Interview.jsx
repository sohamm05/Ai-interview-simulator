import { useState, useEffect, useRef } from "react";
import { generateQuestion, evaluateAnswer } from "../api";

export default function Interview({ sessionId, jobRole, candidateName, onFinish }) {
  const [phase, setPhase] = useState("greeting");
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [isTalking, setIsTalking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [timer, setTimer] = useState(0);
  const [statusText, setStatusText] = useState("Connecting...");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const questionCountRef = useRef(0);
  const MAX_QUESTIONS = 5;

  useEffect(() => {
    startCamera();
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => {
      stopCamera();
      clearInterval(timerRef.current);
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Camera access denied.");
    }
    setTimeout(() => startGreeting(), 1000);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const speak = (text, onEnd) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1.1;
    setIsTalking(true);
    utterance.onend = () => {
      setIsTalking(false);
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startGreeting = () => {
    setPhase("greeting");
    setStatusText("AI Interviewer is greeting you...");
    speak(
      `Hi ${candidateName}! Welcome to your interview for the ${jobRole} position. I will be your interviewer today. Are you ready to begin?`,
      () => {
        setStatusText("Say 'Yes' to start the interview...");
        listenForYes(1);
      }
    );
  };

  const listenForYes = (attempt) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Please use Chrome browser for voice features.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    const silenceTimeout = setTimeout(() => {
      recognition.abort();
      if (attempt >= 2) {
        speak(
          "I am not able to hear you. Please check your microphone and say yes when you are ready.",
          () => listenForYes(1)
        );
      } else {
        speak(
          "Can you hear me? Please say yes whenever you are ready to begin.",
          () => listenForYes(attempt + 1)
        );
      }
    }, 10000);

    recognition.onresult = (e) => {
      clearTimeout(silenceTimeout);
      const said = e.results[0][0].transcript.toLowerCase().trim();

      const positiveWords = [
        "yes", "yeah", "yep", "yup", "sure", "ready",
        "ok", "okay", "let's go", "lets go", "absolutely",
        "of course", "start", "begin", "go ahead", "go",
        "i am ready", "im ready", "i'm ready", "definitely",
        "alright", "all right", "sounds good", "i do"
      ];

      const isPositive = positiveWords.some((word) => said.includes(word));

      if (isPositive) {
        speak(
          "Excellent! Let us begin. I will ask you 5 questions one by one. Please answer each one clearly after I finish speaking.",
          () => fetchAndAskQuestion()
        );
      } else {
        speak(
          "I did not quite catch that. Whenever you are ready just say yes or ready and we will begin.",
          () => listenForYes(1)
        );
      }
    };

    recognition.onerror = (e) => {
      clearTimeout(silenceTimeout);
      if (e.error === "no-speech") {
        speak(
          "I did not hear anything. Please say yes when you are ready.",
          () => listenForYes(attempt + 1)
        );
      } else {
        setStatusText("Microphone error. Please check your mic and say yes...");
        setTimeout(() => listenForYes(1), 3000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const fetchAndAskQuestion = async () => {
    setPhase("listening");
    setStatusText("AI is thinking of a question...");
    try {
      const res = await generateQuestion(sessionId, jobRole);
      const q = res.data.question;
      setQuestion(q);
      questionCountRef.current = questionCountRef.current + 1;
      setQuestionCount(questionCountRef.current);
      speak(q, () => {
        setPhase("answering");
        setStatusText("Your turn — speak your answer now...");
        listenForAnswer(q, 1);
      });
    } catch {
      setStatusText("Error loading question. Check backend.");
    }
  };

  const listenForAnswer = (currentQuestion, attempt) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    let finalAnswer = "";
    let silenceTimer = null;

    const noSpeechTimeout = setTimeout(() => {
      recognition.abort();
      speak(
        "I have not heard your answer yet. Am I audible? Please speak your answer clearly.",
        () => listenForAnswer(currentQuestion, attempt + 1)
      );
    }, 12000);

    recognition.onresult = (e) => {
      clearTimeout(noSpeechTimeout);
      clearTimeout(silenceTimer);
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalAnswer += e.results[i][0].transcript + " ";
        }
      }
      setStatusText("Listening... keep speaking or pause when done");
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 3000);
    };

    recognition.onend = async () => {
      clearTimeout(noSpeechTimeout);
      clearTimeout(silenceTimer);
      if (finalAnswer.trim().length > 2) {
        setStatusText("Got your answer! Moving on...");
        await saveAnswer(currentQuestion, finalAnswer.trim());
      } else {
        if (attempt >= 3) {
          const currentCount = questionCountRef.current;
          if (currentCount >= MAX_QUESTIONS) {
            endInterview();
          } else {
            speak(
              "No worries, let us move to the next question.",
              () => fetchAndAskQuestion()
            );
          }
        } else {
          speak(
            "I did not catch your answer. Could you please repeat that?",
            () => listenForAnswer(currentQuestion, attempt + 1)
          );
        }
      }
    };

    recognition.onerror = (e) => {
      clearTimeout(noSpeechTimeout);
      clearTimeout(silenceTimer);
      if (e.error === "no-speech") {
        speak(
          "I did not hear anything. Please speak your answer.",
          () => listenForAnswer(currentQuestion, attempt + 1)
        );
      } else {
        setTimeout(() => listenForAnswer(currentQuestion, attempt + 1), 2000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

 const saveAnswer = async (q, answer) => {
    try {
      await evaluateAnswer(sessionId, q, answer);
      const currentCount = questionCountRef.current;
      if (currentCount >= MAX_QUESTIONS) {
        endInterview();
      } else {
        speak("Thank you for your answer. Here is the next question.", () => {
          fetchAndAskQuestion();
        });
      }
    } catch {
      const currentCount = questionCountRef.current;
      if (currentCount >= MAX_QUESTIONS) {
        endInterview();
      } else {
        speak("Let us move to the next question.", () => {
          fetchAndAskQuestion();
        });
      }
    }
  };

  const endInterview = () => {
    setPhase("finished");
    clearInterval(timerRef.current);
    stopCamera();
    speak(
      `Thank you ${candidateName}! That concludes your interview. You answered all ${MAX_QUESTIONS} questions. I will now prepare your detailed feedback report.`,
      () => setTimeout(() => onFinish(), 1500)
    );
    setStatusText("Interview complete! Preparing your report...");
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="w-full max-w-5xl space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center bg-gray-900 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-red-400 text-sm font-medium">LIVE</span>
          <span className="text-gray-500 text-sm ml-2">{formatTime(timer)}</span>
        </div>
        <span className="text-gray-400 text-sm">
          {phase === "greeting" ? "Greeting" : `Question `}
          {phase !== "greeting" && <span className="text-white font-semibold">{questionCount}</span>}
          {phase !== "greeting" && ` / ${MAX_QUESTIONS}`}
        </span>
        <span className="text-indigo-400 text-sm">{jobRole}</span>
      </div>

      {/* Video call area */}
      <div className="grid grid-cols-2 gap-4">

        {/* AI Interviewer */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center">
          <div className="relative flex flex-col items-center justify-center h-full w-full">
            <div className={`relative w-28 h-28 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg transition-all duration-300 ${isTalking ? "scale-110" : "scale-100"}`}>
              <div className="absolute flex gap-5 top-8">
                <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                </div>
                <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                </div>
              </div>
              <div className={`absolute bottom-7 w-10 rounded-full border-2 border-white transition-all duration-150 ${isTalking ? "h-4 bg-gray-900" : "h-1"}`}></div>
              {isTalking && (
                <div className="absolute -right-8 flex items-center gap-1">
                  <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: "12px", animationDelay: "0ms" }}></div>
                  <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: "20px", animationDelay: "150ms" }}></div>
                  <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: "14px", animationDelay: "300ms" }}></div>
                </div>
              )}
            </div>
            <div className="w-36 h-16 bg-indigo-800 rounded-t-3xl mt-3"></div>
          </div>
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
            <p className="text-white text-xs font-medium">AI Interviewer</p>
          </div>
          {isTalking && (
            <div className="absolute top-3 right-3 bg-indigo-600 px-2 py-1 rounded-lg">
              <p className="text-white text-xs">Speaking...</p>
            </div>
          )}
        </div>

        {/* User Camera */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
          {cameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]"/>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <p className="text-4xl mb-2">📷</p>
              <p className="text-sm text-center px-4">{cameraError || "Camera not available"}</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
            <p className="text-white text-xs font-medium">{candidateName || "You"}</p>
          </div>
          {phase === "answering" && (
            <div className="absolute top-3 right-3 bg-red-600 px-2 py-1 rounded-lg flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <p className="text-white text-xs">Listening...</p>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-900 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            phase === "answering" ? "bg-red-500 animate-pulse" :
            isTalking ? "bg-indigo-500 animate-pulse" :
            "bg-gray-600"
          }`}></div>
          <p className="text-gray-300 text-sm">{statusText}</p>
        </div>
        {question && phase !== "greeting" && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">Current Question</p>
            <p className="text-white text-sm leading-relaxed">{question}</p>
          </div>
        )}
      </div>

    </div>
  );
}
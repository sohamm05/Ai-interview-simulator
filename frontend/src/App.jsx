import { useState } from "react";
import ResumeUpload from "./components/ResumeUpload";
import Interview from "./components/Interview";
import Summary from "./components/Summary";

export default function App() {
  const [step, setStep] = useState("upload");
  const [sessionId] = useState("session_" + Date.now());
  const [jobRole, setJobRole] = useState("");
  const [candidateName, setCandidateName] = useState("");

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-2 text-indigo-400">
        AI Interview Simulator
      </h1>
      <p className="text-gray-400 mb-8 text-sm">
        Powered by Groq AI + Web Speech API
      </p>

      {step === "upload" && (
        <ResumeUpload
          sessionId={sessionId}
          jobRole={jobRole}
          setJobRole={setJobRole}
          onDone={(name) => {
            setCandidateName(name);
            setStep("interview");
          }}
        />
      )}
      {step === "interview" && (
        <Interview
          sessionId={sessionId}
          jobRole={jobRole}
          candidateName={candidateName}
          onFinish={() => setStep("summary")}
        />
      )}
      {step === "summary" && (
        <Summary
          sessionId={sessionId}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  );
}
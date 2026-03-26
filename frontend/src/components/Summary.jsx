import { useState, useEffect } from "react";
import { getSessionSummary } from "../api";

export default function Summary({ sessionId, onRestart }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionSummary(sessionId)
      .then((res) => setData(res.data))
      .catch(() => alert("Could not load summary."))
      .finally(() => setLoading(false));
  }, []);

  const scoreColor = (s) => {
    if (s >= 8) return "text-green-400";
    if (s >= 5) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (s) => {
    if (s >= 8) return "bg-green-500";
    if (s >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) return (
    <div className="flex flex-col items-center gap-3 mt-20">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400">Preparing your interview report...</p>
    </div>
  );

  if (!data) return null;

  return (
    <div className="w-full max-w-2xl space-y-5 pb-10">

      {/* Final Score */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Interview Complete</p>
        <p className={`text-7xl font-bold ${scoreColor(data.overall_score)}`}>
          {data.overall_score}
        </p>
        <p className="text-gray-400 text-sm mt-1">out of 10</p>
        <div className="w-full bg-gray-800 rounded-full h-2 mt-4">
          <div
            className={`h-2 rounded-full ${scoreBg(data.overall_score)}`}
            style={{ width: `${data.overall_score * 10}%` }}
          />
        </div>
      </div>

      {/* Overall Summary */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Overall Summary</p>
        <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
      </div>

      {/* Strengths */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow">
        <p className="text-xs text-green-500 uppercase tracking-widest mb-4">✅ Your Strengths</p>
        <ul className="space-y-3">
          {data.strengths && data.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-green-900 text-green-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-gray-300 text-sm">{s}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Areas to Improve */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow">
        <p className="text-xs text-yellow-500 uppercase tracking-widest mb-4">⚠️ Areas to Improve</p>
        <ul className="space-y-3">
          {data.improvements && data.improvements.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-yellow-900 text-yellow-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-gray-300 text-sm">{item}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Ideal Answers */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-4">💡 How You Should Have Answered</p>
        <div className="space-y-5">
          {data.ideal_answers && data.ideal_answers.map((item, i) => (
            <div key={i} className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Question {i + 1}</p>
              <p className="text-white text-sm font-medium mb-3">{item.question}</p>
              <div className="bg-indigo-950 rounded-lg p-3">
                <p className="text-xs text-indigo-400 mb-1">Ideal Answer</p>
                <p className="text-gray-300 text-sm leading-relaxed">{item.ideal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onRestart}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
      >
        Start New Interview
      </button>
    </div>
  );
}
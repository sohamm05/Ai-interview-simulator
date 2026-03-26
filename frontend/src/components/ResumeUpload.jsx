import { useState } from "react";
import { uploadResume } from "../api";

export default function ResumeUpload({ sessionId, jobRole, setJobRole, onDone }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!file || !jobRole.trim()) {
      setError("Please upload a resume and enter a job role.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadResume(formData, sessionId);
      const candidateName = res.data.candidate_name;
      onDone(candidateName);
    } catch (e) {
      setError("Failed to upload resume. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-lg">
      <h2 className="text-xl font-semibold mb-2 text-white">Start Your Interview</h2>
      <p className="text-gray-400 text-sm mb-6">Upload your resume and the AI will conduct a real voice interview with you.</p>

      <label className="block text-sm text-gray-400 mb-1">Job Role</label>
      <input
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 mb-4 text-white focus:outline-none focus:border-indigo-500"
        placeholder="e.g. Frontend Developer, Data Scientist"
        value={jobRole}
        onChange={(e) => setJobRole(e.target.value)}
      />

      <label className="block text-sm text-gray-400 mb-1">Upload Resume (PDF)</label>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="w-full text-gray-300 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
      />

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
      >
        {loading ? "Reading resume..." : "Start Interview →"}
      </button>
    </div>
  );
}
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

function App() {
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 NEW: API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setFileName(file.name);
      setAnalysis(null);
      setErrorMessage("");
      setIsLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("Backend Response:", data);

        if (data.success) {
          setAnalysis(data.analysis);
        } else {
          setErrorMessage(
            data.message ||
              "Something went wrong while analyzing the resume. Please try again.",
          );
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setErrorMessage(
          "Unable to connect to the server. Please make sure the backend is running.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE_URL],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[-80px] top-[260px] h-[260px] w-[260px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-[80px] right-[-60px] h-[280px] w-[280px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14 md:py-20">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
            AI-Powered Resume Review
          </div>

          <h1 className="mt-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
            AI Resume Analyzer
          </h1>

          <p className="mt-6 text-base leading-8 text-slate-300 md:text-xl">
            Upload your PDF resume and get ATS-style scoring, strengths,
            weaknesses, and actionable suggestions in seconds.
          </p>
        </div>

        {/* Upload Box */}
        <div className="mx-auto mt-12 max-w-4xl rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-6">
          <div
            {...getRootProps()}
            className="group rounded-[26px] border border-white/10 bg-slate-950/75 p-8 text-center transition duration-300 hover:border-cyan-400/40 hover:bg-slate-950/85 md:p-12"
          >
            <input {...getInputProps()} />

            {isDragActive ? (
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                  📄
                </div>
                <p className="mt-5 text-2xl font-semibold text-cyan-300">
                  Drop your resume here
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Release the file to begin analysis
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                  📄
                </div>

                <h2 className="mt-5 text-3xl font-semibold text-white">
                  Upload Your Resume
                </h2>

                <p className="mt-3 text-sm text-slate-400">
                  PDF files only • Instant AI analysis
                </p>

                <button
                  type="button"
                  className="mt-7 rounded-xl bg-cyan-400 px-7 py-3.5 text-base font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)] transition hover:scale-[1.02] hover:bg-cyan-300"
                >
                  Choose PDF File
                </button>
              </>
            )}
          </div>

          {fileName && (
            <p className="mt-5 text-center text-sm font-medium text-emerald-400">
              Selected File: {fileName}
            </p>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
              <p className="mt-4 text-lg font-semibold text-cyan-300">
                Analyzing your resume...
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Checking structure, content, and improvement opportunities.
              </p>
            </div>
          )}

          {/* Error */}
          {errorMessage && !isLoading && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-950/30 p-5 text-center shadow-[0_0_24px_rgba(239,68,68,0.08)]">
              <p className="text-base font-medium text-red-300">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {analysis && !isLoading && (
          <div className="mx-auto mt-14 max-w-5xl space-y-7">
            {/* ATS Score */}
            <div className="rounded-[30px] border border-cyan-400/15 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 p-10 text-center shadow-[0_20px_60px_rgba(8,145,178,0.14)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                ATS Score
              </p>
              <p className="mt-5 text-6xl font-bold text-white md:text-7xl">
                {analysis.ats_score} / 100
              </p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[30px] border border-emerald-500/15 bg-gradient-to-br from-emerald-950/20 to-slate-900 p-7 shadow">
                <h3 className="text-2xl font-bold text-emerald-400">
                  Strengths
                </h3>
                <ul className="mt-5 space-y-4">
                  {analysis.strengths?.map((item, index) => (
                    <li key={index} className="p-4 rounded-xl bg-slate-900/70">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[30px] border border-rose-500/15 bg-gradient-to-br from-rose-950/20 to-slate-900 p-7 shadow">
                <h3 className="text-2xl font-bold text-rose-400">Weaknesses</h3>
                <ul className="mt-5 space-y-4">
                  {analysis.weaknesses?.map((item, index) => (
                    <li key={index} className="p-4 rounded-xl bg-slate-900/70">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions */}
            <div className="rounded-[30px] border border-amber-500/15 bg-gradient-to-br from-amber-950/20 to-slate-900 p-7 shadow">
              <h3 className="text-2xl font-bold text-amber-400">Suggestions</h3>
              <ul className="mt-5 space-y-4">
                {analysis.suggestions?.map((item, index) => (
                  <li key={index} className="p-4 rounded-xl bg-slate-900/70">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

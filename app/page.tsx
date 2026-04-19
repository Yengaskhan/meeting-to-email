"use client";

import { useState } from "react";
import { Counter } from "./components/Counter";

interface ConvertResult {
  subject: string;
  email: string;
  wasteScore: number;
  justification: string;
  minutesWasted: number;
  meetingDuration: number;
}

const MAX_NOTES = 15000;

export default function Home() {
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<"professional" | "brutal">("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleConvert = async () => {
    if (!notes.trim()) {
      setError("Please paste your meeting notes first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, tone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data: ConvertResult = await res.json();
      setResult(data);
      fetch('https://api.counterapi.dev/v1/vibeboard-tools/meeting-to-email/up').catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-green-400";
    if (score <= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score <= 30) return "Actually needed";
    if (score <= 60) return "Questionable";
    return "Complete waste";
  };

  const getScoreBg = (score: number) => {
    if (score <= 30) return "bg-green-400/10 border-green-400/30";
    if (score <= 60) return "bg-yellow-400/10 border-yellow-400/30";
    return "bg-red-400/10 border-red-400/30";
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `Meeting Waste Score: ${result.wasteScore}/100\n${result.justification}\n${result.minutesWasted} of ${result.meetingDuration} minutes wasted.`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled or unsupported — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleTweet = () => {
    if (!result) return;
    const tweet = `This meeting scored ${result.wasteScore}/100 on the Waste-o-Meter.\n\n"${result.subject}"\n\n${result.minutesWasted} of ${result.meetingDuration} minutes wasted.\n\nRate your own meetings:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent("https://vibe-board-sand.vercel.app")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Meeting to Email
          </h1>
          <p className="text-lg text-zinc-400">
            That hour-long meeting? It was 3 sentences.
          </p>
          <div className="mt-4 flex justify-center">
            <Counter
              namespace="vibeboard-tools"
              counterKey="meeting-to-email"
              label="meetings deemed unnecessary"
              incrementOnMount={false}
            />
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-5">
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
              placeholder="Paste your meeting notes or transcript here..."
              className="w-full h-48 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            <div className={`pointer-events-none absolute bottom-2 right-3 text-[11px] font-mono ${
              notes.length > MAX_NOTES * 0.9 ? 'text-orange-400' : 'text-zinc-500'
            }`}>
              {notes.length.toLocaleString()} / {MAX_NOTES.toLocaleString()}
            </div>
          </div>

          {/* Tone Toggle */}
          <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-700/40 rounded-xl px-5 py-3">
            <span className="text-sm text-zinc-400">Tone</span>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm transition-colors ${
                  tone === "professional" ? "text-white font-medium" : "text-zinc-500"
                }`}
              >
                Professional
              </span>
              <button
                onClick={() =>
                  setTone(tone === "professional" ? "brutal" : "professional")
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  tone === "brutal" ? "bg-red-500" : "bg-zinc-600"
                }`}
                aria-label="Toggle tone"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    tone === "brutal" ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={`text-sm transition-colors ${
                  tone === "brutal" ? "text-red-400 font-medium" : "text-zinc-500"
                }`}
              >
                Brutally Honest
              </span>
            </div>
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Converting...
              </>
            ) : (
              "Convert to Email"
            )}
          </button>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-10 space-y-6">
            {/* Mock Email Card */}
            <div className="rounded-xl overflow-hidden border border-zinc-700/50 shadow-2xl">
              {/* Email Header */}
              <div className="bg-zinc-800/80 px-5 py-4 space-y-1.5 border-b border-zinc-700/40">
                <div className="flex gap-2 text-sm">
                  <span className="text-zinc-500 w-14 shrink-0">To:</span>
                  <span className="text-zinc-300">
                    Everyone who was in that meeting
                  </span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-zinc-500 w-14 shrink-0">From:</span>
                  <span className="text-zinc-300">
                    The email that should&apos;ve been sent
                  </span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-zinc-500 w-14 shrink-0">Subject:</span>
                  <span className="text-zinc-100 font-medium">
                    {result.subject}
                  </span>
                </div>
              </div>
              {/* Email Body */}
              <div className="bg-zinc-900/40 px-5 py-5">
                <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {result.email}
                </p>
              </div>
            </div>

            {/* Waste Score & Minutes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`rounded-xl border px-5 py-5 text-center ${getScoreBg(
                  result.wasteScore
                )}`}
              >
                <div className="text-sm text-zinc-400 mb-1">
                  Meeting Waste Score
                </div>
                <div
                  className={`text-5xl font-bold ${getScoreColor(
                    result.wasteScore
                  )}`}
                >
                  {result.wasteScore}
                </div>
                <div
                  className={`text-sm mt-1 font-medium ${getScoreColor(
                    result.wasteScore
                  )}`}
                >
                  {getScoreLabel(result.wasteScore)}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  {result.justification}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 px-5 py-5 text-center">
                <div className="text-sm text-zinc-400 mb-1">Minutes Wasted</div>
                <div className="text-5xl font-bold text-orange-400">
                  {result.minutesWasted}
                </div>
                <div className="text-sm mt-1 text-zinc-500">
                  out of {result.meetingDuration} minutes
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleTweet}
                className="flex-1 min-w-[140px] py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl transition-colors text-sm font-semibold"
              >
                Post to X
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 min-w-[140px] py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-white rounded-xl transition-colors text-sm font-medium"
              >
                {copied ? "Copied!" : "Copy Email"}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 min-w-[140px] py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-white rounded-xl transition-colors text-sm font-medium"
              >
                {shared ? "Copied!" : "Share Score"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import { useState } from "react";

export default function ExampleSentence({ sentence, translation }) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="border rounded-2xl p-4 bg-slate-50">
      <p className="text-slate-800 font-medium">{sentence ?? "Example sentence"}</p>

      {translation && (
        <div className="mt-3">
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => setShowTranslation((v) => !v)}
          >
            {showTranslation ? "Hide translation" : "Show translation"}
          </button>

          {showTranslation && (
            <p className="mt-2 text-slate-600 italic">{translation}</p>
          )}
        </div>
      )}
    </div>
  );
}

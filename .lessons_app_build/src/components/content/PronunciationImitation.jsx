import { useEffect, useMemo, useRef, useState } from "react";

import speedIcon from "../../assets/icons/lessons/speed.svg";
import nextIcon from "../../assets/icons/lessons/next.svg";
import listenIcon from "../../assets/icons/lessons/listen.svg";
import imitateIcon from "../../assets/icons/lessons/imitate.svg";
import recordIcon from "../../assets/icons/lessons/record.svg";
import stopRecordIcon from "../../assets/icons/lessons/stop-record.svg";
import pauseIcon from "../../assets/icons/lessons/pause.svg";
import PromptImage from "./PromptImage.jsx";

function renderInlineMarkdown(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const nodes = [];

  const renderWithBackticks = (content, keyPrefix, baseClassName = "text-slate-900") => {
    const parts = content.split(/(`[^`]+`)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const inner = part.slice(1, -1);
        return (
          <span key={`${keyPrefix}-tick-${index}`} className="font-semibold text-[#475dd7]">
            {inner}
          </span>
        );
      }
      return (
        <span key={`${keyPrefix}-txt-${index}`} className={baseClassName}>
          {part}
        </span>
      );
    });
  };

  const renderLine = (line, lineIndex) => {
    const parts = line
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .filter(Boolean);
    return (
      <span key={`md-line-${lineIndex}`}>
        {parts.map((part, index) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            const content = part.slice(1, -1);
            return (
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-[#475dd7]">
                {content}
              </span>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            const content = part.slice(2, -2);
            return (
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-slate-900">
                {renderWithBackticks(content, `md-b-${lineIndex}-${index}`)}
              </span>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            const content = part.slice(1, -1);
            return (
              <em key={`md-${lineIndex}-${index}`} className="text-slate-900">
                {renderWithBackticks(content, `md-i-${lineIndex}-${index}`)}
              </em>
            );
          }
          return (
            <span key={`md-${lineIndex}-${index}`} className="text-slate-900">
              {part}
            </span>
          );
        })}
      </span>
    );
  };

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`md-br-${index}`} />);
    }
    if (line.trim() === "---") {
      nodes.push(<hr key={`md-hr-${index}`} className="my-4 border-slate-200" />);
      return;
    }
    nodes.push(renderLine(line, index));
  });

  return nodes;
}


function drawWaveform(canvas, audioBuffer, color) {
  if (!canvas || !audioBuffer) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pixelRatio = window.devicePixelRatio || 1;
  const cssWidth = canvas.offsetWidth || 300;
  const cssHeight = canvas.offsetHeight || 80;
  canvas.width = cssWidth * pixelRatio;
  canvas.height = cssHeight * pixelRatio;
  ctx.scale(pixelRatio, pixelRatio);

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const data = audioBuffer.getChannelData(0);
  const barCount = Math.min(80, Math.floor(cssWidth / 6));
  const step = Math.floor(data.length / barCount);
  const centerY = cssHeight / 2;
  const barWidth = Math.max(2, Math.floor(cssWidth / barCount) - 2);

  ctx.fillStyle = color || "#475dd7";

  for (let i = 0; i < barCount; i += 1) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j += 1) {
      const value = Math.abs(data[start + j] || 0);
      if (value > max) max = value;
    }
    const barHeight = Math.max(4, max * cssHeight * 0.9);
    const x = i * (barWidth + 2);
    ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
  }
}

function useWaveform({ url, blob, color }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let audioContext;

    const load = async () => {
      try {
        setError("");
        setReady(false);
        if (!url && !blob) return;

        const buffer = blob ? await blob.arrayBuffer() : await fetch(url).then((res) => res.arrayBuffer());
        if (cancelled) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await audioContext.decodeAudioData(buffer);
        if (cancelled) return;
        drawWaveform(canvasRef.current, decoded, color);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError("Waveform unavailable");
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [url, blob, color]);

  return { canvasRef, ready, error };
}

function SpeedControl({ playbackRate, setPlaybackRate }) {
  const [open, setOpen] = useState(false);
  const clampRate = (value) => Math.min(1.5, Math.max(0.5, value));
  const formattedRate = `x${playbackRate.toFixed(2)}`;

  return (
    <>
      <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <img src={speedIcon} alt="" className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-600">{formattedRate}</span>
        <button
          type="button"
          onClick={() => setPlaybackRate((prev) => clampRate(prev - 0.05))}
          disabled={playbackRate <= 0.5}
          className="h-6 w-6 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
          title="Slower"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => setPlaybackRate((prev) => clampRate(prev + 0.05))}
          disabled={playbackRate >= 1.5}
          className="h-6 w-6 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
          title="Faster"
        >
          +
        </button>
      </div>

      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm cursor-pointer"
          title="Playback speed"
        >
          <img src={speedIcon} alt="" className="h-4 w-4" aria-hidden="true" />
          <span>{formattedRate}</span>
        </button>
        {open ? (
          <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(clampRate(Number(e.target.value)))}
              className="cursor-pointer"
              style={{ writingMode: "vertical-lr", direction: "rtl", height: "120px" }}
              aria-label="Playback speed"
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function PronunciationImitation({ exercise, onAnswer, showHint }) {
  const [modelPlaying, setModelPlaying] = useState(false);
  const [recordedPlaying, setRecordedPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);

  const modelAudioRef = useRef(null);
  const recordedAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);

  const {
    canvasRef: modelCanvasRef,
    ready: modelWaveReady,
    error: modelWaveError,
  } = useWaveform({
    url: exercise?.model_audio_url || "",
    color: "#475dd7",
  });

  const {
    canvasRef: recordedCanvasRef,
    ready: recordedWaveReady,
    error: recordedWaveError,
  } = useWaveform({
    blob: recordedBlob,
    color: "#7c8bd6",
  });

  useEffect(() => {
    if (modelAudioRef.current) {
      modelAudioRef.current.playbackRate = playbackRate;
    }
    if (recordedAudioRef.current) {
      recordedAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [recordedUrl]);

  const toggleModelAudio = () => {
    if (!modelAudioRef.current) return;
    if (modelPlaying) {
      modelAudioRef.current.pause();
    } else {
      modelAudioRef.current.currentTime = 0;
      modelAudioRef.current.playbackRate = playbackRate;
      modelAudioRef.current.play();
    }
    setModelPlaying(!modelPlaying);
  };

  const handleModelEnded = () => {
    setModelPlaying(false);
  };

  const toggleRecordedAudio = () => {
    if (!recordedAudioRef.current) return;
    if (recordedPlaying) {
      recordedAudioRef.current.pause();
    } else {
      recordedAudioRef.current.currentTime = 0;
      recordedAudioRef.current.playbackRate = playbackRate;
      recordedAudioRef.current.play();
    }
    setRecordedPlaying(!recordedPlaying);
  };

  const handleRecordedEnded = () => {
    setRecordedPlaying(false);
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      setRecordingError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl);
        }
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecording(false);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setRecordingError("Microphone access is required to record.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  };

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl("");
    setRecordedBlob(null);
    setRecordedPlaying(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-left space-y-2">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800">
          {renderInlineMarkdown(exercise?.question || "Pronunciation Imitation")}
        </h2>
        {exercise?.model_text ? (
          <p className="text-lg text-slate-700">
            {renderInlineMarkdown(exercise.model_text)}
          </p>
        ) : null}
        <p className="text-sm text-slate-500">
          Listen to the model, record yourself, and compare the waveforms until it feels right.
        </p>
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      ) : null}

      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={listenIcon} alt="" className="h-8 w-8" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-slate-900">Listen</h3>
            </div>
            <SpeedControl playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleModelAudio}
              className={[
                "rounded-full w-12 h-12 p-0 transition-all border cursor-pointer hover:shadow-sm disabled:cursor-default",
                modelPlaying
                  ? "bg-white border-[#475dd7] text-[#475dd7] hover:bg-slate-50"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
              ].join(" ")}
              title="Play model audio"
              disabled={!exercise?.model_audio_url}
            >
              <img
                src={modelPlaying ? pauseIcon : "/static/assets/icons/play.svg"}
                alt=""
                className="h-9 w-9 mx-auto"
                aria-hidden="true"
              />
            </button>
            {exercise?.model_audio_url ? (
              <audio
                ref={modelAudioRef}
                src={exercise.model_audio_url}
                onEnded={handleModelEnded}
                className="hidden"
              />
            ) : null}
            <div className="flex-1">
              <canvas
                ref={modelCanvasRef}
                className="h-14 w-full rounded-lg bg-slate-50"
              />
              {!modelWaveReady && modelWaveError ? (
                <p className="mt-1 text-xs text-slate-400">{modelWaveError}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={imitateIcon} alt="" className="h-8 w-8" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-slate-900">Imitate</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearRecording}
                className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                disabled={!recordedUrl}
              >
                Clear
              </button>
              <SpeedControl playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={[
                "relative rounded-full w-12 h-12 p-0 transition-all shadow-sm border border-red-300",
                "bg-white text-red-600 hover:bg-red-50",
                "cursor-pointer flex items-center justify-center",
              ].join(" ")}
              title={recording ? "Stop recording" : "Record"}
            >
              {recording ? (
                <span className="absolute -inset-1 rounded-full border-2 border-red-300 animate-pulse" />
              ) : null}
              <img
                src={recording ? stopRecordIcon : recordIcon}
                alt=""
                className="h-full w-full"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={toggleRecordedAudio}
              disabled={!recordedUrl}
              className={[
                "rounded-full w-10 h-10 p-0 transition-all border cursor-pointer hover:shadow-sm disabled:cursor-default",
                recordedPlaying
                  ? "bg-white border-[#475dd7] text-[#475dd7] hover:bg-slate-50"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
              ].join(" ")}
              title="Play your recording"
            >
              <img
                src={recordedPlaying ? pauseIcon : "/static/assets/icons/play.svg"}
                alt=""
                className="h-8 w-8 mx-auto"
                aria-hidden="true"
              />
            </button>
          </div>
          {recordingError ? (
            <p className="text-xs text-red-600">{recordingError}</p>
          ) : null}

          {recordedUrl ? (
            <audio
              ref={recordedAudioRef}
              src={recordedUrl}
              onEnded={handleRecordedEnded}
              className="hidden"
            />
          ) : null}

          <canvas
            ref={recordedCanvasRef}
            className="h-14 w-full rounded-lg bg-slate-50"
          />
          {!recordedWaveReady && recordedWaveError ? (
            <p className="mt-1 text-xs text-slate-400">{recordedWaveError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-700">Continue</span>
        <button
          type="button"
          title="Continue"
          aria-label="Continue"
          onClick={() => onAnswer(true)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition cursor-pointer hover:bg-black/5 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <img src={nextIcon} alt="" aria-hidden="true" className="h-10 w-10" />
        </button>
      </div>
    </div>
  );
}

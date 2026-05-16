"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEFAULT_GENERATION_DURATION = 10;
const MIN_GENERATION_DURATION = 1;
const MAX_GENERATION_DURATION = 30;
const TARGET_CLIP_DURATION = 5;
const DURATION_TOLERANCE = 0.35;
const MAX_FILE_SIZE_MB = 12;
const LOADING_MESSAGES = [
  "Analyzing your style reference...",
  "Blending your prompt with the uploaded mood...",
  "Rendering a fresh music idea from the model...",
];
const STATE_COPY = {
  idle: {
    badge: "Idle",
    title: "Configure the next generation",
    text: "Set the prompt, choose the output duration, and upload a clean style clip before you send the job to FastAPI.",
  },
  processing: {
    badge: "Processing",
    title: "The model is rendering your audio",
    text: "The backend is still computing the track and will return a raw audio file blob when the generation finishes.",
  },
  rendered: {
    badge: "Rendered",
    title: "Your generated track is ready",
    text: "The returned audio blob is attached to the player below so you can listen immediately or download it.",
  },
};

function isSupportedAudioFile(file) {
  const acceptedMimeTypes = new Set([
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
  ]);
  if (acceptedMimeTypes.has(file.type)) return true;
  return /\.(wav|mp3|ogg|flac)$/i.test(file.name);
}

function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read audio duration."));
        return;
      }
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Could not read this audio file."));
    };
    audio.src = objectUrl;
  });
}

export default function HomePage() {
  const fileInputRef = useRef(null);
  const [uiState, setUiState] = useState("idle");
  const [prompt, setPrompt] = useState("");
  const [generationDuration, setGenerationDuration] = useState(
    DEFAULT_GENERATION_DURATION,
  );
  const [styleFile, setStyleFile] = useState(null);
  const [stylePreviewUrl, setStylePreviewUrl] = useState("");
  const [clipDuration, setClipDuration] = useState(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("generated-track.wav");
  const [error, setError] = useState("");
  const [isCheckingFile, setIsCheckingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!styleFile) { setStylePreviewUrl(""); return undefined; }
    const objectUrl = URL.createObjectURL(styleFile);
    setStylePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [styleFile]);

  useEffect(() => {
    if (!isGenerating) { setLoadingIndex(0); return undefined; }
    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, [resultUrl]);

  const isProcessing = uiState === "processing";
  const stateDetails = STATE_COPY[uiState];

  const canSubmit = useMemo(() => {
    return (
      prompt.trim().length > 0 &&
      !!styleFile &&
      !isProcessing &&
      !isCheckingFile
    );
  }, [isCheckingFile, isProcessing, prompt, styleFile]);

  async function processSelectedFile(file) {
    setError("");
    setClipDuration(null);
    setStyleFile(null);
    if (uiState !== "processing") {
      setUiState("idle");
    }
    if (!file) return;
    if (!isSupportedAudioFile(file)) {
      setError("Upload a supported audio file: WAV, MP3, OGG, or FLAC.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError("Keep the reference clip under " + MAX_FILE_SIZE_MB + " MB.");
      return;
    }
    try {
      setIsCheckingFile(true);
      const duration = await getAudioDuration(file);
      if (Math.abs(duration - TARGET_CLIP_DURATION) > DURATION_TOLERANCE) {
        setError(
          "The reference clip should be about " +
            TARGET_CLIP_DURATION +
            " seconds. Detected " +
            duration.toFixed(2) +
            " seconds.",
        );
        return;
      }
      setStyleFile(file);
      setClipDuration(duration);
    } catch (validationError) {
      setError(validationError.message || "The audio file could not be validated.");
    } finally {
      setIsCheckingFile(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    await processSelectedFile(file);
    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!isProcessing) {
      setIsDragActive(true);
    }
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragActive(false);
  }

  async function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    if (isProcessing) return;
    const file = event.dataTransfer.files?.[0];
    await processSelectedFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePromptChange(event) {
    setPrompt(event.target.value);
    if (uiState === "rendered") setUiState("idle");
    if (error) setError("");
  }

  function handleDurationChange(event) {
    setGenerationDuration(Number(event.target.value));
    if (uiState === "rendered") setUiState("idle");
    if (error) setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Write a prompt before generating.");
      return;
    }
    if (!styleFile) {
      setError("Upload a valid 5-second reference clip first.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setUiState("processing");
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl("");
    }
    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("duration", String(generationDuration));
      formData.append("style_audio", styleFile);
      const response = await fetch(API_BASE_URL + "/generate/style", {
        method: "POST",
        headers: {
          Accept: "audio/wav,audio/*",
        },
        body: formData,
      });
      if (!response.ok) {
        let message = "Generation failed. Please try again.";
        const responseText = await response.text();
        try {
          const data = JSON.parse(responseText);
          if (data?.detail) message = data.detail;
        } catch {
          if (responseText) message = responseText;
        }
        throw new Error(message);
      }
      const audioBlob = await response.blob();
      if (!audioBlob.size) {
        throw new Error("The backend returned an empty audio file.");
      }
      const downloadUrl = URL.createObjectURL(audioBlob);
      const disposition = response.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      setResultUrl(downloadUrl);
      setResultName(match?.[1] || "generated-track.wav");
      setUiState("rendered");
    } catch (requestError) {
      setError(requestError.message || "Generation failed. Please try again.");
      setUiState("idle");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI text-to-music playground</p>
          <h1>Turn a short style clip and a text prompt into a new musical idea.</h1>
          <p className="hero-text">
            Upload a clean 5-second audio reference, describe the sound you want,
            and let the model build a fresh generation around that mood.
          </p>
          <div className="hero-pills">
            <span>5-second reference audio</span>
            <span>Prompt-guided generation</span>
            <span>Blob-based audio response</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-glow" />
          <div className="hero-visual">
            <div className="vinyl"><div className="vinyl-center" /></div>
            <div className="signal-bars" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>
          </div>
        </div>
      </section>

      <section className="workspace">
        <form className="glass-card form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="section-label">Create</p>
            <h2>Generation Studio</h2>
            <p>Send prompt, duration, and style audio as `FormData` to the existing <code>/generate/style</code> endpoint.</p>
          </div>
          <div className="state-strip" data-state={uiState}>
            <span className="state-badge">{stateDetails.badge}</span>
            <div>
              <strong>{stateDetails.title}</strong>
              <p>{stateDetails.text}</p>
            </div>
          </div>
          <label className="field-label" htmlFor="style-audio">Reference audio</label>
          <label
            className={`upload-zone ${isProcessing ? "is-disabled" : ""} ${isDragActive ? "is-drag-active" : ""}`}
            htmlFor="style-audio"
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="style-audio"
              type="file"
              accept=".wav,.mp3,.ogg,.flac,audio/*"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <span className="upload-title">{isCheckingFile ? "Validating clip..." : "Drop or click to add your 5-second file"}</span>
            <span className="upload-subtitle">WAV, MP3, OGG, or FLAC up to {MAX_FILE_SIZE_MB} MB</span>
          </label>
          <div className="meta-row">
            <span>{styleFile ? styleFile.name : "No file selected yet"}</span>
            <span>{clipDuration ? clipDuration.toFixed(2) + " sec detected" : "Target: 5 sec"}</span>
          </div>
          {stylePreviewUrl ? (
            <div className="audio-preview">
              <audio controls src={stylePreviewUrl}>Your browser does not support audio playback.</audio>
            </div>
          ) : null}
          <label className="field-label" htmlFor="prompt">Prompt</label>
          <textarea
            id="prompt"
            className="prompt-input"
            rows="6"
            placeholder="Example: Cinematic ambient piano with gentle percussion, dreamy textures, and a warm uplifting ending."
            value={prompt}
            onChange={handlePromptChange}
            disabled={isProcessing}
          />
          <div className="prompt-hint">Tip: describe mood, instruments, pace, texture, and atmosphere.</div>
          <label className="field-label" htmlFor="generation-duration">Generation duration</label>
          <div className="duration-control">
            <input
              id="generation-duration"
              type="range"
              min={MIN_GENERATION_DURATION}
              max={MAX_GENERATION_DURATION}
              value={generationDuration}
              onChange={handleDurationChange}
              disabled={isProcessing}
            />
            <div className="duration-meta">
              <span>{generationDuration} seconds</span>
              <span>Allowed by backend: {MIN_GENERATION_DURATION}-{MAX_GENERATION_DURATION} sec</span>
            </div>
          </div>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="generate-button" type="submit" disabled={!canSubmit}>
            {isProcessing ? "Generating..." : "Generate music"}
          </button>
        </form>

        <div className="glass-card info-card">
          <div className="section-heading">
            <p className="section-label">Preview</p>
            <h2>Session Output</h2>
            <p>The preview card mirrors the backend lifecycle: idle before submit, processing while FastAPI computes, rendered when the audio blob arrives.</p>
          </div>
          {uiState === "processing" ? (
            <div className="processing-panel">
              <div className="spinner" aria-hidden="true" />
              <div className="result-badge">Processing</div>
              <h3>{LOADING_MESSAGES[loadingIndex]}</h3>
              <p>
                Buttons and inputs stay locked while the server renders the track.
                The player appears as soon as the audio file is returned.
              </p>
            </div>
          ) : null}
          {uiState === "rendered" && resultUrl ? (
            <div className="result-panel">
              <div className="result-badge">Rendered</div>
              <h3>Your generated track is ready.</h3>
              <audio controls src={resultUrl}>Your browser does not support audio playback.</audio>
              <a className="download-link" href={resultUrl} download={resultName}>Download {resultName}</a>
            </div>
          ) : null}
          {uiState === "idle" ? (
            <div className="placeholder-panel">
              <div className="placeholder-icon">01</div>
              <h3>Waiting for your next generation</h3>
              <p>Upload the reference clip, tune the duration, write a prompt, and submit to receive the produced audio file here.</p>
            </div>
          ) : null}
        </div>
      </section>

      {isProcessing ? (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <div className="loading-vinyl"><div className="loading-vinyl-center" /></div>
            <p className="loading-label">Model is generating</p>
            <h2>{LOADING_MESSAGES[loadingIndex]}</h2>
            <p className="loading-text">Audio generation is not an instant JSON request. The player will appear after the backend streams back the finished blob.</p>
            <div className="loading-dots" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

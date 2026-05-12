"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const TARGET_CLIP_DURATION = 5;
const DURATION_TOLERANCE = 0.35;
const MAX_FILE_SIZE_MB = 12;
const LOADING_MESSAGES = [
  "Analyzing your style reference...",
  "Blending your prompt with the uploaded mood...",
  "Rendering a fresh music idea from the model...",
];

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

  if (acceptedMimeTypes.has(file.type)) {
    return true;
  }

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
  const [prompt, setPrompt] = useState("");
  const [styleFile, setStyleFile] = useState(null);
  const [stylePreviewUrl, setStylePreviewUrl] = useState("");
  const [clipDuration, setClipDuration] = useState(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("generated-track.wav");
  const [error, setError] = useState("");
  const [isCheckingFile, setIsCheckingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!styleFile) {
      setStylePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(styleFile);
    setStylePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [styleFile]);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const canSubmit = useMemo(() => {
    return (
      prompt.trim().length > 0 &&
      !!styleFile &&
      !isGenerating &&
      !isCheckingFile &&
      !error
    );
  }, [error, isCheckingFile, isGenerating, prompt, styleFile]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setClipDuration(null);
    setStyleFile(null);

    if (!file) {
      return;
    }

    if (!isSupportedAudioFile(file)) {
      setError("Upload a supported audio file: WAV, MP3, OGG, or FLAC.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Keep the reference clip under ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    try {
      setIsCheckingFile(true);
      const duration = await getAudioDuration(file);

      if (Math.abs(duration - TARGET_CLIP_DURATION) > DURATION_TOLERANCE) {
        setError(
          `The reference clip should be about ${TARGET_CLIP_DURATION} seconds. Detected ${duration.toFixed(
            2
          )} seconds.`
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

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl("");
    }

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("duration", "10");
      formData.append("style_audio", styleFile);

      const response = await fetch(`${API_BASE_URL}/generate/style`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Generation failed. Please try again.";
        const responseText = await response.text();

        try {
          const data = JSON.parse(responseText);
          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          if (responseText) {
            message = responseText;
          }
        }

        throw new Error(message);
      }

      const audioBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(audioBlob);
      const disposition = response.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);

      setResultUrl(downloadUrl);
      setResultName(match?.[1] || "generated-track.wav");
    } catch (requestError) {
      setError(requestError.message || "Generation failed. Please try again.");
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
            <span>FastAPI-ready frontend</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-glow" />
          <div className="hero-visual">
            <div className="vinyl">
              <div className="vinyl-center" />
            </div>
            <div className="signal-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="hero-stats">
            <div>
              <strong>Input</strong>
              <span>Prompt + style audio</span>
            </div>
            <div>
              <strong>Flow</strong>
              <span>Upload, validate, generate</span>
            </div>
            <div>
              <strong>Output</strong>
              <span>Preview and download your track</span>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace">
        <form className="glass-card form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="section-label">Create</p>
            <h2>Generation Studio</h2>
            <p>
              This interface is ready to call the existing
              <code> /generate/style </code>
              backend endpoint.
            </p>
          </div>

          <label className="field-label" htmlFor="style-audio">
            Reference audio
          </label>
          <label className="upload-zone" htmlFor="style-audio">
            <input
              id="style-audio"
              type="file"
              accept=".wav,.mp3,.ogg,.flac,audio/*"
              onChange={handleFileChange}
            />
            <span className="upload-title">
              {isCheckingFile ? "Validating clip..." : "Drop your 5-second file here"}
            </span>
            <span className="upload-subtitle">
              WAV, MP3, OGG, or FLAC up to {MAX_FILE_SIZE_MB} MB
            </span>
          </label>

          <div className="meta-row">
            <span>{styleFile ? styleFile.name : "No file selected yet"}</span>
            <span>
              {clipDuration ? `${clipDuration.toFixed(2)} sec detected` : "Target: 5 sec"}
            </span>
          </div>

          {stylePreviewUrl ? (
            <div className="audio-preview">
              <audio controls src={stylePreviewUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : null}

          <label className="field-label" htmlFor="prompt">
            Prompt
          </label>
          <textarea
            id="prompt"
            className="prompt-input"
            rows="6"
            placeholder="Example: Cinematic ambient piano with gentle percussion, dreamy textures, and a warm uplifting ending."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <div className="prompt-hint">
            Tip: describe mood, instruments, pace, texture, and atmosphere.
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="generate-button" type="submit" disabled={!canSubmit}>
            {isGenerating ? "Generating..." : "Generate music"}
          </button>
        </form>

        <div className="glass-card info-card">
          <div className="section-heading">
            <p className="section-label">Preview</p>
            <h2>Session Output</h2>
            <p>
              Generated music appears here as soon as the backend returns the WAV
              file.
            </p>
          </div>

          {resultUrl ? (
            <div className="result-panel">
              <div className="result-badge">Ready</div>
              <h3>Your generated track is ready.</h3>
              <audio controls src={resultUrl}>
                Your browser does not support audio playback.
              </audio>
              <a className="download-link" href={resultUrl} download={resultName}>
                Download {resultName}
              </a>
            </div>
          ) : (
            <div className="placeholder-panel">
              <div className="placeholder-icon">01</div>
              <h3>Waiting for your first generation</h3>
              <p>
                Upload the reference clip, write a prompt, and submit to see the
                produced audio here.
              </p>
            </div>
          )}

          <div className="process-list">
            <div>
              <strong>1</strong>
              <span>Validate the uploaded style clip on the client.</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Send prompt, duration, and audio file to FastAPI.</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Play and download the generated output.</span>
            </div>
          </div>
        </div>
      </section>

      {isGenerating ? (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <div className="loading-vinyl">
              <div className="loading-vinyl-center" />
            </div>
            <p className="loading-label">Model is generating</p>
            <h2>{LOADING_MESSAGES[loadingIndex]}</h2>
            <p className="loading-text">
              This can take a little while depending on the model and hardware.
            </p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

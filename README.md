# Text-to-Music Generation (Prompt + Style Reference)

Deep learning project that generates a music clip from a text prompt, optionally guided by a short reference clip (“style transfer”).

## Project Structure

- api/ → FastAPI REST API (serves generated .wav files)
- ml/ → generation engine (MusicGen / AudioCraft wrapper)
- audio/ → optional audio preprocessing (librosa)
- frontend/ → Next.js UI (uploads a reference clip + prompt)

## Run Locally (Dev)

Prereqs:

- Python 3.10+
- Node.js 20+
- ffmpeg (recommended, needed to reliably read mp3/ogg reference clips during preprocessing)

### Backend (FastAPI)

From the repository root:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r api/requirements.txt -r ml/requirements.txt -r audio/requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Generated files are written to api/outputs/.

### Frontend (Next.js)

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

The UI runs on http://localhost:3000 and calls the API at NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:8000).

## Run With Docker

```bash
docker compose up
```

The provided docker-compose.yml runs:

- Backend on http://localhost:8000 (GPU-enabled via NVIDIA Docker)
- Frontend on http://localhost:3000

## API

- GET /health → API status
- POST /generate → FormData: prompt (string), duration (int, 1–30) → returns audio/wav
- POST /generate/style → FormData: prompt, duration, style_audio (wav/mp3/ogg/flac) → returns audio/wav

### Examples (curl)

Generate without style:

```bash
curl -X POST "http://localhost:8000/generate" ^
  -F "prompt=lofi hip hop with rainy ambience" ^
  -F "duration=10" --output gen.wav
```

Generate with a reference clip:

```bash
curl -X POST "http://localhost:8000/generate/style" ^
  -F "prompt=cinematic strings with a dark mood" ^
  -F "duration=10" ^
  -F "style_audio=@reference.wav" --output styled.wav
```

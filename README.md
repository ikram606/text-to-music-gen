# Text-to-Music Generation with Style Control

Projet Deep Learning — Generation musicale a partir de texte avec transfert de style.

## Architecture

- backend/   → FastAPI — API REST (Ikram)
- ml/        → MusicGen — Generation audio (ML Engineer)
- audio/     → Traitement audio librosa (Audio Engineer)
- frontend/  → Next.js — Interface utilisateur (Full-Stack)

## Lancer le backend

cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

## Lancer le frontend

cd frontend
npm install
npm run dev

Le frontend tourne sur http://localhost:3000 et appelle le backend sur http://localhost:8000 par defaut.

## Endpoints

POST /generate        → texte → audio .wav
POST /generate/style  → texte + audio reference → audio avec style
GET  /health          → statut de l'API

# api/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sys, os, uuid, shutil

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# Crucial: Import the singleton engine instance directly at boot
from ml import audio_engine

app = FastAPI(title='Text-to-Music API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
TEMP_DIR = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get('/health')
def health_check():
    if not audio_engine:
        return {'status': 'error', 'message': 'ML engine is offline'}
    return {'status': 'ok', 'message': 'Text-to-Music API is warm and running'}

@app.post('/generate')
async def generate_music(
    prompt: str = Form(...),
    duration: int = Form(default=10),
):
    if not audio_engine:
        raise HTTPException(status_code=503, detail='Service ML non disponible.')
    if not prompt.strip():
        raise HTTPException(status_code=400, detail='Prompt vide.')
    if duration < 1 or duration > 30:
        raise HTTPException(status_code=400, detail='Duree entre 1 et 30 secondes.')
    
    try:
        output_filename = f'gen_{uuid.uuid4().hex[:8]}.wav'
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Execute using our thread-safe singleton
        audio_engine.generate(prompt=prompt, duration=duration, output_path=output_path)
        
        return FileResponse(path=output_path, media_type='audio/wav', filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/generate/style')
async def generate_with_style(
    prompt: str = Form(...),
    duration: int = Form(default=10),
    style_audio: UploadFile = File(...),
):
    if not audio_engine:
        raise HTTPException(status_code=503, detail='Service ML non disponible.')
    if not prompt.strip():
        raise HTTPException(status_code=400, detail='Prompt vide.')
        
    ext = os.path.splitext(style_audio.filename)[-1].lower()
    if ext not in {'.wav', '.mp3', '.ogg', '.flac'}:
        raise HTTPException(status_code=400, detail='Format audio non supporte.')
        
    temp_audio_path = os.path.join(TEMP_DIR, f'ref_{uuid.uuid4().hex[:8]}{ext}')
    
    try:
        with open(temp_audio_path, 'wb') as f:
            shutil.copyfileobj(style_audio.file, f)
            
        try:
            from audio.process_audio import process_audio
            processed_path = process_audio(temp_audio_path)
        except ImportError:
            processed_path = temp_audio_path

        output_filename = f'styled_{uuid.uuid4().hex[:8]}.wav'
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Execute using our thread-safe singleton style method
        audio_engine.generate_with_style(
            prompt=prompt, 
            style_audio_path=processed_path, 
            duration=duration, 
            output_path=output_path
        )
        
        return FileResponse(path=output_path, media_type='audio/wav', filename=output_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
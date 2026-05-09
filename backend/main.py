from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sys, os, uuid, shutil, traceback

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

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
    return {'status': 'ok', 'message': 'Text-to-Music API is running'}

@app.post('/generate')
async def generate_music(
    prompt: str = Form(...),
    duration: int = Form(default=10),
):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail='Prompt vide.')
    if duration < 1 or duration > 30:
        raise HTTPException(status_code=400, detail='Duree entre 1 et 30 secondes.')
    try:
        from ml.generate_music import generate_music as ml_generate
        output_filename = f'gen_{uuid.uuid4().hex[:8]}.wav'
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        ml_generate(prompt=prompt, duration=duration, output_path=output_path)
        return FileResponse(path=output_path, media_type='audio/wav', filename=output_filename)
    except ImportError:
        raise HTTPException(status_code=503, detail='Module ML non disponible.')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/generate/style')
async def generate_with_style(
    prompt: str = Form(...),
    duration: int = Form(default=10),
    style_audio: UploadFile = File(...),
):
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
        from ml.generate_music import generate_music_with_style
        output_filename = f'styled_{uuid.uuid4().hex[:8]}.wav'
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        generate_music_with_style(prompt=prompt, style_audio_path=processed_path, duration=duration, output_path=output_path)
        return FileResponse(path=output_path, media_type='audio/wav', filename=output_filename)
    except ImportError:
        raise HTTPException(status_code=503, detail='Module ML non disponible.')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

# ml/__init__.py
import os
from .engine import ProductionAudioEngine
# Detect if this is the main worker process vs Uvicorn monitor process
is_uvicorn_reload_master = os.environ.get("UVICORN_MULTIPROCESS_WORKER_NUMBER") is None and os.environ.get("RUN_MAIN") != "true"
audio_engine = None
# This instantiates the engine exactly once as a singleton resource
try:
    audio_engine = ProductionAudioEngine('facebook/musicgen-melody')
except Exception as e:
    print(f"ML Engine failed to start: {e}")
    audio_engine = None
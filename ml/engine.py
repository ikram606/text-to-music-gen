# ml/engine.py
import torch
import torchaudio
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write
import gc
import os
import threading

class ProductionAudioEngine:
    def __init__(self, model_id: str = 'facebook/musicgen-melody'):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.lock = threading.Lock() # The gatekeeper for your 6GB VRAM
        
        print(f"Loading {model_id} onto GPU memory space...")
        self.model = MusicGen.get_pretrained(model_id)
        print("Model warm and ready for production inference.")

    def generate(self, prompt: str, duration: int, output_path: str) -> str:
        with self.lock: # Force sequential execution
            self.model.set_generation_params(duration=duration)
            with torch.no_grad():
                with torch.cuda.amp.autocast():
                    wav = self.model.generate([prompt])
            
            base_path = os.path.splitext(output_path)[0]
            audio_write(base_path, wav[0].cpu().float(), self.model.sample_rate, strategy="loudness", format="wav")
            
            # Clear memory space immediately
            del wav
            torch.cuda.empty_cache()
            gc.collect()
            return f"{base_path}.wav"

    def generate_with_style(self, prompt: str, style_audio_path: str, duration: int, output_path: str) -> str:
        with self.lock: # Force sequential execution
            self.model.set_generation_params(duration=duration, use_sampling=True, top_k=250, cfg_coef=7.5)
            
            style_wav, sr = torchaudio.load(style_audio_path)
            if style_wav.dim() == 2:
                style_wav = style_wav.unsqueeze(0)
                
            with torch.no_grad():
                with torch.cuda.amp.autocast():
                    wav = self.model.generate_with_chroma(
                        [prompt],
                        style_wav.to(self.device),
                        sr,
                    )
            
            base_path = os.path.splitext(output_path)[0]
            audio_write(base_path, wav[0].cpu().float(), self.model.sample_rate, strategy="loudness", format="wav")
            
            # Clear memory space immediately
            del wav, style_wav
            torch.cuda.empty_cache()
            gc.collect()
            return f"{base_path}.wav"

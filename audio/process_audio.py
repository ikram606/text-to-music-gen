import librosa
import soundfile as sf
import numpy as np
import os

TARGET_SR = 32000

def process_audio(file_path: str) -> str:
    """
    Prétraite un fichier audio : resampling, trimming silence, normalisation.
    Retourne le chemin vers le fichier audio nettoyé.
    """
    try:
        # 1. LOAD AUDIO
        audio, sr = librosa.load(file_path, sr=None, mono=True)

        # 2. RESAMPLE
        audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SR)
        sr = TARGET_SR

        # 3. TRIM SILENCE
        audio, _ = librosa.effects.trim(audio, top_db=20)

        # 4. NORMALIZE
        audio = librosa.util.normalize(audio)

        # 5. VALIDATION
        duration = librosa.get_duration(y=audio, sr=sr)
        if duration < 2:
            raise ValueError("Audio trop court apres traitement.")
        if np.isnan(audio).any():
            raise ValueError("Audio invalide (NaN detecte).")

        # 6. SAVE
        out_path = os.path.splitext(file_path)[0] + "_processed.wav"
        sf.write(out_path, audio, sr)

        return out_path

    except Exception as e:
        print(f"Erreur process_audio : {e}")
        return file_path

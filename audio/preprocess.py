import librosa
import soundfile as sf
import numpy as np
import os

# =========================
# CONFIG
# =========================

INPUT_DIR = "raw_audio"
OUTPUT_DIR = "processed_audio"

TARGET_SR = 32000

os.makedirs(OUTPUT_DIR, exist_ok=True)

# =========================
# PROCESS DATASET
# =========================

for genre in os.listdir(INPUT_DIR):

    genre_input_path = os.path.join(INPUT_DIR, genre)

    # ignorer fichiers non dossiers
    if not os.path.isdir(genre_input_path):
        continue

    print(f"\n===== Genre : {genre} =====")

    # créer dossier output genre
    genre_output_path = os.path.join(
        OUTPUT_DIR,
        genre
    )

    os.makedirs(genre_output_path, exist_ok=True)

    # parcourir fichiers audio
    for file in os.listdir(genre_input_path):

        input_path = os.path.join(
            genre_input_path,
            file
        )

        try:
            print(f"Traitement : {file}")

            # =========================
            # 1. LOAD AUDIO
            # =========================
            audio, sr = librosa.load(
                input_path,
                sr=None,
                mono=True
            )

            # =========================
            # 2. RESAMPLE
            # =========================
            audio = librosa.resample(
                audio,
                orig_sr=sr,
                target_sr=TARGET_SR
            )

            sr = TARGET_SR

            # =========================
            # 3. TRIM SILENCE
            # =========================
            audio, _ = librosa.effects.trim(
                audio,
                top_db=20
            )

            # =========================
            # 4. NORMALIZE
            # =========================
            audio = librosa.util.normalize(audio)

            # =========================
            # 5. VALIDATION
            # =========================
            duration = librosa.get_duration(
                y=audio,
                sr=sr
            )

            if duration < 2:
                print("Audio trop court")
                continue

            if np.isnan(audio).any():
                print("Audio invalide")
                continue

            # =========================
            # 6. SAVE AUDIO
            # =========================
            clean_name = f"clean_{os.path.splitext(file)[0]}.wav"

            output_path = os.path.join(
                genre_output_path,
                clean_name
            )

            sf.write(output_path, audio, sr)

            print(f"Sauvegardé : {clean_name}")

        except Exception as e:
            print(f"Erreur avec {file} : {e}")

print("\n✅ Preprocessing terminé !")
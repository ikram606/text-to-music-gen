def generate_music(prompt: str, duration: int = 10, output_path: str = 'output.wav'):
    # TODO ML Engineer : implémenter avec MusicGen
    # from audiocraft.models import MusicGen
    # model = MusicGen.get_pretrained('facebook/musicgen-small')
    # model.set_generation_params(duration=duration)
    # wav = model.generate([prompt])
    # torchaudio.save(output_path, wav[0].cpu(), 32000)
    raise NotImplementedError('generate_music() pas encore implementee.')

def generate_music_with_style(prompt: str, style_audio_path: str, duration: int = 10, output_path: str = 'output.wav'):
    # TODO ML Engineer : implémenter avec MusicGen melody
    # from audiocraft.models import MusicGen
    # import torchaudio
    # model = MusicGen.get_pretrained('facebook/musicgen-melody')
    # model.set_generation_params(duration=duration)
    # melody, sr = torchaudio.load(style_audio_path)
    # wav = model.generate_with_chroma([prompt], melody[None].expand(1,-1,-1), sr)
    # torchaudio.save(output_path, wav[0].cpu(), 32000)
    raise NotImplementedError('generate_music_with_style() pas encore implementee.')

import sys
import whisper

model = whisper.load_model("base")  # small, medium, large 도 가능
audio_path = sys.argv[1]
result = model.transcribe(audio_path)
print(result["text"])

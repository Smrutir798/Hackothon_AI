import requests
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

VISION_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "google/gemma-3-27b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "qwen/qwen-2.5-vl-72b-instruct:free",
    "qwen/qwen-2.5-vl-7b-instruct:free",
]

headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://localhost:8000",
    "X-Title": "LocalDev"
}

def test_model(model):
    print(f"Testing {model}...", end=" ", flush=True)
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "Say hello"}
        ]
    }
    try:
        response = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=30)
        if response.status_code == 200:
            print("OK")
            return True
        else:
            print(f"FAILED ({response.status_code})")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

print("Starting model availability check...\n")
working_models = []
for model in VISION_MODELS:
    if test_model(model):
        working_models.append(model)

print("\nSummary:")
print(f"Working models: {len(working_models)}/{len(VISION_MODELS)}")
for m in working_models:
    print(f" - {m}")

import ollama
import time

print("Attempting to run llama3.2...")
start = time.time()
try:
    response = ollama.chat(model='qwen2:0.5b', messages=[
        {'role': 'user', 'content': 'Say hello properly'}
    ])
    print("Success!")
    print(response['message']['content'])
except Exception as e:
    print(f"Failed: {e}")
print(f"Time taken: {time.time() - start:.2f}s")

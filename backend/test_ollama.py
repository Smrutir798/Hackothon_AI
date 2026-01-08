import ollama
import json

def analyze_perishability(ingredients_list):
    if not ingredients_list:
        return []
    
    prompt = f"""
    You are an expert food safety assistant. Analyze the following ingredients and estimate their perishability.
    Ingredients: {', '.join(ingredients_list)}
    
    Return ONLY a valid JSON array where each object has:
    - "name": (string) ingredient name
    - "days_to_expiry": (int) estimated days until expiry (use 999 for non-perishables like salt/spices)
    - "priority": (string) "High", "Medium", or "Low" based on urgency to use.
    
    Do not add any markdown formatting or extra text. Just the JSON.
    """
    
    try:
        print("Sending request to Ollama...")
        # mocking the call if ollama lib is not actually installed in this agent env, 
        # but the user asked to 'use ollama', so I assume they have it or I need to install it.
        # I'll rely on the user running this.
        response = ollama.chat(model='llama3', messages=[
            {'role': 'user', 'content': prompt},
        ])
        
        content = response['message']['content']
        print(f"Raw response: {content}")
        
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            content = content.replace("```", "")
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    ingredients = ["milk", "canned beans", "fresh spinach", "rice"]
    print(f"Testing with: {ingredients}")
    result = analyze_perishability(ingredients)
    print("\nParsed Result:")
    print(json.dumps(result, indent=2))

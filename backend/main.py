from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
import pickle
import pandas as pd
from typing import List, Optional
import os
import nltk
from nltk.corpus import stopwords
import string
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from youtube_search import YoutubeSearch
import concurrent.futures
from ultralytics import YOLO
from PIL import Image
import io
import ollama
import json

# Initialize FastAPI
app = FastAPI()

# Input schema
class RecipeRequest(BaseModel):
    ingredients: str
    prep_time: int
    cook_time: int

class Recipe(BaseModel):
    name: str
    translated_name: str
    ingredients: str
    prep_time: int
    cook_time: int
    url: str
    youtube_link: str

# Global variables for the model
model_data = None
tfidf_vectorizer = None
tfidf_matrix = None
tfidf_matrix = None
df_english = None
yolo_model = None

MODEL_PATH = r"recipe_recommender_model.pkl"

# Setup NLTK
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

def load_model():
    global model_data, tfidf_vectorizer, tfidf_matrix, df_english
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
            
            # Unpack the model data
            # Assumes model_data is a dictionary as specified in user request
            tfidf_vectorizer = model_data['tfidf_vectorizer']
            tfidf_matrix = model_data['tfidf_matrix']
            df_english = model_data['dataframe']
            
            print("Model loaded successfully.")
        else:
            print(f"Model file not found at {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")

# Load model on startup
load_model()

# Initialize YOLO model
try:
    yolo_model = YOLO('yolov8n.pt') 
    print("YOLO model loaded successfully.")
except Exception as e:
    print(f"Error loading YOLO model: {e}")

# Helper Functions from User Request
def preprocess_text(text):
    text = text.lower()
    text = ''.join([char for char in text if char not in string.punctuation])
    tokens = nltk.word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    return ' '.join(tokens)

def calculate_similarity(user_ingredients, user_prep_time, user_cook_time):
    # Check if inputs are available
    if tfidf_vectorizer is None or tfidf_matrix is None or df_english is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    user_ingredients_text = preprocess_text(', '.join(user_ingredients))
    user_tfidf = tfidf_vectorizer.transform([user_ingredients_text])
    cosine_similarities = cosine_similarity(user_tfidf, tfidf_matrix)[0]

    # Calculate time similarities
    max_prep = df_english['PrepTimeInMins'].max()
    max_cook = df_english['CookTimeInMins'].max()
    
    # Avoid division by zero
    if max_prep == 0: max_prep = 1
    if max_cook == 0: max_cook = 1

    prep_time_similarity = 1 - abs(df_english['PrepTimeInMins'] - user_prep_time) / max_prep
    cook_time_similarity = 1 - abs(df_english['CookTimeInMins'] - user_cook_time) / max_cook

    # Ensure lengths match (just in case)
    min_length = min(len(cosine_similarities), len(prep_time_similarity), len(cook_time_similarity))
    cosine_similarities = cosine_similarities[:min_length]
    prep_time_similarity = prep_time_similarity[:min_length]
    cook_time_similarity = cook_time_similarity[:min_length]

    combined_similarity = (cosine_similarities + prep_time_similarity + cook_time_similarity) / 3
    return combined_similarity

def get_recommendations_logic(user_ingredients_list, user_prep_time, user_cook_time, top_n=9):
    combined_similarity = calculate_similarity(user_ingredients_list, user_prep_time, user_cook_time)
    sorted_indices = combined_similarity.argsort()[::-1]
    
    # Get top N indices
    top_indices = sorted_indices[:top_n]
    
    # Fetch from dataframe
    recommendations = df_english.iloc[top_indices].copy()
    return recommendations

def get_youtube_link(query):
    try:
        results = YoutubeSearch(query + " recipe", max_results=1).to_dict()
        if results:
            return f"https://www.youtube.com/watch?v={results[0]['id']}"
    except Exception as e:
        print(f"Error searching YouTube for {query}: {e}")
    return ""

def analyze_perishability(ingredients_list, extra_text=""):
    if not ingredients_list and not extra_text:
        return []
    
    prompt = f"""
    You are an expert food safety assistant. Analyze the following ingredients and estimate their perishability.
    
    Detected Ingredients List: {', '.join(ingredients_list)}
    User Description: {extra_text}
    
    Task:
    1. Extract any additional ingredients from the 'User Description'.
    2. Combine them with the 'Detected Ingredients List'.
    3. Remove duplicates.
    4. For each ingredient, estimate:
       - "days_to_expiry": (int) estimated days until expiry (use 999 for non-perishables like salt/spices)
       - "priority": (string) "High", "Medium", or "Low" based on urgency to use.
    
    Return ONLY a valid JSON array where each object has:
    - "name": (string) ingredient name
    - "days_to_expiry": (int)
    - "priority": (string)
    
    Do not add any markdown formatting or extra text. Just the JSON.
    """
    
    try:
        response = ollama.chat(model='llama3', messages=[
            {'role': 'user', 'content': prompt},
        ])
        
        content = response['message']['content']
        # Clean up potential markdown code blocks if the model adds them despite instructions
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            content = content.replace("```", "")
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Error analyzing perishability with Ollama: {e}")
        # Fallback if Ollama fails
        fallback_list = ingredients_list + (extra_text.split(',') if extra_text else [])
        return [{"name": ing.strip(), "days_to_expiry": 999, "priority": "Unknown"} for ing in fallback_list if ing.strip()]


@app.post("/detect-ingredients")
async def detect_ingredients(file: UploadFile = File(None), text_input: str = Form(None)):
    if yolo_model is None:
        raise HTTPException(status_code=503, detail="YOLO model not loaded")
    
    if not file and not text_input:
        raise HTTPException(status_code=400, detail="Either an image file or text input is required.")

    try:
        detected_ingredients = set()

        # 1. Process Image if provided
        if file:
            # Read image
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Run inference
            results = yolo_model(image)
            
            # Extract detected classes
            for result in results:
                for box in result.boxes:
                    class_id = int(box.cls[0])
                    class_name = yolo_model.names[class_id]
                    detected_ingredients.add(class_name)
        
        detections_list = list(detected_ingredients)
        
        # 2. Analyze perishability (combining YOLO detections and text input)
        prioritized_ingredients = analyze_perishability(detections_list, extra_text=text_input if text_input else "")
        
        # Sort by days_to_expiry (ascending)
        prioritized_ingredients.sort(key=lambda x: x.get('days_to_expiry', 999))
        
        return {"detected_ingredients": prioritized_ingredients}
        
    except Exception as e:
        print(f"Error during detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend", response_model=List[Recipe])
def recommend_recipes_endpoint(request: RecipeRequest):
    if df_english is None:
        raise HTTPException(status_code=503, detail="Model failed to load. Please check server logs.")

    try:
        # Convert comma separated string to list
        ingredients_list = [i.strip() for i in request.ingredients.split(',')]
        
        preds = get_recommendations_logic(ingredients_list, request.prep_time, request.cook_time)
        
        # Helper to process a single row
        def process_recipe_row(row):
            # Handle potential missing or NaN ingredients
            ingreds = str(row['Ingredients']) if 'Ingredients' in row and pd.notna(row['Ingredients']) else "Not listed"
            recipe_name = str(row['RecipeName'])
            youtube_url = get_youtube_link(recipe_name)
            
            return Recipe(
                name=recipe_name,
                translated_name=str(row['TranslatedRecipeName']),
                ingredients=ingreds,
                prep_time=int(row['PrepTimeInMins']),
                cook_time=int(row['CookTimeInMins']),
                url=str(row['URL']),
                youtube_link=youtube_url
            )

        # Execute searches in parallel (preserving order)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
             results = list(executor.map(process_recipe_row, [row for _, row in preds.iterrows()]))
            
        return results

    except Exception as e:
        print(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Enable CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

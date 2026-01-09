from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, status
from pydantic import BaseModel
import pickle
import pandas as pd
from typing import List, Optional, Dict, Any
import os
# Force CPU usage for PyTorch/YOLO to reserve VRAM for Ollama
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
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
import json
import ollama

import io
import base64
# from user_manager import UserManager # Deprecated in favor of DB
from database import get_db, User, engine
from auth import get_current_user, create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime

# Initialize FastAPI
app = FastAPI()

# Input schema
class RecipeRequest(BaseModel):
    ingredients: str
    prep_time: int
    cook_time: int

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    experience_level: Optional[str] = None
    dietary_preferences: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    health_goals: Optional[List[str]] = None

class InteractionRequest(BaseModel):
    action: str
    recipe_name: str
    details: Optional[Dict[str, Any]] = None

class Recipe(BaseModel):
    name: str
    translated_name: str
    ingredients: str
    prep_time: int
    cook_time: int
    url: str
    youtube_link: str
    missing_ingredients: List[Dict[str, str]] = []
    match_score: Optional[int] = None # 0-100 percentage

class ForgotPasswordRequest(BaseModel):
    email: str

# DB Migration: Ensure is_admin column exists
def run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            print("Migration: Added is_admin column to users table.")
        except Exception as e:
            # Column likely exists
            pass

run_migrations()

# Global variables for the model
model_data = None
tfidf_vectorizer = None
tfidf_matrix = None
tfidf_matrix = None
df_english = None
yolo_model = None
# user_manager = UserManager() 

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

# Initialize Ollama (Used for Text Analysis / Perishability)
# ensuring ollama is imported
try:
    import ollama
    print("Ollama module loaded. Using 'llama3' for text analysis.")
except ImportError:
    print("Error: Ollama module not found. Please install with `pip install ollama`.")

# Load YOLO model
try:
    # Explicitly force CPU logic if needed, usually ultralytics handles 'device' arg at inference
    # but we can try to ensure it doesn't touch GPU here.
    yolo_model = YOLO('yolo11n.pt') 
    # Attempt to move to CPU immediately to prevent holding VRAM
    # (Note: Ultralytics models usually lazy load to device, but let's be safe)
    # yolo_model.to('cpu') # Not standard API for the wrapper, usually done at predict
    print("YOLO model loaded.")
except Exception as e:
    print(f"Error loading YOLO model: {e}")

# Helper Functions from User Request
# Extended cleaning for cooking ingredients
COOKING_STOPWORDS = {
    # Measurements
    "teaspoon", "tsp", "tablespoon", "tbsp", "cup", "gram", "gms", "g", "kg", "ml", "liter", "litre", "l", "lb", "oz", "pinch", "bunch", "sprig", "cloves",
    # Descriptors/Prep
    "chopped", "sliced", "diced", "minced", "grated", "crushed", "beaten", "whisked", "sifted", "melted", "slit", "halved", "quartered", "cubed",
    "peeled", "cored", "seeded", "washed", "cleaned", "dried", "roasted", "toasted", "fried", "boiled", "warm", "cold", "hot", "lukewarm",
    "taste", "size", "small", "medium", "large", "fresh", "whole", "powder", "seeds", "oil", "leaves", "wedges", "fillet", "fillets", "boneless", "skinless",
    # Common Pantry (optional, can be removed if specific matching needed)
    "water", "salt", "ice" 
}

def clean_ingredient_text(text):
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove numbers and fractions (e.g. 1/2, 0.5, 3)
    # Using simple replacements for common patterns
    text = ''.join([i for i in text if not i.isdigit()])
    text = text.replace("/", " ").replace(".", " ")
    
    # 3. Tokenize key parts
    tokens = nltk.word_tokenize(text)
    
    # 4. Filter out stopwords and punctuation
    clean_tokens = []
    for word in tokens:
        word = word.strip(string.punctuation)
        if not word: continue
        if word in COOKING_STOPWORDS: continue
        if word in stopwords.words('english'): continue
        if len(word) < 2: continue # skip single letters
        clean_tokens.append(word)
        
    return ' '.join(clean_tokens)

def preprocess_text(text):
    # Use the cleaner logic
    return clean_ingredient_text(text)

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
    
    # Get top N indices (these are integer positions)
    top_indices = sorted_indices[:top_n]
    
    # Fetch from dataframe using positions
    recommendations = df_english.iloc[top_indices].copy()
    
    # Add similarity score
    # combined_similarity is a Series, so use .iloc for positional access
    # or .values if it were an array. .iloc is safer for Series.
    if hasattr(combined_similarity, 'iloc'):
        scores = combined_similarity.iloc[top_indices] * 100
    else:
        scores = combined_similarity[top_indices] * 100
        
    recommendations['similarity_score'] = scores.astype(int).values
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
       - "days_to_expiry": (int) estimated days until expiry (use 999 for non-perishables like salt/spices/rice)
       - "priority": (string) "High", "Medium", or "Low" based on urgency to use.
    
    STRICT Guidelines for Priority:
    - High (Red): Raw meats (Chicken, Beef, Pork), Seafood, Leafy Greens. Use within 1-3 days.
    - Medium (Yellow): Eggs, Milk, Soft Cheeses, Most Fresh Vegetables/Fruits. Use within 4-14 days.
    - Low (Green): Rice, Grains, Pasta, Hard Cheeses, Frozen Foods, Canned Goods, Spices. Use within 15+ days.

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
            
        data = json.loads(content.strip())
        
        # Ensure it's a list. Sometimes models wrap the array in a dict (e.g. {"ingredients": [...]})
        if isinstance(data, dict):
            # Look for a list value
            for key, value in data.items():
                if isinstance(value, list):
                    return value
            # If no list found, treat the dict as a single item
            return [data]
            
        if isinstance(data, list):
            # Ensure elements are dicts
            return [item for item in data if isinstance(item, dict)]
            
        return [] # Fallback
        
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

@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    # Default profile
    default_profile = {
        "name": user.email.split("@")[0],
        "experience_level": "Intermediate",
        "dietary_preferences": [],
        "allergies": [],
        "health_goals": []
    }
    
    new_user = User(email=user.email, hashed_password=hashed_password, profile=default_profile)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    # Merge profile data with interactions
    profile_data = current_user.profile.copy()
    profile_data["interactions"] = current_user.interactions
    profile_data["is_admin"] = current_user.is_admin
    return profile_data

@app.post("/profile")
def update_profile(profile_update: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Filter out None values
    updates = {k: v for k, v in profile_update.dict().items() if v is not None}
    
    # Update the JSON dict. note: SQLAlchemy mutation tracking for JSON is tricky, often need to re-assign
    new_profile = current_user.profile.copy()
    new_profile.update(updates)
    current_user.profile = new_profile
    
    db.commit()
    db.refresh(current_user)
    return current_user.profile

@app.post("/interaction")
def log_interaction(interaction: InteractionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Add interaction
    new_interaction = {
        "timestamp": str(datetime.now()),
        "action": interaction.action,
        "recipe_name": interaction.recipe_name,
        "details": interaction.details or {}
    }
    
    # Re-assign list to trigger update
    current_interactions = list(current_user.interactions) if current_user.interactions else []
    current_interactions.append(new_interaction)
    current_user.interactions = current_interactions
    
    db.commit()
    return {"status": "success"}

def apply_profile_filters(recipes_df, constraints):
    filtered_df = recipes_df.copy()
    
    # handle NaN ingredients
    filtered_df['Ingredients'] = filtered_df['Ingredients'].fillna('')

    # Allergies
    for allergy in constraints.get("allergies", []):
         if not allergy: continue
         filtered_df = filtered_df[~filtered_df['Ingredients'].str.contains(allergy, case=False, na=False)]

    # Diet
    diets = constraints.get("dietary_preferences", []) # Changed key to match DB profile structure
    
    # Helper definitions
    meats = ["chicken", "beef", "pork", "lamb", "fish", "shrimp", "meat", "bacon", "ham", "sausage", "seafood"]
    dairy_eggs = ["egg", "milk", "cheese", "yogurt", "cream", "butter", "ghee"]
    
    if "Vegetarian" in diets or "Vegan" in diets:
         pattern = '|'.join(meats)
         filtered_df = filtered_df[~filtered_df['Ingredients'].str.contains(pattern, case=False, na=False)]
    
    if "Vegan" in diets:
        pattern = '|'.join(dairy_eggs + ["honey"])
        filtered_df = filtered_df[~filtered_df['Ingredients'].str.contains(pattern, case=False, na=False)]
        
    if "Gluten-Free" in diets:
        gluten = ["wheat", "barley", "rye", "flour", "bread", "pasta"] # Simplistic check
        pattern = '|'.join(gluten)
        filtered_df = filtered_df[~filtered_df['Ingredients'].str.contains(pattern, case=False, na=False)]

    return filtered_df

@app.post("/recommend", response_model=List[Recipe])
def recommend_recipes_endpoint(request: RecipeRequest, current_user: Optional[User] = Depends(get_current_user)):
    """
    Current user is optional? If we want public access, yes.
    But requirement says 'authentication for different users'.
    Let's make it optional for Guest access, but if logged in, use profile.
    """
    if df_english is None:
        raise HTTPException(status_code=503, detail="Model failed to load. Please check server logs.")

    try:
        # Convert comma separated string to list AND clean them
        raw_list = [i.strip() for i in request.ingredients.split(',')]
        ingredients_list = []
        for i in raw_list:
            cleaned = clean_ingredient_text(i)
            if cleaned:
                ingredients_list.append(cleaned)
        
        # If everything was filtered out (unlikely but possible), fallback to raw or handle error
        if not ingredients_list and raw_list:
             # Just use raw if cleaning removed everything (e.g. user entered just "water")
             ingredients_list = [r for r in raw_list if r]

        # 1. Fetch more candidates (e.g., top 50) to allow for filtering
        base_recs = get_recommendations_logic(ingredients_list, request.prep_time, request.cook_time, top_n=50)
        
        # 2. Apply Profile Filters (if user logged in)
        if current_user:
             constraints = {
                 "allergies": current_user.profile.get("allergies", []),
                 "dietary_preferences": current_user.profile.get("dietary_preferences", []),
                 # "disliked": ...
             }
             filtered_recs = apply_profile_filters(base_recs, constraints)
        else:
             filtered_recs = base_recs
        
        # 3. Enhance/Rank
        final_recs = filtered_recs.head(9)
        
        if final_recs.empty and not base_recs.empty:
            pass # Fallback?

        # Helper to process a single row
        def process_recipe_row(row):
            # Handle potential missing or NaN ingredients
            ingreds = str(row['Ingredients']) if 'Ingredients' in row and pd.notna(row['Ingredients']) else "Not listed"
            recipe_name = str(row['RecipeName'])
            youtube_url = get_youtube_link(recipe_name)
            
            # Calculate Missing Ingredients
            # 1. Parse recipe ingredients
            # Check if it looks like a list string "['a', 'b']"
            r_ing_list = []
            if ingreds.strip().startswith("[") and ingreds.strip().endswith("]"):
                import ast
                try:
                    r_ing_list = ast.literal_eval(ingreds)
                except:
                    # Fallback to simple split if eval fails
                    r_ing_list = [x.strip() for x in ingreds.replace('[','').replace(']','').replace("'", "").split(',')]
            else:
                r_ing_list = [x.strip() for x in ingreds.split(',')]
            
            # 2. Check against user inputs (ingredients_list is from outer scope)
            missing = []
            user_ings_lower = [u.lower() for u in ingredients_list]
            
            # Use a tracking set to avoid duplicates in missing list (e.g. multiple "onions")
            added_missing = set()

            for r_ing in r_ing_list:
                # Clean the ingredient first to see what it actually is
                cleaned_r_ing = clean_ingredient_text(r_ing)
                
                # If it cleans to empty (was just "1" or "tablespoon"), skip it
                if not cleaned_r_ing:
                    continue

                r_ing_lower = r_ing.lower() # Use original for matching context if needed, or cleaned?
                # Using cleaned for matching is safer to avoid matching "tablespoon" to "tablespoon"
                
                # Matching Logic:
                # Check if this cleaned ingredient is in user's list
                match = False
                for u_ing in user_ings_lower:
                    # u_ing is already cleaned from the endpoint logic
                    if u_ing in cleaned_r_ing or cleaned_r_ing in u_ing: 
                        match = True
                        break
                
                if not match: 
                    # It's missing. Add it if not already added.
                    # Use Title Case for display
                    display_name = cleaned_r_ing.title()
                    if display_name not in added_missing:
                        link = f"https://blinkit.com/s/?q={display_name.replace(' ', '+')}"
                        missing.append({"name": display_name, "link": link})
                        added_missing.add(display_name)

            return Recipe(
                name=recipe_name,
                translated_name=str(row['TranslatedRecipeName']),
                ingredients=ingreds,
                prep_time=int(row['PrepTimeInMins']),
                cook_time=int(row['CookTimeInMins']),
                url=str(row['URL']),
                youtube_link=youtube_url,
                missing_ingredients=missing,
                match_score=int(row['similarity_score']) if 'similarity_score' in row else 0
            )

        # Execute searches in parallel (preserving order)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
             results = list(executor.map(process_recipe_row, [row for _, row in final_recs.iterrows()]))
            
        return results

    except Exception as e:
        print(f"Error generating recommendations: {e}")
        # import traceback
        # traceback.print_exc()
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

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    # Encode email in token for demo purposes
    token = base64.urlsafe_b64encode(request.email.encode()).decode()
    print(f"Password recovery requested for: {request.email}")
    print(f"Recover your password here: http://localhost:5173/reset-password?token={token}")
    return {"message": "If this email is registered, a recovery link has been sent."}

@app.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        email = base64.urlsafe_b64decode(request.token).decode()
    except:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/admin/users")
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin privileges"
        )
    
    users = db.query(User).all()
    stats = []
    for u in users:
        # Load profile and interactions safely
        interactions = u.interactions if u.interactions else []
        likes = sum(1 for i in interactions if isinstance(i, dict) and i.get('action') == 'like')
        
        stats.append({
            "email": u.email,
            "id": u.id,
            "is_admin": u.is_admin,
            "joined_at": "2024-01-01", # Placeholder, would need created_at column
            "total_interactions": len(interactions),
            "total_likes": likes
        })
        
    return stats

# Temporary dev helper to promote a user to admin
@app.post("/admin/promote")
def promote_user(email: str, db: Session = Depends(get_db)):
    # This is UNSECURE and only for testing purposes to set up the first admin
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"User {email} is now an admin"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)

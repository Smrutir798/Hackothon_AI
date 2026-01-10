import pickle
import pandas as pd
import numpy as np
import os
from sklearn.metrics.pairwise import cosine_similarity

MODEL_PATH = "backend/recipe_recommender_model.pkl"

def test_model():
    if not os.path.exists(MODEL_PATH):
        print(f"File not found: {MODEL_PATH}")
        return

    try:
        with open(MODEL_PATH, 'rb') as f:
            model_data = pickle.load(f)
        
        print(f"Keys in model_data: {model_data.keys()}")
        
        df = model_data['dataframe']
        tfidf_matrix = model_data['tfidf_matrix']
        vectorizer = model_data['tfidf_vectorizer']
        
        print(f"DataFrame type: {type(df)}")
        print(f"DataFrame shape: {df.shape}")
        print(f"DataFrame detailed info:")
        print(df.info())
        print(f"DataFrame head index: {df.index[:10]}")
        
        print(f"TFIDF Matrix shape: {tfidf_matrix.shape}")
        
        # Simulate simple recommendation
        print("\nSimulating recommendation...")
        user_ingredients = "chicken"
        user_tfidf = vectorizer.transform([user_ingredients])
        cosine_sim = cosine_similarity(user_tfidf, tfidf_matrix)[0]
        
        # Simulate 'calculate_similarity' logic simplified
        # Assume prep/cook time similarity logic works and returns a Series/Array of same length
        # Just use cosine_sim for testing argsort
        
        # Check if cosine_sim is array
        print(f"Cosine sim type: {type(cosine_sim)}")
        print(f"Cosine sim shape: {cosine_sim.shape}")
        
        # If we convert it to series like in the app?
        # In app: combined_similarity = (cosine_similarities + prep_time_similarity + cook_time_similarity) / 3
        # prep_time_similarity comes from df column math, so it is a Series with index matching df
        
        prep_sim = pd.Series(np.random.rand(len(df)), index=df.index)
        
        combined_sim = (cosine_sim + prep_sim) / 2
        print(f"Combined sim type: {type(combined_sim)}")
        
        sorted_indices = combined_sim.argsort()[::-1]
        print(f"Sorted indices type: {type(sorted_indices)}")
        print(f"Sorted indices head: {sorted_indices.head() if isinstance(sorted_indices, pd.Series) else sorted_indices[:5]}")
        
        top_n = 5
        top_indices = sorted_indices[:top_n]
        print(f"Top indices: {top_indices}")
        
        # TEST INCIDENTS
        try:
            print("Trying iloc with top_indices...")
            res = df.iloc[top_indices]
            print("Success with iloc!")
            print(res.head())
        except Exception as e:
            print(f"FAILED with iloc: {e}")
            
        try:
            print("Trying loc with top_indices...")
            res = df.loc[top_indices]
            print("Success with loc!")
        except Exception as e:
            print(f"FAILED with loc: {e}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_model()

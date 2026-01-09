import requests
import json
import random
import string

BASE_URL = "http://127.0.0.1:8010"

def get_random_string(length=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def register_and_login(dietary_prefs=[]):
    email = f"test_{get_random_string()}@example.com"
    password = "password123"
    
    # 1. Register
    reg_res = requests.post(f"{BASE_URL}/register", json={"email": email, "password": password})
    if reg_res.status_code != 200:
        print(f"Registration failed for {email}: {reg_res.text}")
        return None, None

    # 2. Login
    login_data = {
        "username": email,
        "password": password
    }
    # FastAPI OAuth2PasswordRequestForm expects form data, not json
    login_res = requests.post(f"{BASE_URL}/token", data=login_data)
    if login_res.status_code != 200:
        print(f"Login failed for {email}: {login_res.text}")
        return None, None
        
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Update Profile if needed
    if dietary_prefs:
        update_data = {
            "dietary_preferences": dietary_prefs
        }
        # Update profile
        up_res = requests.post(f"{BASE_URL}/profile", json=update_data, headers=headers)
        if up_res.status_code != 200:
            print(f"Profile update failed: {up_res.text}")
            
    return token, email

def search_chicken(user_label, token):
    print(f"\n--- Testing {user_label} ---")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "ingredients": "chicken, salt, pepper",
        "prep_time": 30,
        "cook_time": 60
    }
    
    response = requests.post(f"{BASE_URL}/recommend", json=payload, headers=headers)
    if response.status_code != 200:
        print(f"Search failed: {response.text}")
        return
        
    results = response.json()
    print(f"Search for 'chicken' returned {len(results)} recipes.")
    for r in results[:3]:
        print(f" - {r['name']} (Ingredients: {r['ingredients'][:50]}...)")
        
    return results

def main():
    print("Starting Verification...")
    
    # CASE A: Vegetarian
    print("\n1. Creating User A (Vegetarian)...")
    token_a, email_a = register_and_login(["Vegetarian"])
    if token_a:
        params_a = search_chicken("User A (Vegetarian)", token_a)
        if len(params_a) == 0:
            print("[SUCCESS] User A got 0 chicken recipes.")
        else:
            print("[FAILURE] User A got chicken recipes! Filtering failed.")

    # CASE B: No Restrictions
    print("\n2. Creating User B (No Restrictions)...")
    token_b, email_b = register_and_login([])
    if token_b:
        params_b = search_chicken("User B (Normal)", token_b)
        if len(params_b) > 0:
            print("[SUCCESS] User B got chicken recipes.")
        else:
            print("[FAILURE] User B got 0 recipes, expected some.")

if __name__ == "__main__":
    main()

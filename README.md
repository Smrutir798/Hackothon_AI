# 🍳 AI Cooking Assistant

A smart, AI-powered kitchen companion that helps you reduce food waste and cook delicious meals. Features ingredient detection, personalized recipe recommendations, and a hands-free interactive cooking mode.

## 🌟 Key Features

### 🔍 Smart Ingredient Detection
-   **AI Vision**: Uses **YOLO (You Only Look Once)** to instantly identify ingredients from your camera or uploaded photos.
-   **Pantry Management**: Automatically adds detected items to your digital pantry.

### 🤖 Intelligent Recipe Recommendations
-   **Taste Matching**: Suggests recipes based on your available ingredients, prep time preferences, and missing ingredients tolerance.
-   **Personalized Ranking**: Uses TF-IDF and Cosine Similarity to find the perfect match for your pantry.

### 👨‍🍳 Immersive Cooking Mode
-   **Step-by-Step Guidance**: Large, focused display for each instruction step.
-   **🗣️ Voice Assistant**: Completely hands-free control!
    -   *"Next"* / *"Back"* to navigate steps.
    -   *"Read"* to hear the instruction spoken aloud.
    -   *"Start Timer"* to auto-set a timer based on the step (e.g., "Cook for 5 mins").
-   **🌐 Real-Time Translation**: Translate cooking steps instantly into **Hindi**, **Spanish**, or **French**.
-   **Smart Timers**: Auto-detects time mentions in recipes and offers one-click timers.

### 👤 User Features
-   **Secure Login**: JWT-based authentication.
-   **Profile**: Track your favorite cuisines and diet preferences.
-   **Favorites**: Save recipes for later.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS (or custom CSS), Recharts, Web Speech API.
*   **Backend**: Python (FastAPI), Pandas, Scikit-Learn, Deep-Translator, NLTK.
*   **AI/ML**: YOLOv11 (Object Detection), TF-IDF (Recommendation Engine).
*   **Database**: MongoDB (User data), Pickle (Recipe Dataset).

---

## 🚀 Getting Started

### Prerequisites
-   Node.js (v16+)
-   Python (v3.9+)
-   MongoDB running locally or a cloud connection string.

### 1. Backend Setup

```bash
cd backend
# Create virtual environment (optional but recommended)
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
# Ensure deep-translator is installed for Cooking Mode
pip install deep-translator nltk

# Run the server
uvicorn main:app --reload --port 8010
```

*Note: The app expects a `recipe_recommender_model.pkl` in the `backend/` directory.*

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install
# Ensure react-router-dom is installed
npm install react-router-dom

# Start the dev server
npm run dev
```

### 3. Usage

1.  Open your browser at `http://localhost:5173`.
2.  **Sign Up / Login** to access personalized features.
3.  **Home Page**: Enter ingredients manually or use the **Camera** to detect them.
4.  **Get Recommendations**: View matched recipes.
5.  **Start Cooking**: Click **"Start Cooking Mode"** on any recipe card to enter the immersive view.
    -   Enable the **Mic** to use voice commands.
    -   Use the dropdown to **Translate** steps if needed.

## 🗣️ Voice Commands Guide

| Command | Action |
| :--- | :--- |
| **"Next"** | Go to the next instruction step. |
| **"Back"** / **"Previous"** | Go to the previous step. |
| **"Read"** / **"Repeat"** | Read the current step aloud using Text-to-Speech. |
| **"Start Timer"** | Starts a timer if a duration (e.g., "10 mins") is found in the text. |
| **"Stop"** | Stop the assistant from talking. |

---

## 📂 Project Structure

```
AI_Cooking/
├── backend/
│   ├── main.py              # FastAPI application & Logic
│   ├── model_training.py    # Script to train recommendation model
│   ├── recipe_recommender_model.pkl # Pre-trained model & dataset
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components (RecipeCard, etc.)
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Main Dashboard
│   │   │   └── CookingMode.jsx  # Immersive Cooking View
│   │   ├── App.jsx          # Routing & Layout
│   │   └── main.jsx         # Entry point
│   └── package.json
└── README.md
```

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)

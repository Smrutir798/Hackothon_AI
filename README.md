# AI Cooking Assistant 🍳

The AI Cooking Assistant is a smart kitchen companion that helps you reduce food waste and cook delicious meals. It combines ingredient detection (computer vision), personalized recipe recommendations, and perishability analysis to guide your cooking journey.

## 🌟 Features

*   **📸 Ingredient Detection**: Upload a photo of your fridge or pantry, and the AI (YOLOv11) will identify the ingredients for you.
*   **🥗 Smart Recipe Recommendations**: Get personalized recipe suggestions based on your available ingredients, cooking time, and dietary preferences.
*   **👤 Personalized Experience**: Your recommendations are automatically filtered based on your unique profile settings—ensuring recipes match your dietary needs (Vegan, Keto, etc.), strictly avoid your allergies, and align with your health goals.
*   **❤️ Save & Like Recipes**: Keep track of your culinary journey by liking and saving your favorite recipes. The app remembers your interactions to help you build your own personal cookbook.
*   **⏳ Perishability Analysis**: The system (powered by Llama 3) analyzes your ingredients to prioritize items that are nearing expiration, helping you save food.
*   **� Secure Login & Signup**: Create your own account to access your saved data from anywhere. The app uses secure authentication (JWT) to protect your information and sync your preferences.
*   **📺 Video Guides**: Integrated YouTube links for recipes to follow along easily.
*   **🛍️ Missing Ingredients**: Automatically identifies missing items and provides links to purchase them (e.g., via Blinkit).
*   **🔐 Secure Login & Signup**: Create your own account to access your saved data from anywhere. The app uses secure authentication (JWT) to protect your information and sync your preferences.
## 🛠️ Prerequisites

Before running the project, ensure you have the following installed:

*   **Node.js** (v18 or higher)
*   **Python** (v3.11 or higher)
*   **Ollama**: Required for the text analysis features.
    *   Install from [ollama.com](https://ollama.com/).
    *   Pull the Llama 3 model: `ollama pull llama3`

## 🚀 Installation & Setup

### 1. Backend Setup

The backend is built with FastAPI and handles the AI logic.

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  (Optional but recommended) Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```

3.  Install the required Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

    *Note: If `requirements.txt` is missing, basic requirements are `fastapi uvicorn sqlalchemy pandas pydantic scikit-learn nltk youtube-search ultralytics pillow ollama passlib[bcrypt] python-multipart python-jose`.*

4.  **Verify Models**:
    *   Ensure `yolo11n.pt` is present in the `backend/` directory.
    *   Ensure `recipe_recommender_model.pkl` is present in the `backend/` directory.

### 2. Frontend Setup

The frontend is a modern React application powered by Vite.

1.  Open a new terminal and navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## 🏃‍♂️ Running the Application

### Option A: One-Click Start (Windows)

Simply double-click the `start_app.bat` file in the root directory. This will launch both the backend and frontend servers in separate windows.

### Option B: Manual Start

1.  **Start the Backend**:
    From the `backend` directory:
    ```bash
    python main.py
    ```
    The server will start at `http://localhost:8010`.

2.  **Start the Frontend**:
    From the `frontend` directory:
    ```bash
    npm run dev
    ```
    The application will run at `http://localhost:5173`.

## 📖 Usage Guide

1.  **Sign Up / Login**: Create an account to manage your preferences.
2.  **Detect Ingredients**:
    *   Go to the "Scan" or "Upload" section.
    *   Upload an image of your ingredients.
    *   The app will list what it found and what needs to be used soon.
3.  **Get Recipes**:
    *   Confirm your ingredient list.
    *   Set your available prep/cook time.
    *   Click "Get Recommendations" to see matched recipes.
4.  **Cook**: Click on a recipe to view details, missing ingredients, and a video tutorial.

## 🔧 Configuration

*   **Port Configuration**:
    *   Backend: Port `8010` (Adjust in `backend/main.py` if needed).
    *   Frontend: Port `5173` (Default Vite port).
*   **Database**: Uses SQLite (`users.db`) automatically created in the `backend` folder.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for new features or improvements!

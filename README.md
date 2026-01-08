# AI Cooking Assistant

This project consists of a React frontend and a FastAPI (Python) backend to recommend recipes based on ingredients and time constraints.

## Prerequisites

- Node.js installed
- Python 3.8+ installed

## Setup & Run

### 1. Backend

 Navigate to the `backend` folder and install dependencies:

 ```bash
 cd backend
 pip install -r requirements.txt
 ```

 Start the backend server:

 ```bash
 python main.py
 ```
 The server will run at `http://localhost:8000`.

 **Note**: The backend expects a model file at `C:\Users\smrut\Desktop\AI_Cooking\recipe_recommender_model.pkl`. If the model fails to load, the backend will use mock data for demonstration purposes.

### 2. Frontend

 Open a new terminal window, navigate to the `frontend` folder, and install dependencies:

 ```bash
 cd frontend
 npm install
 ```

 Start the development server:

 ```bash
 npm run dev
 ```
 The application will effectively run at `http://localhost:5173`.

import React, { useState } from 'react';
import axios from 'axios';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import './index.css';

const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002/recommend';

function App() {
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendations = async (inputData) => {
    setLoading(true);
    setError(null);
    setRecipes(null);

    try {
      const response = await axios.post(API_ENDPOINT, inputData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log("API Response:", response.data);
      setRecipes(response.data);
    } catch (err) {
      console.error("API Error:", err);
      // Show more detailed error for debugging
      const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`Failed to fetch recommendations: ${errorMessage}. Please ensure the backend is running on port 8002.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem' }}>
        <h1 className="title">AI Culinary Assistant</h1>
        <p className="subtitle">Discover personalized recipes matched to your ingredients and time.</p>
      </header>
      
      <main>
        <RecipeForm onSubmit={fetchRecommendations} isLoading={loading} />

        {error && (
          <div className="error" style={{ marginTop: '2rem' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            Cooking up recommendations...
          </div>
        )}

        {/* Show results if we have them and aren't loading */}
        {!loading && recipes && (
          <div style={{ marginTop: '3rem' }}>
             <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Your Recommendations</h2>
             <RecipeList recipes={recipes} />
          </div>
        )}
      </main>
      
      <footer style={{ marginTop: '5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>© 2026 AI Cooking. Powered by Machine Learning.</p>
      </footer>
    </div>
  );
}

export default App;

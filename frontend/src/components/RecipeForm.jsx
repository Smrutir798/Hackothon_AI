import React, { useState, useRef } from 'react';
import axios from 'axios';

const DETECT_ENDPOINT = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002/recommend').replace('/recommend', '/detect-ingredients');

const RecipeForm = ({ onSubmit, isLoading }) => {
  const [ingredients, setIngredients] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const hiddenFileInput = useRef(null);
  const [detectedItems, setDetectedItems] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ingredients,
      prep_time: parseInt(prepTime) || 0,
      cook_time: parseInt(cookTime) || 0,
    });
  };

  const handleClick = () => {
    hiddenFileInput.current.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsDetecting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text_input', ingredients);

    try {
      const response = await axios.post(DETECT_ENDPOINT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const detected = response.data.detected_ingredients;
      if (detected && detected.length > 0) {
        // Handle object response (new backend) or string list (old backend/fallback)
        const isObjectList = detected.length > 0 && typeof detected[0] === 'object';
        const detectedNames = detected.map(d => (typeof d === 'object' && d.name) ? d.name : d);
        
        if (isObjectList) {
            setDetectedItems(detected);
        } else {
            // Fallback for string-only response
             setDetectedItems(detected.map(d => ({ name: d, days_to_expiry: null, priority: 'Unknown' })));
        }

        const currentIngredients = ingredients ? ingredients.split(',').map(i => i.trim()).filter(i => i) : [];
        const newIngredients = [...new Set([...currentIngredients, ...detectedNames])];
        setIngredients(newIngredients.join(', '));
      } else {
        alert('No ingredients detected in the image.');
      }
    } catch (err) {
      console.error("Detection Error:", err);
      alert('Failed to detect ingredients. Please try again.');
    } finally {
      setIsDetecting(false);
      // Reset file input
      if (hiddenFileInput.current) {
        hiddenFileInput.current.value = '';
      }
    }
  };

  const getPriorityColor = (priority, days) => {
      if (days !== null && days <= 3) return '#ef4444'; // Red
      if (priority === 'High') return '#ef4444';
      if (priority === 'Medium') return '#f59e0b'; // Yellow/Orange
      return '#10b981'; // Green
  };

  const handleTextAnalysis = async () => {
    if (!ingredients.trim()) return;

    setIsDetecting(true);
    const formData = new FormData();
    formData.append('text_input', ingredients);

    try {
      const response = await axios.post(DETECT_ENDPOINT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const detected = response.data.detected_ingredients;
      if (detected && detected.length > 0) {
        const isObjectList = detected.length > 0 && typeof detected[0] === 'object';
        
        if (isObjectList) {
            setDetectedItems(detected);
        } else {
             setDetectedItems(detected.map(d => ({ name: d, days_to_expiry: null, priority: 'Unknown' })));
        }
      }
    } catch (err) {
      console.error("Text Analysis Error:", err);
      // Optional: silent fail or alert
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', borderTop: '4px solid var(--primary)' }}>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label htmlFor="ingredients" className="label" style={{ marginBottom: 0 }}>
              What ingredients do you have?
            </label>
            <div>
                <input
                    type="file"
                    accept="image/*"
                    ref={hiddenFileInput}
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={isDetecting}
                />
                <button 
                  type="button" 
                  className="btn-outline" 
                  onClick={handleClick}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem', 
                    cursor: 'pointer', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                  disabled={isDetecting}
                >
                    {isDetecting ? (
                      <>
                        <span className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Detecting...
                      </>
                    ) : (
                      <>
                        📷 Scan Photo
                      </>
                    )}
                </button>
            </div>
          </div>
          
          {/* Display Detected Items with Priority */}
          {detectedItems.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <small style={{ width: '100%', color: 'var(--text-muted)' }}>Detected & Prioritized:</small>
                  {detectedItems.map((item, idx) => (
                      <span key={idx} style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          fontSize: '0.8rem', 
                          background: 'white', 
                          border: `1px solid ${getPriorityColor(item.priority, item.days_to_expiry)}`,
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '1rem',
                          color: 'var(--text-primary)'
                      }}>
                          <span style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: getPriorityColor(item.priority, item.days_to_expiry),
                              marginRight: '0.3rem'
                           }}></span>
                          <b>{item.name}</b>
                          {item.days_to_expiry !== 999 && item.days_to_expiry !== null && (
                              <span style={{ marginLeft: '0.3rem', color: 'var(--text-muted)' }}>
                                  ({item.days_to_expiry}d left)
                              </span>
                          )}
                      </span>
                  ))}
              </div>
          )}

          <textarea
            id="ingredients"
            className="input"
            placeholder="e.g. chicken breast, garlic, basil, tomatoes..."
            rows="3"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <small style={{ color: 'var(--text-muted)' }}>
                Separate ingredients with commas.
            </small>
            <button 
                type="button" 
                onClick={handleTextAnalysis} 
                disabled={isDetecting || !ingredients.trim()} 
                style={{ 
                    background: ingredients.trim() ? '#eff6ff' : 'transparent', // Light blue bg when active
                    border: '1px solid transparent',
                    borderColor: ingredients.trim() ? 'var(--primary)' : 'transparent',
                    color: ingredients.trim() ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: ingredients.trim() ? 'pointer' : 'not-allowed',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap'
                }}
            >
                {isDetecting ? (
                    <>
                        <span className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Analyzing...
                    </>
                ) : (
                    <>
                        ⚡ Check Freshness
                    </>
                )}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="input-group">
            <label htmlFor="prepTime" className="label">
              Max Prep Time (mins)
            </label>
            <input
              type="number"
              id="prepTime"
              className="input"
              placeholder="30"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cookTime" className="label">
              Max Cook Time (mins)
            </label>
            <input
              type="number"
              id="cookTime"
              className="input"
              placeholder="45"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn" disabled={isLoading} style={{ marginTop: '1rem' }}>
          {isLoading ? (
            <span>Cooking up ideas...</span>
          ) : (
            <span>Get Recommendations ✨</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default RecipeForm;

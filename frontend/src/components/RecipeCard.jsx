import React, { useState } from 'react';

const RecipeCard = ({ recipe, onInteraction }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Parse ingredients into array
  const ingredientsList = recipe.ingredients ? recipe.ingredients.split(',').map(i => i.trim()) : [];
  const missingCount = recipe.missing_ingredients ? recipe.missing_ingredients.length : 0;

  const handleLike = (e) => {
      e.stopPropagation();
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      if (onInteraction) {
          onInteraction(newLikedState ? 'like' : 'unlike', recipe.name);
      }
  };

  const handleView = (type, url) => {
      if (onInteraction) {
          onInteraction('view', recipe.name, { type, url });
      }
  };

  return (
    <div className="card recipe-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* 1. Header: Score & Like */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             {/* Match Score Badge */}
             {recipe.match_score > 0 && (
                 <span className="badge" style={{ 
                     background: recipe.match_score >= 80 ? '#dcfce7' : '#fff7ed', 
                     color: recipe.match_score >= 80 ? '#166534' : '#9a3412',
                     fontWeight: 'bold',
                     border: 'none',
                     fontSize: '0.8rem'
                 }}>
                     {recipe.match_score}% Match
                 </span>
             )}
          </div>
          <button 
                onClick={handleLike}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                title={isLiked ? "Unlike" : "Like"}
          >
                {isLiked ? '❤️' : '🤍'}
          </button>
      </div>

      {/* 2. Title */}
      <div style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem', lineHeight: '1.3', fontWeight: '700' }}>
            {recipe.name}
          </h3>
      </div>

      {/* 3. Essential Time Metadata */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>⏱️</span> <strong>{recipe.prep_time + recipe.cook_time}m</strong> total
          </div>
          <div style={{ width: '1px', height: '12px', background: 'var(--border)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>🍳</span> {recipe.cook_time}m cook
          </div>
      </div>

      {/* Toggle Details Button */}
      <button 
          onClick={() => setShowDetails(!showDetails)}
          style={{ 
              background: 'none', border: 'none', color: 'var(--primary)', 
              fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600', 
              padding: '0', textAlign: 'left', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
      >
          {showDetails ? 'Hide Ingredients' : 'Show Ingredients & Details'} 
          <span style={{ fontSize: '0.8rem' }}>{showDetails ? '▲' : '▼'}</span>
      </button>

      {/* Expandalbe Content */}
      {showDetails && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1rem 0' }} />

                {/* Ingredients */}
                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    What you need
                    </h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                        {ingredientsList.join(', ')}
                    </p>
                </div>

                {/* Missing Ingredients */}
                {missingCount > 0 && (
                    <div style={{ marginBottom: '1rem', background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                        <div style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: '600', marginBottom: '0.5rem' }}>
                             ⚠️ Missing {missingCount} item{missingCount !== 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {recipe.missing_ingredients.map((item, idx) => (
                                <a 
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'white', padding: '0.4rem 0.6rem', borderRadius: '4px',
                                        textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.85rem'
                                    }}
                                >
                                    <span>{item.name}</span>
                                    <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>Buy ↗</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
          </div>
      )}

      {/* 7. CTAs */}
      <div style={{ marginTop: 'auto', display: 'grid', gap: '0.75rem' }}>
        <a 
          href={recipe.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn"
          onClick={() => handleView('web', recipe.url)}
          style={{ textAlign: 'center', width: '100%', justifyContent: 'center' }}
        >
          View Full Recipe
        </a>

        {recipe.youtube_link && (
          <a 
            href={recipe.youtube_link} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => handleView('youtube', recipe.youtube_link)}
            style={{ 
                textAlign: 'center', width: '100%', textDecoration: 'none', 
                color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            📺 Watch Video Tutorial
          </a>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;

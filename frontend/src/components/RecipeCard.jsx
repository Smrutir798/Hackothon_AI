import React from 'react';

const RecipeCard = ({ recipe }) => {
  return (
    <div className="card recipe-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.25rem', lineHeight: '1.4' }}>
          {recipe.name}
        </h3>
        {recipe.translated_name && recipe.translated_name !== recipe.name && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 0, fontStyle: 'italic' }}>
            {recipe.translated_name}
          </p>
        )}
        
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="badge">
            <span role="img" aria-label="clock">⏱️</span> Prep: {recipe.prep_time}m
          </div>
          <div className="badge">
            <span role="img" aria-label="fire">🔥</span> Cook: {recipe.cook_time}m
          </div>
        </div>

        {recipe.ingredients && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Key Ingredients
            </h4>
            <p style={{ 
              margin: 0, 
              fontSize: '0.95rem', 
              color: 'var(--text-main)',
              display: '-webkit-box',
              WebkitLineClamp: '3',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis' 
            }}>
              {recipe.ingredients}
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <a 
          href={recipe.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-outline"
          style={{ 
            textDecoration: 'none', 
            textAlign: 'center', 
            padding: '0.75rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          View Recipe
        </a>
        
        {recipe.youtube_link && (
          <a 
            href={recipe.youtube_link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn"
            style={{ 
              textDecoration: 'none', 
              textAlign: 'center', 
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              backgroundColor: '#ef4444', /* YouTube Red */
              color: 'white'
            }}
          >
            Watch Video
          </a>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;

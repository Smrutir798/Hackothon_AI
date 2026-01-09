import React from 'react';

const Sidebar = ({ isOpen, toggleSidebar, likedRecipes }) => {
    return (
        <>
            {/* Toggle Button (Visible when closed) */}
            {!isOpen && (
                <button 
                    onClick={toggleSidebar}
                    className="sidebar-toggle-btn"
                    title="View Liked Recipes"
                >
                    ❤️
                </button>
            )}

            {/* Sidebar Container */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Liked Recipes</h3>
                    <button onClick={toggleSidebar} className="close-btn">&times;</button>
                </div>
                
                <div className="sidebar-content">
                    {likedRecipes.length === 0 ? (
                        <p className="empty-state">No liked recipes yet. Click the heart on recipes you love!</p>
                    ) : (
                        <div className="liked-list">
                            {likedRecipes.map((recipe, idx) => (
                                <a 
                                    key={idx}
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="liked-item"
                                >
                                    {recipe} ↗
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Overlay for mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        </>
    );
};

export default Sidebar;

import React, { useState, useEffect } from 'react';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import AdminPanel from './components/AdminPanel';
import ResetPasswordModal from './components/ResetPasswordModal';
import axios from 'axios';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010';

function App() {
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Profile State
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false); // Admin Panel State
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [resetToken, setResetToken] = useState(null); // For Password Reset

  useEffect(() => {
    // Check for Reset Token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const rToken = urlParams.get('token');
    if (rToken && window.location.pathname === '/reset-password') {
        setResetToken(rToken);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname); 
    }

    if (token) {
        // Setup axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchProfile();
    } else {
        delete axios.defaults.headers.common['Authorization'];
        setUserProfile(null);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/profile`);
      setUserProfile(res.data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  const handleSaveProfile = async (updatedProfile) => {
      try {
          const res = await axios.post(`${API_BASE_URL}/profile`, updatedProfile);
          setUserProfile(res.data);
          setIsProfileOpen(false);
          alert("Profile saved!");
      } catch (err) {
          console.error("Failed to save profile", err);
          alert("Failed to save profile.");
      }
  };
  
  const handleLogin = async (email, password, isRegistering) => {
      const endpoint = isRegistering ? '/register' : '/token';
      // For token endpoint, we need FormData, for register we send JSON
      let data;
      let config = {};
      
      if (isRegistering) {
          data = { email, password };
      } else {
          const formData = new FormData();
          formData.append('username', email);
          formData.append('password', password);
          data = formData;
          config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
      }
      
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, data, config);
      const newToken = res.data.access_token;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setIsAuthOpen(false);
  };
  
  const handleLogout = () => {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUserProfile(null);
  };

  const handleInteraction = async (action, recipeName, details = {}) => {
      if (!token) return; // Don't log if not logged in
      
      const newInteraction = { 
          action, 
          recipe_name: recipeName, 
          details, 
          timestamp: new Date().toISOString() 
      };

      // Optimistic UI Update
      setUserProfile(prev => {
          if (!prev) return prev;
          const currentInteractions = prev.interactions || [];
          return { 
              ...prev, 
              interactions: [...currentInteractions, newInteraction] 
          };
      });

      try {
          await axios.post(`${API_BASE_URL}/interaction`, {
              action,
              recipe_name: recipeName,
              details
          });
          console.log(`Logged interaction: ${action} on ${recipeName}`);
      } catch (err) {
          console.error("Failed to log interaction", err);
          // Revert on failure? For now simpler to just log error.
      }
  };

  const fetchRecommendations = async (inputData) => {
    setLoading(true);
    setError(null);
    setRecipes(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/recommend`, inputData, {
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
      setError(`Failed to fetch recommendations: ${errorMessage}. Please ensure the backend is running on port 8010.`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Liked Recipes for Main UI
  const likedRecipes = React.useMemo(() => {
    if (!userProfile?.interactions) return [];
    const likes = new Set();
    userProfile.interactions.forEach(i => {
        if (i.action === 'like') likes.add(i.recipe_name);
        else if (i.action === 'unlike') likes.delete(i.recipe_name);
    });
    return Array.from(likes);
  }, [userProfile]);

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        
        <Sidebar 
            isOpen={isSidebarOpen} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            likedRecipes={likedRecipes} 
        />

        {/* Header Actions */}
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
             
             {token ? (
               <>
                 {userProfile && (
                     <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'none', md: 'block' }}>
                         <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text)', border: 'none' }}>
                             {userProfile.experience_level || 'Chef'}
                         </span>
                         {userProfile.dietary_preferences?.length > 0 && (
                            <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: 'none', marginLeft: '0.5rem' }}>
                                {userProfile.dietary_preferences[0]}
                            </span>
                         )}
                     </div>
                 )}

                 {userProfile?.is_admin && (
                     <button 
                        className="btn btn-outline" 
                        onClick={() => setIsAdminOpen(true)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: '#fcd34d', color: '#d97706', background: '#fffbeb' }}
                     >
                        👑 Admin
                     </button>
                 )}

                 <button className="btn btn-outline" onClick={() => setIsProfileOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    👤 {userProfile?.name || 'Profile'}
                 </button>
                 <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: '#ef4444', color: '#ef4444' }}>
                    Logout
                 </button>
              </>
            ) : (
                <button className="btn" onClick={() => setIsAuthOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    Login / Register
                </button>
            )}
        </div>

        <h1 className="title">AI Culinary Assistant</h1>
        <p className="subtitle">Discover personalized recipes matched to your ingredients and time.</p>
      </header>
      
      {isAdminOpen && (
          <div className="modal-overlay">
             <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
                 <AdminPanel token={token} onClose={() => setIsAdminOpen(false)} />
             </div>
          </div>
      )}

      {resetToken && (
          <ResetPasswordModal 
              token={resetToken} 
              onClose={() => setResetToken(null)}
              onSuccess={() => {
                  setResetToken(null);
                  setIsAuthOpen(true); // Open Login after reset
              }}
          />
      )}

      <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)}
          onLogin={handleLogin}
      />

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        profile={userProfile} 
        onSave={handleSaveProfile} 
      />
      
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
             <RecipeList 
        recipes={recipes} 
        onInteraction={handleInteraction}
      />
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

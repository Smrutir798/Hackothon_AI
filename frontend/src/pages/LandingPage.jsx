import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import './LandingPage.css';

const LandingPage = () => {
    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: targetRef });
    const yRange = useTransform(scrollYProgress, [0, 1], [0, 100]);
    
    // Parallax for hero text
    const { scrollY } = useScroll();
    const heroContentY = useTransform(scrollY, [0, 300], [0, -100]);
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

    // Feature variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1, 
            transition: { 
                staggerChildren: 0.3 
            } 
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

  return (
    <div className="landing-page" ref={targetRef}>
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
            className="hero-background-glow"
            animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3], 
            }}
            transition={{ 
                duration: 8, 
                repeat: Infinity,
                ease: "easeInOut" 
            }}
        />
        
        <motion.div 
            className="hero-content"
            style={{ y: heroContentY, opacity: heroOpacity }}
        >
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            The Future of <br /> 
            <motion.span 
                style={{ display: 'inline-block' }}
                animate={{ 
                    color: ["#f59e0b", "#d97706", "#f59e0b"] 
                }}
                transition={{ duration: 3, repeat: Infinity }}
            >
                Home Cooking
            </motion.span>
          </motion.h1>

          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Turn your ingredients into culinary masterpieces with AI-powered recipes, smart recommendations, and real-time guidance.
          </motion.p>
          
          <Link to="/app">
            <motion.button 
                className="cta-button"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgb(245, 158, 11)" }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                Start Cooking Now
            </motion.button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
            className="scroll-indicator"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
        >
            ↓
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
        >
            Why AI Cooking?
        </motion.h2>

        <motion.div 
            className="features-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
        >
          {[
              { icon: "📸", title: "Smart Vision", desc: "Simply snap a photo of your fridge or pantry. Our AI identifies ingredients instantly and suggests what to cook." },
              { icon: "🧠", title: "Personalized Chef", desc: "Get recipes matched to your taste, dietary preferences, and time. Gluten-free? Vegan? We've got you covered." },
              { icon: "🍳", title: "Interactive Guide", desc: "Follow step-by-step instructions with a hands-free cooking mode. Ask questions and get real-time help." }
          ].map((feature, index) => (
            <motion.div 
                key={index} 
                className="feature-card" 
                variants={itemVariants}
                whileHover={{ 
                    y: -10, 
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}
            >
                <div className="feature-icon-wrapper">
                    <span className="feature-icon">{feature.icon}</span>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Interactive Demo Section - Simple Visualization */}
      <section className="demo-section">
          <div className="demo-container">
               <motion.div 
                 className="demo-text"
                 initial={{ x: -50, opacity: 0 }}
                 whileInView={{ x: 0, opacity: 1 }}
                 transition={{ duration: 0.8 }}
               >
                   <h2>Seamless Integration</h2>
                   <p>From your camera to your kitchen table in minutes.</p>
               </motion.div>
               <motion.div 
                 className="demo-visual"
                 initial={{ scale: 0.8, opacity: 0 }}
                 whileInView={{ scale: 1, opacity: 1 }}
                 transition={{ duration: 0.8 }}
               >
                   <div className="phone-mockup">
                       <motion.div 
                         className="scan-line"
                         animate={{ top: ["0%", "100%", "0%"] }}
                         transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                       />
                       <div className="mockup-content">
                           <span>🍅</span>
                           <span>🥦</span>
                           <span>🥕</span>
                       </div>
                   </div>
               </motion.div>
          </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 AI Cooking Assistant. Crafted for food lovers.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

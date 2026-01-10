
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010';

const CookingMode = () => {
    const { recipeId } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [timer, setTimer] = useState(null); // { remaining: seconds, original: seconds }
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    
    // Translation State
    const [targetLang, setTargetLang] = useState('en');
    const [translations, setTranslations] = useState({});
    const [isTranslating, setIsTranslating] = useState(false);
    
    // Voice Recognition State
    const [isListening, setIsListening] = useState(false);
    const [lastHeard, setLastHeard] = useState("");
    const recognitionRef = useRef(null);

    // Refs for accessing latest state inside event listeners
    const recipeRef = useRef(recipe);
    const stepRef = useRef(currentStep);
    const isListeningRef = useRef(isListening);

    useEffect(() => {
        recipeRef.current = recipe;
        stepRef.current = currentStep;
        isListeningRef.current = isListening;
    }, [recipe, currentStep, isListening]);

    useEffect(() => {
        const loadRecipe = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/recipe/${recipeId}`);
                setRecipe(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load recipe");
            } finally {
                setLoading(false);
            }
        };
        loadRecipe();

        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
                console.log("Voice Command:", transcript);
                setLastHeard(transcript);
                processVoiceCommand(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    alert("Microphone access denied.");
                }
            };
            
            recognitionRef.current.onend = () => {
                // Auto-restart if it shouldn't have stopped
                if (isListeningRef.current) {
                    try {
                        recognitionRef.current.start();
                        console.log("Restarting speech recognition...");
                    } catch (e) {
                        console.log("Cannot restart recognition:", e);
                    }
                }
            };
        } else {
             alert("Voice commands are not supported in this browser. Try Chrome or Edge.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null; // Prevent restart on unmount
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
        };
    }, [recipeId]);

    // Timer Interval
    useEffect(() => {
        let interval = null;
        if (isTimerRunning && timer && timer.remaining > 0) {
            interval = setInterval(() => {
                setTimer(prev => ({ ...prev, remaining: prev.remaining - 1 }));
            }, 1000);
        } else if (timer && timer.remaining === 0) {
            setIsTimerRunning(false);
            // Alarm sound could go here
            speakText("Timer finished!");
            alert("Timer Done!");
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const handleLangChange = async (lang) => {
        setTargetLang(lang);
        if (lang === 'en') return;

        // Check cache
        if (!translations[currentStep]?.[lang]) {
            setIsTranslating(true);
            try {
                const text = recipe.instructions[currentStep];
                const res = await axios.post(`${API_BASE_URL}/translate`, {
                    text: text,
                    target_lang: lang
                });
                setTranslations(prev => ({
                    ...prev,
                    [currentStep]: { ...prev[currentStep] || {}, [lang]: res.data.translated_text }
                }));
            } catch (err) {
                console.error("Translation failed", err);
            } finally {
                setIsTranslating(false);
            }
        }
    };
    
    // Auto-translate when step changes if not in English
    useEffect(() => {
        if (targetLang !== 'en' && recipe) {
             handleLangChange(targetLang);
        }
    }, [currentStep, recipe]);

    const processVoiceCommand = (cmd) => {
        // Use Refs to get latest state
        const currentR = recipeRef.current;
        const currentS = stepRef.current;

        if (!currentR || !currentR.instructions) return;

        if (cmd.includes('next')) {
            if (currentS < (currentR.instructions.length - 1)) {
                setCurrentStep(prev => prev + 1);
                stopSpeaking();
            }
        }
        else if (cmd.includes('back') || cmd.includes('previous')) {
            if (currentS > 0) {
                setCurrentStep(prev => prev - 1);
                stopSpeaking();
            }
        }
        else if (cmd.includes('repeat') || cmd.includes('read')) {
             const text = currentR.instructions[currentS];
             speakText(text);
        }
        else if (cmd.includes('timer') && cmd.includes('start')) {
             // Logic repeated here or extracted? safely extract
             const stepText = currentR.instructions[currentS];
             const match = stepText.match(/(\d+)\s*min/i);
             if (match) {
                 const mins = parseInt(match[1]);
                 setTimer({ remaining: mins * 60, original: mins * 60 });
                 setIsTimerRunning(true);
                 speakText(`Starting timer for ${mins} minutes.`);
             } else {
                 speakText("No time detected in this step.");
             }
        }
        else if (cmd.includes('stop')) {
            stopSpeaking();
        }
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const speakText = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const readStep = () => {
        if (!recipe || !recipe.instructions) return;
        const text = recipe.instructions[currentStep];
        speakText(text);
    };

    const handleNext = () => {
        if (currentStep < (recipe.instructions.length - 1)) {
            setCurrentStep(prev => prev + 1);
            stopSpeaking();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            stopSpeaking();
        }
    };

    const detectAndStartTimer = () => {
         const stepText = recipe.instructions[currentStep];
         // Regex for "X minutes"
         const match = stepText.match(/(\d+)\s*min/i);
         if (match) {
             const mins = parseInt(match[1]);
             setTimer({ remaining: mins * 60, original: mins * 60 });
             setIsTimerRunning(true);
             speakText(`Starting timer for ${mins} minutes.`);
         } else {
             speakText("No time detected in this step.");
         }
    };
    
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div className="loading">Loading Recipe...</div>;
    if (!recipe) return <div className="error">Recipe not found.</div>;

    const instructions = recipe.instructions || [];
    const stepText = instructions.length > 0 ? instructions[currentStep] : "No instructions available.";
    
    const displayText = (targetLang !== 'en' && translations[currentStep]?.[targetLang]) 
                        ? translations[currentStep][targetLang] 
                        : stepText;

    // Progress
    const progress = Math.round(((currentStep + 1) / instructions.length) * 100);

    return (
        <div className="cooking-mode-container">
            <header className="cooking-header">
                <div className="language-selector">
                    <select value={targetLang} onChange={(e) => handleLangChange(e.target.value)} disabled={isTranslating}>
                        <option value="en">English</option>
                        <option value="hi">Hindi (हिंदी)</option>
                        <option value="es">Spanish (Español)</option>
                        <option value="fr">French (Français)</option>
                    </select>
                </div>
                <button onClick={() => navigate('/')} className="btn-back">← Exit</button>
                <h3 className="recipe-title">{recipe.name}</h3>
                <button 
                    className={`btn-mic ${isListening ? 'active' : ''}`} 
                    onClick={toggleListening}
                    title="Voice Commands: Next, Back, Repeat, Start Timer"
                >
                    {isListening ? '🎙️ Listening...' : '🎙️ Mic Off'}
                </button>
            </header>
            
            {/* Voice Debug Info */}
            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', height: '1.2rem' }}>
                {isListening && lastHeard && <span>Heard: "{lastHeard}"</span>}
            </div>

            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">Step {currentStep + 1} of {instructions.length}</div>

            <main className="step-display">
                <div className="step-content">
                    {isTranslating ? <span className="translating-spinner">Translating...</span> :  displayText}
                </div>
            </main>

            {/* Timer Overlay/Panel */}
            {timer && (
                <div className="timer-panel">
                    <span className="timer-display">{formatTime(timer.remaining)}</span>
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)}>
                        {isTimerRunning ? '⏸' : '▶'}
                    </button>
                    <button onClick={() => setTimer(null)}>❌</button>
                </div>
            )}

            <footer className="cooking-controls">
                <button onClick={handlePrev} disabled={currentStep === 0} className="btn-control">Previous</button>
                <div className="center-controls">
                    <button onClick={readStep} className="btn-speak">{isSpeaking ? '🔊' : '🔈'} Read</button>
                     {/* Detect Timer Button */}
                    {stepText.match(/(\d+)\s*min/i) && !timer && (
                        <button onClick={detectAndStartTimer} className="btn-timer-suggest">
                            ⏱ Start {stepText.match(/(\d+)\s*min/i)[1]}m Timer
                        </button>
                    )}
                </div>
                <button onClick={handleNext} disabled={currentStep === instructions.length - 1} className="btn-control">Next</button>
            </footer>
            
            <style>{`
                .cooking-mode-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: #1a1a1a;
                    color: white;
                    font-family: 'Inter', sans-serif;
                }
                .cooking-header {
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #2a2a2a;
                    gap: 1rem;
                }
                .recipe-title {
                    flex: 1;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .language-selector select {
                    background: #444;
                    color: white;
                    border: 1px solid #666;
                    padding: 0.5rem;
                    border-radius: 4px;
                }
                .btn-back, .btn-mic {
                    background: none;
                    border: 1px solid #444;
                    color: #fff;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .btn-mic.active {
                    background: #ef4444;
                    border-color: #ef4444;
                }
                .progress-bar-container {
                    height: 6px;
                    background: #333;
                    width: 100%;
                }
                .progress-bar {
                    height: 100%;
                    background: #10b981;
                    transition: width 0.3s;
                }
                .progress-text {
                    text-align: right;
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    color: #888;
                }
                .step-display {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    text-align: center;
                }
                .step-content {
                    font-size: 2rem;
                    line-height: 1.5;
                    max-width: 800px;
                }
                .translating-spinner {
                    color: #fbbf24;
                    font-style: italic;
                }
                .cooking-controls {
                    padding: 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #2a2a2a;
                }
                .btn-control {
                    font-size: 1.2rem;
                    padding: 1rem 2rem;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .btn-control:disabled {
                    background: #444;
                    cursor: not-allowed;
                }
                .center-controls {
                    display: flex;
                    gap: 1rem;
                }
                .btn-speak, .btn-timer-suggest {
                    background: #4b5563;
                    color: white;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .timer-panel {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #000;
                    border: 2px solid #10b981;
                    padding: 1rem;
                    border-radius: 10px;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                .timer-display {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #10b981;
                }
            `}</style>
        </div>
    );
};

export default CookingMode;

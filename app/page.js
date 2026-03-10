"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowRight, Loader2, Sparkles, Upload, Search, Leaf, Shield, FlaskConical, Stethoscope, Mail, MapPin, Phone, X, Menu, BookOpen, MessageSquare } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { featuredPlants } from "./data/plantsList";
import { translations } from "./i18n";

// Color palette for plant card gradients
const PLANT_COLORS = [
    ['#134e4a', '#0d9488'], ['#14532d', '#22c55e'], ['#1e3a29', '#34d399'],
    ['#312e81', '#6366f1'], ['#4a1942', '#c026d3'], ['#713f12', '#eab308'],
    ['#7c2d12', '#f97316'], ['#1e3a5f', '#3b82f6'], ['#3b1a2e', '#ec4899'],
    ['#1a2e1a', '#4ade80'], ['#2d2006', '#d4a853'], ['#0c4a6e', '#38bdf8'],
    ['#064e3b', '#10b981'], ['#1c1917', '#a8a29e'], ['#365314', '#84cc16'],
    ['#1e1b4b', '#818cf8'], ['#450a0a', '#ef4444'], ['#422006', '#f59e0b'],
    ['#0f172a', '#94a3b8'], ['#0e4429', '#2dd4a8'], ['#1a1a2e', '#7c3aed'],
    ['#0c3547', '#06b6d4'], ['#1a2e05', '#a3e635'], ['#2e1065', '#a855f7'],
    ['#0a290a', '#16a34a'], ['#3d0c02', '#dc2626'], ['#1f2937', '#6b7280'],
    ['#172554', '#60a5fa']
];

export default function Home() {
    const router = useRouter();
    const { language, changeLanguage } = useLanguage();

    const [mounted, setMounted] = useState(false);
    const [onboardingDone, setOnboardingDone] = useState(false);
    const [selectedLang, setSelectedLang] = useState(null);
    const [activeSection, setActiveSection] = useState("verify");

    const t = (key) => {
        const langData = translations[language] || translations["English"];
        return langData[key] || translations["English"][key] || key;
    };

    // File Verify
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (isCameraOpen && cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isCameraOpen) stopCamera();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCameraOpen]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            const installBtn = document.getElementById('install-pwa-btn');
            if (installBtn) installBtn.style.display = 'flex';
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setError("");
        } catch (err) {
            setError("Could not access camera. Please allow camera permissions.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
            setPreview(dataUrl);
            stopCamera();
            setError("");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    // Chatbot Library
    const [chatQuery, setChatQuery] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatError, setChatError] = useState("");

    // Library Plants Details
    const [searchQuery, setSearchQuery] = useState("");

    const languages = [
        { code: "English", native: "English", icon: "🇬🇧" },
        { code: "Telugu", native: "తెలుగు", icon: "🇮🇳" },
        { code: "Tamil", native: "தமிழ்", icon: "🇮🇳" },
        { code: "Malayalam", native: "മലയാളം", icon: "🇮🇳" },
        { code: "Kannada", native: "ಕನ್ನಡ", icon: "🇮🇳" },
        { code: "Hindi", native: "हिंदी", icon: "🇮🇳" },
        { code: "Sanskrit", native: "संस्कृतम्", icon: "📜" }
    ];

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("veda_lang");
        if (saved) {
            changeLanguage(saved);
            setOnboardingDone(true);
        }
    }, [changeLanguage]);

    const handleLangPick = (code) => {
        setSelectedLang(code);
        changeLanguage(code);
        setTimeout(() => setOnboardingDone(true), 1200);
    };

    const processFile = (f) => {
        setFile(f);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(f);
        setError("");
    };

    const triggerSearch = async (queryParam = null) => {
        const img = preview || null;
        const q = queryParam || null;
        if (!img && !q) { setError("Please upload an image or select a plant."); return; }

        setIsLoading(true);
        setError("");
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: img, query: q, language }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed.");
            localStorage.setItem("veda_plant_data", JSON.stringify(data));
            if (img) localStorage.setItem("veda_image", img.split(",")[1]);
            else localStorage.removeItem("veda_image");
            router.push("/results");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerChat = async () => {
        if (!chatQuery.trim()) { setChatError("Please enter your symptoms."); return; }

        setIsChatLoading(true);
        setChatError("");
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: chatQuery, language }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Chat failed.");

            // Wrap in array if single object returned
            localStorage.setItem("veda_plant_data", JSON.stringify(data));
            localStorage.removeItem("veda_image");
            router.push("/results");
        } catch (err) {
            setChatError(t('chatLoading'));
        } finally {
            setIsChatLoading(false);
        }
    };

    const filteredPlants = featuredPlants.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.scientific.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    if (!mounted) return null;

    if (!onboardingDone) {
        return (
            <div className="gate-wrapper">
                <div className="gate-orb gate-orb-1" />
                <div className="gate-orb gate-orb-2" />
                <div className="gate-orb gate-orb-3" />

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="gate-content"
                >
                    <div className="gate-badge">
                        <Leaf size={16} />
                        <span>VEDAVISION</span>
                    </div>

                    <h1 className="gate-title">
                        {t('gateTitle1')}<br />
                        <span className="gate-title-gold">{t('gateTitle2')}</span>
                    </h1>

                    <p className="gate-subtitle">
                        {t('gateSubtitle')}
                    </p>

                    <div className="gate-lang-grid">
                        {languages.map((lang, i) => (
                            <motion.button
                                key={lang.code}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                                onClick={() => handleLangPick(lang.code)}
                                className={`gate-lang-btn \${selectedLang === lang.code ? "selected" : ""}`}
                            >
                                <span className="gate-lang-icon">{lang.icon}</span>
                                <span className="gate-lang-native">{lang.native}</span>
                                <span className="gate-lang-code">{lang.code}</span>
                                {selectedLang === lang.code && (
                                    <motion.div
                                        layoutId="langRing"
                                        className="gate-lang-ring"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
                <style dangerouslySetInnerHTML={{
                    __html: `
                .gate-wrapper {
                    min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-deep);
                position: fixed;
                inset: 0;
                z-index: 9999;
                overflow: hidden;
                    }

                .gate-orb {
                    position: absolute;
                border-radius: 50%;
                filter: blur(80px);
                opacity: 0.4;
                animation: float 8s ease-in-out infinite;
                    }
                .gate-orb-1 {width: 500px; height: 500px; background: radial-gradient(circle, rgba(45,212,168,0.15), transparent 70%); top: -10%; left: -10%; }
                .gate-orb-2 {width: 400px; height: 400px; background: radial-gradient(circle, rgba(212,168,83,0.12), transparent 70%); bottom: -10%; right: -5%; animation-delay: -3s; }
                .gate-orb-3 {width: 300px; height: 300px; background: radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%); top: 40%; right: 20%; animation-delay: -5s; }

                .gate-content {position: relative; z-index: 10; text-align: center; max-width: 700px; padding: 2rem; }

                .gate-badge {
                    display: inline-flex; align-items: center; gap: 8px; padding: 8px 20px;
                border-radius: var(--radius-full); background: rgba(45,212,168,0.08);
                border: 1px solid rgba(45,212,168,0.15); color: var(--green);
                font-size: 0.75rem; letter-spacing: 0.15em; font-weight: 600; margin-bottom: 3rem;
                    }

                .gate-title {
                    font - size: clamp(2.8rem, 6vw, 4.5rem); line-height: 1.1;
                margin-bottom: 1.5rem; color: var(--text-primary);
                    }
                .gate-title-gold {
                    background: linear-gradient(135deg, var(--gold-light), var(--gold), #e8a849);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                    }

                .gate-subtitle {
                    font - size: 1.15rem; color: var(--text-secondary); margin-bottom: 3.5rem;
                line-height: 1.7; font-weight: 300;
                    }

                .gate-lang-grid {display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

                .gate-lang-btn {
                    position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
                width: 140px; padding: 2rem 1rem; border-radius: var(--radius-lg);
                border: 1px solid var(--border); background: rgba(255,255,255,0.02);
                cursor: pointer; transition: all 0.4s var(--ease); font-family: var(--font-body);
                color: var(--text-primary); overflow: hidden;
                    }
                .gate-lang-btn:hover {
                    border - color: var(--border-hover); background: rgba(45,212,168,0.04);
                transform: translateY(-4px); box-shadow: var(--shadow-glow);
                    }
                .gate-lang-btn.selected {border - color: var(--gold); background: var(--gold-dim); box-shadow: var(--shadow-gold-glow); }

                .gate-lang-icon {font - size: 2rem; }
                .gate-lang-native {font - family: var(--font-heading); font-size: 1.3rem; }
                .gate-lang-code {font - size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-tertiary); }

                .gate-lang-ring {position: absolute; inset: -1px; border-radius: var(--radius-lg); border: 2px solid var(--gold); pointer-events: none; }
                `}} />
            </div>
        );
    }

    return (
        <div className="landing-wrapper">
            <div className="bg-grid" />
            <div className="bg-glow bg-glow-1" />
            <div className="bg-glow bg-glow-2" />

            <nav className="fixed-nav">
                <div className="nav-brand" onClick={() => scrollTo("verify")}>
                    <img src="/icons/icon-512x512.png" alt="VedaVision Logo" className="brand-logo-img" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
                    <span className="brand-text">VedaVision</span>
                </div>
                <div className="nav-links">
                    <button className={activeSection === "verify" ? "active" : ""} onClick={() => scrollTo("verify")}>{t('navVerify')}</button>
                    <button className={activeSection === "chatbot" ? "active" : ""} onClick={() => scrollTo("chatbot")}>{t('navDiagnosis')}</button>
                    <button className={activeSection === "library" ? "active" : ""} onClick={() => scrollTo("library")}>{t('navLibrary')}</button>
                    <button className={activeSection === "contact" ? "active" : ""} onClick={() => scrollTo("contact")}>{t('navContact')}</button>
                </div>
                <div className="nav-right">
                    <button onClick={() => setOnboardingDone(false)} className="nav-lang-btn">{language}</button>
                </div>
            </nav>

            {/* CONTENT SECTIONS - CONDITIONAL RENDERING (TABBED NAVIGATION) */}
            <main className="content-container">
                {/* 1. SCAN / VERIFY SECTION */}
                {activeSection === "verify" && (
                <section id="verify" className="snap-section hero-section section-divider">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="section-content split-layout">
                        <div className="hero-text">
                            <div className="hero-badge">
                                <Shield size={16} /> {t('whoBadge')}
                            </div>
                            <h1 className="section-title">
                                {t('titleVerify')} <br /><span className="text-gradient">{t('titleVerifyHighlight')}</span>
                            </h1>
                            <p className="section-subtitle">
                                {t('subtitleVerify')}
                            </p>
                        </div>
                        <div className="hero-action">
                            <div className="glass-card scanner-card">
                                <div className="scanner-head flex justify-between items-center mb-4">
                                    <div className="flex-center gap-2">
                                        <Camera size={20} className="text-gold" />
                                        <h2 className="card-title">{t("neuralLens")}</h2>
                                    </div>
                                </div>
                                <div
                                    className={`scanner-dropzone ${isDragging ? "dragging" : ""} ${preview ? "has-preview" : ""}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
                                    onClick={() => !preview && fileInputRef.current?.click()}
                                >
                                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept="image/*" style={{ display: "none" }} />

                                    {preview ? (
                                        <img src={preview} alt="Preview" className="preview-img" />
                                    ) : (
                                        <div className="empty-state">
                                            <Upload size={32} className="text-gold mb-4 mx-auto" />
                                            <h3 className="empty-title">{t("uploadSpecimen")}</h3>
                                            <p className="empty-subtitle mb-4">{t("clickOrDrag")}</p>
                                            <div style={{ position: 'relative', zIndex: 10 }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startCamera(); }}
                                                    className="btn-camera"
                                                >
                                                    <Camera size={16} /> {t("openCamera")}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {preview && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="action-buttons mt-4">
                                            <button onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="btn-secondary" disabled={isLoading}>{t('clear')}</button>
                                            <button className="btn-primary" onClick={() => triggerSearch()} disabled={isLoading}>
                                                {isLoading ? <><Loader2 className="spin" size={18} /> {t('analyzing')}</> : <><Sparkles size={18} /> {t('analyzeBtn')}</>}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="error-alert">
                                        <Shield size={16} /> {error}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </section>
                )}

                {/* 2. CHATBOT DIAGNOSIS SECTION */}
                {activeSection === "chatbot" && (
                <section id="chatbot" className="snap-section dark-section section-divider">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="section-content text-center">
                        <div className="flex-center justify-center mb-6">
                            <Stethoscope size={48} className="text-emerald header-icon glow-emerald" />
                        </div>
                        <h2 className="section-title">{t("titleDiagnosis")}</h2>
                        <p className="section-subtitle mx-auto text-center max-w-2xl mb-12">
                            {t('subtitleDiagnosis')}
                        </p>

                        <div className="chat-container">
                            <div className="chat-input-wrapper">
                                <input
                                    type="text"
                                    value={chatQuery}
                                    onChange={(e) => setChatQuery(e.target.value)}
                                    placeholder={t('chatPlaceholder')}
                                    className="chat-input"
                                    onKeyDown={(e) => e.key === 'Enter' && triggerChat()}
                                />
                                <button className="chat-submit" onClick={triggerChat} disabled={isChatLoading} aria-label="Submit Diagnosis">
                                    {isChatLoading ? <Loader2 size={24} className="spin" /> : <Sparkles size={24} />}
                                </button>
                            </div>

                            {/* Keyword suggestion chips */}
                            <div className="keyword-chips">
                                {['fever', 'cough', 'joint pain', 'stress', 'digestion', 'skin', 'diabetes', 'hair fall', 'immunity', 'sleep'].map(kw => (
                                    <button key={kw} className="keyword-chip" onClick={() => { setChatQuery(kw); setChatError(''); }}>
                                        {kw}
                                    </button>
                                ))}
                            </div>

                            {chatError && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="error-text mt-4 flex items-center justify-center gap-2">
                                    <FlaskConical size={18} /> {chatError}
                                </motion.div>
                            )}

                            {/* Skeleton Loading State for AI Chat */}
                            <AnimatePresence>
                                {isChatLoading && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="skeleton-container">
                                        <div className="skeleton-line w-75"></div>
                                        <div className="skeleton-line w-100"></div>
                                        <div className="skeleton-line w-85"></div>
                                        <div className="skeleton-line mt-10 w-50"></div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                            <div className="skeleton-pill"></div>
                                            <div className="skeleton-pill"></div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </section>
                )}

                {/* 3. LIBRARY SECTION */}
                {activeSection === "library" && (
                <section id="library" className="snap-section relative-section section-divider">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="section-content max-w-6xl w-full">
                        <div className="flex-center justify-between mb-10 w-full">
                            <div>
                                <h2 className="section-title text-left mb-2">{t('titleLibrary')}</h2>
                                <p className="section-subtitle text-left max-w-lg mb-0 text-sm">{t('subtitleLibrary')}</p>
                            </div>
                            <div className="search-box">
                                <Search size={20} className="text-tertiary" />
                                <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                            </div>
                        </div>

                        <motion.div
                            className="plant-grid-modern"
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1 }
                                }
                            }}
                            initial="hidden"
                            animate="show"
                        >
                            {filteredPlants.map((plant, idx) => {
                                const colors = PLANT_COLORS[idx % PLANT_COLORS.length];
                                return (
                                    <motion.div
                                        key={plant.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                                        }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        onClick={() => {
                                            router.push(`/results?id=${plant.id}`);
                                        }}
                                        className="plant-card-modern"
                                    >
                                        <div className="card-top" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
                                            <img
                                                src={plant.image}
                                                alt={plant.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 1 }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                            <Leaf size={32} style={{ color: 'rgba(255,255,255,0.4)', position: 'relative', zIndex: 0 }} />
                                            <div className="card-overlay" style={{ zIndex: 2 }}></div>
                                        </div>
                                        <div className="card-bottom">
                                            <h3 className="card-bottom-title">{plant.name}</h3>
                                            <p className="card-bottom-sci">{plant.scientific}</p>
                                            <div className="card-action">{t('viewProfile')} <ArrowRight size={14} /></div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                            {filteredPlants.length === 0 && (
                                <div className="empty-library">
                                    <div className="empty-library-icon">
                                        <Leaf size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                    </div>
                                    <p style={{ fontSize: '1.1rem' }}>{t('noResults')}</p>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '8px' }}>{t('tryDifferent')}</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </section>
                )}

                {/* 4. CONTACT SECTION */}
                {activeSection === "contact" && (
                <section id="contact" className="snap-section footer-section section-divider">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="section-content split-layout items-center">
                        <div className="contact-info">
                            <h2 className="section-title mb-6">{t("titleContact")}</h2>
                            <p className="section-subtitle max-w-md mb-8">{t('subtitleContact')}</p>

                            <div className="contact-list">
                                <div className="contact-item">
                                    <div className="contact-icon"><Mail size={20} className="text-gold" /></div>
                                    <div>
                                        <h4>{t("emailUs")}</h4>
                                        <p><a href="mailto:reddycharan348@gmail.com" style={{ textDecoration: 'none', color: 'inherit' }}>reddycharan348@gmail.com</a></p>
                                    </div>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-icon"><Phone size={20} className="text-gold" /></div>
                                    <div>
                                        <h4>{t("callUs")}</h4>
                                        <p><a href="tel:9032517427" style={{ textDecoration: 'none', color: 'inherit' }}>9032517427</a></p>
                                    </div>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-icon"><MapPin size={20} className="text-gold" /></div>
                                    <div>
                                        <h4>Portfolio</h4>
                                        <p><a href="https://reddycharan.me" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--green)' }}>reddycharan.me</a></p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* PWA Install Prompt Button - only shows on devices that support it */}
                            <button 
                                id="install-pwa-btn"
                                className="hero-btn primary mb-4 mt-8 w-full justify-center shadow-glow"
                                style={{ display: 'none', background: 'linear-gradient(135deg, var(--gold), #ffb236)', color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}
                                onClick={() => {
                                    if (window.deferredPrompt) {
                                        window.deferredPrompt.prompt();
                                        window.deferredPrompt.userChoice.then((choiceResult) => {
                                            if (choiceResult.outcome === 'accepted') {
                                                console.log('User accepted the A2HS prompt');
                                            }
                                            window.deferredPrompt = null;
                                        });
                                    }
                                }}
                            >
                                <Download size={20} className="mr-2" /> Install VedaVision App
                            </button>
                        </div>
                        <div className="contact-form glass-card">
                            <div className="about-app-info mb-8 pb-6 border-b border-white border-opacity-10">
                                <h3 className="form-title mb-3 text-xl font-semibold flex items-center gap-2">
                                    <Shield size={20} className="text-gold" /> Data Authenticity
                                </h3>
                                <p className="text-sm opacity-85 leading-relaxed">
                                    VedaVision combines advanced AI with verified ancient knowledge. All plant data, uses, 
                                    and remedies are curated from <strong>AYUSH approved</strong> resources, the Ayurvedic Pharmacopoeia of India (API), 
                                    and cross-referenced with modern botanical studies to ensure safety and authenticity.
                                </p>
                            </div>

                            <h3 className="form-title mb-6 text-xl font-semibold">{t("sendMessage")}</h3>
                            <input type="text" placeholder={t('yourName')} className="form-input" />
                            <input type="email" placeholder={t('yourEmail')} className="form-input" />
                            <textarea placeholder={t('howCanWeHelp')} className="form-textarea" rows="4"></textarea>
                            <button className="btn-primary w-full shadow-glow">{t('sendBtn')}</button>
                        </div>
                    </motion.div>
                </section>
                )}
            </main>

            {/* Fullscreen Camera Overlay */}
            {isCameraOpen && (
                <div className="camera-fullscreen-overlay">
                    <div className="camera-overlay-header">
                        <div className="camera-overlay-title">
                            <Camera size={18} /> {t("neuralLens")}
                        </div>
                        <button onClick={stopCamera} className="camera-close-btn" aria-label="Close Camera">
                            <X size={22} />
                        </button>
                    </div>
                    <video ref={videoRef} autoPlay playsInline muted className="camera-video-fullscreen" />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <p className="camera-hint">{t("clickOrDrag")}</p>
                    <div className="camera-bottom-bar">
                        <button
                            onClick={capturePhoto}
                            className="camera-capture-btn"
                            aria-label="Take Photo"
                        />
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar */}
            <div className="mobile-bottom-nav">
                <button className={`mobile-nav-item ${activeSection === "verify" ? "active" : ""}`} onClick={() => scrollTo("verify")}>
                    <Camera size={20} />
                    <span>{t('navVerify')}</span>
                </button>
                <button className={`mobile-nav-item ${activeSection === "chatbot" ? "active" : ""}`} onClick={() => scrollTo("chatbot")}>
                    <Stethoscope size={20} />
                    <span>{t('navDiagnosis')}</span>
                </button>
                <button className={`mobile-nav-item ${activeSection === "library" ? "active" : ""}`} onClick={() => scrollTo("library")}>
                    <BookOpen size={20} />
                    <span>{t('navLibrary')}</span>
                </button>
                <button className={`mobile-nav-item ${activeSection === "contact" ? "active" : ""}`} onClick={() => scrollTo("contact")}>
                    <MessageSquare size={20} />
                    <span>{t('navContact')}</span>
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .landing-wrapper {
                    min-height: 100vh;
                    background: var(--bg-deep);
                    color: var(--text-primary);
                    position: relative;
                }

                /* Background Effects */
                .bg-grid {
                    position: fixed; inset: 0;
                    background-image: linear-gradient(rgba(45,212,168,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,168,0.03) 1px, transparent 1px);
                    background-size: 60px 60px; z-index: 0; pointer-events: none;
                }
                .bg-glow { position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; }
                .bg-glow-1 { width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(45,212,168,0.06), transparent 70%); top: -20%; right: -10%; }
                .bg-glow-2 { width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(212,168,83,0.04), transparent 70%); bottom: -20%; left: -10%; }

                /* Fixed Nav */
                .fixed-nav {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 1rem 3rem; background: rgba(5,10,5,0.85); backdrop-filter: blur(24px);
                    border-bottom: 1px solid rgba(255,255,255,0.05); transition: all 0.3s ease;
                }
                .nav-brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
                .brand-logo-svg { filter: drop-shadow(0 0 8px rgba(45,212,168,0.5)); transition: filter 0.3s; }
                .nav-brand:hover .brand-logo-svg { filter: drop-shadow(0 0 16px rgba(45,212,168,0.8)); }
                .brand-text { font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; }
                .nav-links { display: flex; gap: 2.5rem; }

                /* Section Dividers — make each section clearly distinct */
                .section-divider {
                    position: relative;
                }
                .section-divider::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent 5%, rgba(45,212,168,0.5) 25%, rgba(212,168,83,0.5) 50%, rgba(45,212,168,0.5) 75%, transparent 95%);
                    z-index: 20;
                }
                .section-divider::after {
                    content: ''; position: absolute; top: -20px; left: 10%; right: 10%; height: 40px;
                    background: radial-gradient(ellipse at center, rgba(45,212,168,0.06) 0%, transparent 70%);
                    z-index: 10; pointer-events: none;
                }
                .nav-links button { 
                    background: none; border: none; font-size: 0.95rem; font-weight: 500;
                    color: var(--text-tertiary); cursor: pointer; transition: 0.3s ease; position: relative;
                }
                .nav-links button:hover { color: var(--text-primary); }
                .nav-links button.active { color: var(--green); }
                .nav-links button.active::after {
                    content: ''; position: absolute; bottom: -6px; left: 0; right: 0; height: 2px;
                    background: var(--green); border-radius: 2px; box-shadow: 0 0 10px var(--green);
                }
                .nav-lang-btn {
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-secondary);
                    padding: 8px 20px; border-radius: 30px; font-size: 0.85rem; cursor: pointer; transition: 0.3s;
                }
                .nav-lang-btn:hover { border-color: var(--gold); color: white; background: rgba(212,168,83,0.1); }

                /* Snap Scrolling Container */
                .snap-container {
                    padding-top: 80px; 
                    /* We don't strict-snap to allow smooth free scroll, but we organize the sections as 100min-vh */
                }
                .snap-section {
                    min-height: calc(100vh - 80px); display: flex; align-items: center; justify-content: center;
                    padding: 6rem 3rem; position: relative; z-index: 10;
                }
                
                .section-content { width: 100%; max-width: 1400px; display: flex; flex-direction: column; }
                .split-layout { flex-direction: row; gap: 6rem; align-items: center; justify-content: space-between; }
                .split-layout > div { flex: 1; }

                /* Typography */
                .section-title { font-size: clamp(3rem, 5vw, 4.5rem); font-family: var(--font-heading); line-height: 1.1; margin-bottom: 1.5rem; }
                .section-subtitle { font-size: 1.15rem; color: var(--text-secondary); line-height: 1.7; font-weight: 300; }
                .text-gradient { background: linear-gradient(135deg, var(--green), var(--emerald), var(--green-light)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .text-gold { color: var(--gold); }
                .text-emerald { color: var(--emerald); }
                .text-tertiary { color: var(--text-tertiary); }
                .text-green { color: var(--green); }
                
                .header-icon { filter: drop-shadow(0 0 20px rgba(45,212,168,0.4)); }
                .flex-center { display: flex; align-items: center; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mb-10 { margin-bottom: 2.5rem; }
                .mb-12 { margin-bottom: 3rem; }
                .mt-4 { margin-top: 1rem; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .gap-2 { gap: 0.5rem; }
                .w-full { width: 100%; }
                .max-w-2xl { max-w: 42rem; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
                .italic { font-style: italic; }

                /* Buttons & Cards */
                .hero-badge {
                    display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px;
                    border-radius: 30px; background: rgba(45,212,168,0.06); border: 1px solid rgba(45,212,168,0.2);
                    color: var(--green); font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2rem; font-weight: 600;
                }

                .glass-card {
                    background: rgba(10,15,10,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;
                    padding: 2.5rem; backdrop-filter: blur(20px); box-shadow: 0 30px 60px rgba(0,0,0,0.5); position: relative;
                }
                .glass-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(45,212,168,0.5), rgba(212,168,83,0.5), transparent);
                }
                
                .scanner-card { max-width: 500px; margin-left: auto; }
                .card-title { font-size: 1.25rem; font-weight: 600; font-family: var(--font-heading); }
                .scanner-dropzone {
                    width: 100%; aspect-ratio: 4/3; border: 2px dashed rgba(255,255,255,0.1); border-radius: 16px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.4s ease;
                    background: rgba(255,255,255,0.02); overflow: hidden; margin-top: 1.5rem;
                }
                .scanner-dropzone:hover { border-color: rgba(45,212,168,0.4); background: rgba(45,212,168,0.05); }
                .scanner-dropzone.dragging { border-color: var(--gold); background: rgba(212,168,83,0.1); transform: scale(1.02); }
                
                .empty-state { text-align: center; }
                .empty-title { font-size: 1.1rem; color: #fff; margin-bottom: 4px; }
                .empty-subtitle { font-size: 0.85rem; color: var(--text-tertiary); }
                .preview-img { width: 100%; height: 100%; object-fit: cover; }
                .action-buttons { display: flex; gap: 1rem; }
                .action-buttons button { flex: 1; padding: 14px; border-radius: 12px; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 8px; transition: 0.3s; cursor: pointer; font-family: var(--font-body); }
                .btn-primary { background: linear-gradient(135deg, var(--green), #047857); color: white; border: none; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(16,185,129,0.3); }
                .btn-primary:disabled { opacity: 0.6; cursor: wait; }
                .btn-secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border); }
                .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
                .error-text { background: rgba(239,68,68,0.1); color: #f87171; padding: 12px; border-radius: 8px; font-size: 0.9rem; text-align: center; border: 1px solid rgba(239,68,68,0.2); }
                .error-alert { display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(239,68,68,0.1); color: #f87171; padding: 12px; border-radius: 8px; font-size: 0.95rem; text-align: center; border: 1px solid rgba(239,68,68,0.2); margin-top: 1rem; width: 100%; max-width: 400px; margin-left: auto; margin-right: auto; }

                /* Camera Fullscreen Overlay */
                .camera-fullscreen-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; background: #000; display: flex; flex-direction: column; }
                .camera-overlay-header { position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent); }
                .camera-overlay-title { color: #fff; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .camera-close-btn { background: rgba(255,255,255,0.15); border: none; padding: 10px; border-radius: 50%; cursor: pointer; transition: 0.3s; color: #fff; backdrop-filter: blur(8px); }
                .camera-close-btn:hover { background: rgba(255,255,255,0.25); }
                .camera-video-fullscreen { flex: 1; width: 100%; height: 100%; object-fit: cover; }
                .camera-bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; z-index: 10; display: flex; justify-content: center; align-items: center; padding: 32px 20px 48px; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }
                .camera-capture-btn { width: 72px; height: 72px; background: #fff; border-radius: 50%; border: 5px solid rgba(255,255,255,0.4); box-shadow: 0 4px 20px rgba(0,0,0,0.5); cursor: pointer; transition: 0.2s; }
                .camera-capture-btn:hover { transform: scale(1.08); }
                .camera-capture-btn:active { transform: scale(0.95); background: #ddd; }
                .camera-hint { position: absolute; bottom: 120px; left: 0; right: 0; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.85rem; }
                .btn-camera { padding: 10px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.3s; margin: 0 auto; }
                .btn-camera:hover { background: rgba(255,255,255,0.1); }

                /* Skeleton Loader */
                .skeleton-container { max-width: 600px; margin: 2rem auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; }
                .skeleton-line { height: 16px; background: rgba(255,255,255,0.1); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out; }
                .w-100 { width: 100%; } .w-85 { width: 85%; } .w-75 { width: 75%; } .w-50 { width: 50%; } .mt-10 { margin-top: 10px; }
                .skeleton-pill { height: 32px; width: 90px; background: rgba(255,255,255,0.1); border-radius: 20px; animation: pulse 1.5s infinite ease-in-out; }
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }

                /* Hover Overlay */
                .card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.1); opacity: 0; transition: opacity 0.3s; backdrop-filter: blur(2px); }
                .plant-card-modern:hover .card-overlay { opacity: 1; }

                /* Library Empty State */
                .empty-library { grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-tertiary); }
                .empty-library-icon { margin: 0 auto 1rem; width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }

                /* Chatbot Diagnosis */
                .dark-section { background: radial-gradient(circle at center, rgba(16,185,129,0.05) 0%, transparent 60%); }
                .chat-container { max-width: 800px; margin: 0 auto; width: 100%; }
                .keyword-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
                .keyword-chip {
                    padding: 6px 16px; border-radius: 30px; background: rgba(45,212,168,0.06);
                    border: 1px solid rgba(45,212,168,0.2); color: rgba(45,212,168,0.8);
                    font-size: 0.78rem; cursor: pointer; transition: all 0.25s ease;
                    font-family: var(--font-body); letter-spacing: 0.03em;
                }
                .keyword-chip:hover { background: rgba(45,212,168,0.15); border-color: rgba(45,212,168,0.5); color: #2dd4a8; transform: translateY(-2px); }
                .chat-input-wrapper {
                     display: flex; align-items: center; background: rgba(0,0,0,0.5); border: 1px solid rgba(45,212,168,0.3);
                     border-radius: 40px; padding: 8px 12px 8px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(45,212,168,0.05);
                     transition: border-color 0.3s, box-shadow 0.3s;
                }
                .chat-input-wrapper:focus-within { border-color: var(--green); box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(45,212,168,0.2); }
                .chat-input {
                     flex: 1; background: transparent; border: none; outline: none; color: white;
                     font-size: 1.25rem; font-weight: 300; font-family: var(--font-body);
                }
                .chat-input::placeholder { color: rgba(255,255,255,0.3); }
                .chat-submit {
                     background: linear-gradient(135deg, var(--green), #047857); border: none; width: 60px; height: 60px;
                     border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;
                     cursor: pointer; transition: 0.3s; flex-shrink: 0; box-shadow: 0 0 20px rgba(16,185,129,0.4);
                }
                .chat-submit:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 0 30px rgba(16,185,129,0.6); }

                /* Library Grid */
                .search-box {
                     display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); 
                     border: 1px solid var(--border); padding: 14px 24px; border-radius: 30px; width: 400px;
                     transition: 0.3s ease;
                }
                .search-box:focus-within { border-color: var(--green); box-shadow: 0 0 20px rgba(45,212,168,0.1); }
                .search-input { flex: 1; background: transparent; border: none; outline: none; color: white; font-size: 1rem; }
                
                .plant-grid-modern {
                     display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem;
                }
                .plant-card-modern {
                    background: rgba(10,15,10,0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px;
                    overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: 0.3s ease;
                }
                .plant-card-modern:hover { border-color: rgba(45,212,168,0.3); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                .card-top { height: 160px; display: flex; align-items: center; justify-content: center; position: relative; }
                .card-bottom { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
                .card-bottom-title { font-family: var(--font-heading); font-size: 1.35rem; margin-bottom: 4px; font-weight: 600; }
                .card-bottom-sci { font-size: 0.9rem; color: var(--text-tertiary); font-style: italic; margin-bottom: 1.5rem; }
                .card-action { margin-top: auto; display: flex; align-items: center; gap: 8px; color: var(--green); font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

                /* Contact Section */
                .footer-section { border-top: 1px solid rgba(255,255,255,0.05); background: linear-gradient(180deg, transparent, rgba(16,185,129,0.03)); }
                .contact-info { flex: 1; }
                .contact-list { display: flex; flex-direction: column; gap: 2rem; }
                .contact-item { display: flex; align-items: flex-start; gap: 1rem; }
                .contact-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(212,168,83,0.1); border: 1px solid rgba(212,168,83,0.2); display: flex; align-items: center; justify-content: center; }
                .contact-item h4 { font-size: 1.1rem; color: white; margin-bottom: 4px; font-weight: 500; }
                .contact-item p { color: var(--text-tertiary); line-height: 1.5; }

                .contact-form { flex: 0.8; }
                .form-input, .form-textarea {
                    width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                    color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 1.5rem; outline: none; transition: 0.3s;
                    font-family: var(--font-body); font-size: 1rem;
                }
                .form-textarea { resize: vertical; }
                .form-input:focus, .form-textarea:focus { border-color: var(--green); box-shadow: inset 0 0 10px rgba(45,212,168,0.1); }
                .shadow-glow { box-shadow: 0 10px 25px rgba(16,185,129,0.2); border-radius: 12px; padding: 16px; font-size: 1.1rem; }

                @media (max-width: 1024px) {
                    .split-layout { flex-direction: column; gap: 4rem; text-align: center; }
                    .split-layout > div { width: 100%; }
                    .hero-badge { margin: 0 auto 2rem auto; }
                    .section-title.text-left { text-align: center; }
                    .section-subtitle.text-left { text-align: center; margin-left: auto; margin-right: auto; }
                    .search-box { width: 100%; max-width: 400px; margin: 2rem auto; }
                    .flex-center.justify-between.mb-10 { flex-direction: column; align-items: stretch; text-align: center; }
                    .scanner-card { margin: 0 auto; }
                    .contact-item { text-align: left; }
                }

                .mobile-bottom-nav { display: none; }

                @media (max-width: 768px) {
                    .fixed-nav { padding: 1rem; justify-content: space-between; }
                    .nav-links { display: none; }
                    .snap-section { padding: 4rem 1.5rem; min-height: auto; }
                    .section-title { font-size: 2.5rem; }
                    .chat-input { font-size: 1rem; }
                    
                    /* Show Bottom Nav and pad main content */
                    .mobile-bottom-nav {
                        display: flex; position: fixed; bottom: 0; left: 0; right: 0;
                        background: rgba(10, 15, 10, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.05);
                        z-index: 999; padding-bottom: env(safe-area-inset-bottom);
                        justify-content: space-around; align-items: center; height: 70px;
                    }
                    .mobile-nav-item {
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        gap: 4px; color: var(--text-tertiary); background: none; border: none; flex: 1; height: 100%;
                        cursor: pointer; transition: 0.3s;
                    }
                    .mobile-nav-item span { font-size: 0.7rem; font-weight: 500; }
                    .mobile-nav-item.active { color: var(--green); }
                    .mobile-nav-item.active svg { filter: drop-shadow(0 0 8px rgba(45,212,168,0.5)); transform: translateY(-2px); }
                    
                    .snap-container { padding-bottom: 80px; } /* Space for bottom nav */
                    .action-buttons { flex-direction: column; }
                }
            `}} />
        </div>
    );
}

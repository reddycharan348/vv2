"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "../LanguageContext";
import { X, Leaf, Shield, FlaskConical, AlertTriangle, Pill, BookOpen, Beaker, Heart, ArrowLeft, Volume2, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { featuredPlants } from "../data/plantsList";
import { translations } from "../i18n";

// Helper to resolve both camelCase and snake_case keys
function r(data, ...keys) {
    for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null) return data[key];
    }
    return null;
}

const renderTextOrArray = (data) => {
    if (!data) return null;

    // Handle arrays
    if (Array.isArray(data)) {
        return (
            <ul className="points-list">
                {data.map((pt, i) => {
                    if (typeof pt === 'object' && pt !== null) {
                        // Render object items (e.g., active compounds)
                        return (
                            <li key={i}>
                                {Object.entries(pt).map(([k, v]) => (
                                    <span key={k}><strong>{k}:</strong> {String(v)} </span>
                                ))}
                            </li>
                        );
                    }
                    // Check if item has a "Label: Value" pattern
                    const colonIdx = String(pt).indexOf(':');
                    if (colonIdx > 0 && colonIdx < 60) {
                        const label = String(pt).substring(0, colonIdx);
                        const value = String(pt).substring(colonIdx + 1).trim();
                        return <li key={i}><strong>{label}:</strong> {value}</li>;
                    }
                    return <li key={i}>{pt}</li>;
                })}
            </ul>
        );
    }

    // Handle objects (like dosages or ayurvedic_properties)
    if (typeof data === 'object' && data !== null) {
        return (
            <ul className="points-list">
                {Object.entries(data).map(([key, value], i) => (
                    <li key={i}><strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</li>
                ))}
            </ul>
        );
    }

    // Handle strings — try to split into bullet points
    if (typeof data === 'string') {
        // Split on || separator (from Google Translate joined arrays)
        if (data.includes(' || ')) {
            const pts = data.split(' || ').map(s => s.trim()).filter(Boolean);
            return (
                <ul className="points-list">
                    {pts.map((pt, i) => {
                        const colonIdx = pt.indexOf(':');
                        if (colonIdx > 0 && colonIdx < 60) {
                            return <li key={i}><strong>{pt.substring(0, colonIdx)}:</strong> {pt.substring(colonIdx + 1).trim()}</li>;
                        }
                        return <li key={i}>{pt}</li>;
                    })}
                </ul>
            );
        }

        // Split on '. ' for multi-sentence text (3+ sentences)
        const sentences = data.split(/(?<=\.)\s+/).filter(s => s.trim().length > 5);
        if (sentences.length > 2) {
            return (
                <ul className="points-list">
                    {sentences.map((pt, i) => {
                        const colonIdx = pt.indexOf(':');
                        if (colonIdx > 0 && colonIdx < 60) {
                            return <li key={i}><strong>{pt.substring(0, colonIdx)}:</strong> {pt.substring(colonIdx + 1).trim()}</li>;
                        }
                        return <li key={i}>{pt.trim()}</li>;
                    })}
                </ul>
            );
        }

        return <p className="card-text">{data}</p>;
    }

    return <p className="card-text">{String(data)}</p>;
};

function ResultsContent() {
    const [data, setData] = useState(null);
    const [imgSrc, setImgSrc] = useState("");
    const [loadingMessage, setLoadingMessage] = useState("Accessing Ayurvedic Manuscripts...");
    const { language } = useLanguage();
    const t = (key) => {
        const langData = translations[language] || translations['English'];
        return langData[key] || translations['English'][key] || key;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        const id = searchParams.get('id');
        
        async function fetchById() {
            setLoadingMessage(`Translating to ${language}...`);
            try {
                const res = await fetch(`/api/plant?id=${id}&lang=${language}`);
                if (!res.ok) throw new Error("Plant not found");
                const fetchedData = await res.json();
                setData(fetchedData);
                
                // See if we have it in our static list for the high-res image
                const staticPlant = featuredPlants.find(p => p.id === id);
                if (staticPlant) {
                    setImgSrc(staticPlant.image);
                }
            } catch (e) {
                router.push("/");
            }
        }

        if (id) {
            fetchById();
        } else {
            const raw = localStorage.getItem("veda_plant_data");
            if (!raw) { router.push("/"); return; }
            try { setData(JSON.parse(raw)); } catch { router.push("/"); return; }

            const b64 = localStorage.getItem("veda_image");
            if (b64) setImgSrc("data:image/jpeg;base64," + b64);
        }
    }, [router, searchParams, language]);

    if (!data) return (
        <div className="results-loading">
            <div className="loading-spinner-wrapper">
                <div className="loading-spinner" />
                <Leaf className="loading-leaf" size={24} />
            </div>
            <p className="loading-message">{loadingMessage}</p>
            <style dangerouslySetInnerHTML={{
                __html: `
                .results-loading {
                    min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: var(--bg-deep, #050a05); gap: 2rem;
                }
                .loading-spinner-wrapper { position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
                .loading-spinner {
                    position: absolute; width: 100%; height: 100%; border-radius: 50%;
                    border: 3px solid rgba(45,212,168,0.15); border-top-color: #2dd4a8;
                    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
                }
                .loading-leaf { color: #2dd4a8; animation: pulse 2s infinite ease-in-out; }
                .loading-message { color: rgba(255,255,255,0.7); font-family: var(--font-body, 'Inter', sans-serif); letter-spacing: 0.05em; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.5; scale: 0.9; } 50% { opacity: 1; scale: 1.1; } }
            `}} />
        </div>
    );

    // Graceful resolvers to support legacy format, our first nested format, and the NEW "Agastya" nested format
    const summary = data.summary || {};
    const details = data.details || {};
    const usage = data.usage || {};
    const safety = data.safety || {};

    const plantData = data.plant || {};
    
    // Plant Name
    const plantName = summary.name || plantData.common_names?.[0] || plantData.ayurveda_names?.[0] || r(data, 'name') || "Unknown Plant";
    const scientificName = summary.scientific_name || plantData.scientific_name || r(data, 'scientific_name', 'scientificName') || "";
    const family = summary.family || plantData.family || r(data, 'family', 'botanicalFamily') || "";
    const description = details.plant_profile?.history || plantData.description || r(data, 'description') || "";
    const usageForm = summary.main_preparations?.join(', ') || plantData.usage_form || r(data, 'usage_form', 'usageForm') || "";

    // Plant Profile Raw string
    const plantProfileArr = r(data, 'plant_profile', 'plantProfile');
    const plantProfile = (typeof plantProfileArr === 'object' && plantProfileArr !== null) ? Object.values(plantProfileArr).join(' ') : plantProfileArr || "";

    // Preparation Methods
    let prepMethods = "";
    if (usage.preparation_methods && typeof usage.preparation_methods === 'object') {
        prepMethods = Object.entries(usage.preparation_methods).map(([k,v]) => `${k.replace(/_/g,' ')}: ${v}`);
    } else {
        const prepMethodsRaw = r(data, 'preparation_methods', 'preparationMethods') || "";
        prepMethods = (typeof prepMethodsRaw === 'object' && prepMethodsRaw !== null && !Array.isArray(prepMethodsRaw)) 
            ? Object.values(prepMethodsRaw).map(v => v.method || v).filter(Boolean) 
            : prepMethodsRaw;
    }

    // Main Uses
    let mainUses = "";
    if (details.medicinal_uses && typeof details.medicinal_uses === "object" && details.medicinal_uses !== null) {
        mainUses = Object.entries(details.medicinal_uses).map(([k,v]) => `${k.replace(/_/g,' ')}: ${v}`);
    } else {
        mainUses = r(data, 'medicinal_uses', 'main_medicinal_uses', 'mainMedicinalUses') || "";
    }
    
    // Ayurvedic properties
    const ayurvedicPropsRaw = details.ayurvedic_properties || r(data, 'ayurvedic_properties') || null;
    const ayurvedicProps = ayurvedicPropsRaw ? Object.entries(ayurvedicPropsRaw).map(([k, v]) => `${k.replace('_', ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`) : null;

    // Three / Key uses
    const threeUses = summary.key_uses || r(data, 'three_main_uses', 'usesInAyurveda') || (ayurvedicPropsRaw?.dosha_modulation ? [ayurvedicPropsRaw.dosha_modulation] : ayurvedicPropsRaw?.dosha_karma ? [ayurvedicPropsRaw.dosha_karma] : []);

    // Dosages
    const dosages = usage.dosage || r(data, 'dosage', 'dosages') || {};
    const safetyProfileRaw = r(data, 'safety_profile', 'safetyProfile') || "";
    const aiExplanation = r(data, 'ai_recommendation_explanation');

    const doseChildren = dosages.children || dosages.Children || "Consult physician";
    const doseAdults = dosages.adults || dosages.Adults || "Consult physician";
    const doseElderly = dosages.elderly || dosages.Elderly || "Consult physician";

    // Safety and Warnings
    const contraindications = safety.contraindications || safetyProfileRaw?.intraindications || safetyProfileRaw?.contraindications || r(data, 'contraindications') || [];
    const drugInteractions = safety.drug_interactions || safetyProfileRaw?.drug_interactions || r(data, 'drug_interactions') || [];
    const sideEffects = safety.side_effects || safetyProfileRaw?.possible_side_effects || [];
    
    let safetyProfile = "";
    if (safety.toxicity_notes) {
        // Agastya format fallback
        safetyProfile = [safety.toxicity_notes, ...sideEffects].filter(Boolean);
    } else if (typeof safetyProfileRaw === 'object' && !Array.isArray(safetyProfileRaw)) {
        safetyProfile = [safetyProfileRaw.warning, safetyProfileRaw.medical_supervision, ...sideEffects].filter(Boolean);
    } else {
        safetyProfile = safetyProfileRaw;
    }

    const activeCompounds = details.chemical_profile?.key_compounds || details.chemical_profile?.phytochemicals || r(data, 'active_compounds') || [];
    const medicinalUses = r(data, 'medicinal_uses') || null;
    const references = details.standardization?.api_reference ? { ayush_ref: details.standardization.api_reference } : r(data, 'references') || null;

    const fadeUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    };

    const handleReadAloud = () => {
        if (!('speechSynthesis' in window)) {
            alert("Sorry, your browser doesn't support text to speech!");
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Construct the text using TRANSLATED labels so voices read in the right language
        let textToRead = `${t('audioPlantName')}: ${plantName}. `;
        if (scientificName) textToRead += `${t('audioSciName')}: ${scientificName}. `;

        if (aiExplanation) {
            textToRead += `${t('audioAiAnalysis')}: ${aiExplanation}. `;
        }

        if (mainUses) {
            textToRead += `${t('audioMainUses')}: ${mainUses}. `;
        }

        if (threeUses && threeUses.length > 0) {
            textToRead += `${t('audioBenefits')}: ${threeUses.join('. ')}. `;
        }

        if (prepMethods) {
            textToRead += `${t('audioPreparation')}: ${prepMethods}. `;
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);

        // Map language to BCP-47 voice codes
        const langMap = {
            "English": "en-US",
            "Hindi": "hi-IN",
            "Telugu": "te-IN",
            "Tamil": "ta-IN",
            "Malayalam": "ml-IN",
            "Kannada": "kn-IN",
            "Sanskrit": "hi-IN"
        };

        const targetLang = langMap[language] || "en-US";
        utterance.lang = targetLang;

        // Try to find a matching voice for the language
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang === targetLang || v.lang.startsWith(targetLang.split('-')[0]));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.rate = 0.9;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <main className="results-page">
            {/* Action Bar (Top) */}
            <div className="action-bar top-action-bar">
                <button className="back-btn" onClick={() => {
                    if (isSpeaking) window.speechSynthesis.cancel();
                    router.push("/");
                }}>
                    <ArrowLeft size={18} /> {t('resBack')}
                </button>
                <button className={`read-aloud-btn ${isSpeaking ? 'active' : ''}`} onClick={handleReadAloud}>
                    <Volume2 size={18} /> {isSpeaking ? t('stopReading') : t('readAloud')}
                </button>
            </div>

            {/* Hero Section */}
            <section className="results-hero">
                <div className="hero-bg-orb hero-orb-1" />
                <div className="hero-bg-orb hero-orb-2" />

                <div className="hero-inner">
                    {imgSrc ? (
                        <motion.div {...fadeUp} className="hero-image-wrap">
                            <img src={imgSrc} alt={plantName} className="hero-image" />
                            <div className="image-glow" />
                        </motion.div>
                    ) : (
                        <motion.div {...fadeUp} className="hero-fallback">
                            <Leaf size={64} style={{ color: 'rgba(45,212,168,0.3)' }} />
                        </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hero-text">
                        <div className="hero-badge">
                            <Shield size={14} /> {t('resVerified')}
                        </div>
                        <h1 className="hero-plant-name">{plantName}</h1>
                        {scientificName && <p className="hero-sci-name"><em>{scientificName}</em></p>}
                        {family && <p className="hero-family">{t('resFamily')}: {family}</p>}

                        {aiExplanation && (
                            <div className="ai-explanation">
                                <Leaf size={16} />
                                <p><strong>{t('resAiRecommendation')}:</strong> {aiExplanation}</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Content Grid */}
            <section className="results-grid">
                {/* Profile Card */}
                {(plantProfile || description) && (
                    <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="result-card card-full">
                        <div className="card-header">
                            <BookOpen size={20} className="card-icon" />
                            <h2>{t('resProfile')}</h2>
                        </div>
                        {renderTextOrArray(plantProfile || description)}
                        {habitat && <p className="card-detail"><strong>{t('resHabitat')}:</strong> {habitat}</p>}
                        {partsUsed && <p className="card-detail"><strong>{t('resPartsUsed')}:</strong> {partsUsed}</p>}
                    </motion.div>
                )}

                {/* Ayurvedic Properties */}
                {ayurvedicProps && (
                    <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="result-card">
                        <div className="card-header">
                            <Leaf size={20} className="card-icon icon-green" />
                            <h2>{t('resAyurvedic')}</h2>
                        </div>
                        {ayurvedicProps.rasa && <p className="card-detail"><strong>{t('resRasa')}:</strong> {ayurvedicProps.rasa}</p>}
                        {ayurvedicProps.guna && <p className="card-detail"><strong>{t('resGuna')}:</strong> {ayurvedicProps.guna}</p>}
                        {ayurvedicProps.virya && <p className="card-detail"><strong>{t('resVirya')}:</strong> {ayurvedicProps.virya}</p>}
                        {ayurvedicProps.vipaka && <p className="card-detail"><strong>{t('resVipaka')}:</strong> {ayurvedicProps.vipaka}</p>}
                        {ayurvedicProps.dosha_effect && <p className="card-detail"><strong>{t('resDoshaEffect')}:</strong> {ayurvedicProps.dosha_effect}</p>}
                    </motion.div>
                )}

                {/* Therapeutic Uses */}
                <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="result-card">
                    <div className="card-header">
                        <Heart size={20} className="card-icon icon-rose" />
                        <h2>{t('resTherapeutic')}</h2>
                    </div>
                    {renderTextOrArray(mainUses)}
                    {threeUses.length > 0 && (
                        <ul className="uses-list">
                            {threeUses.map((use, i) => (
                                <li key={i}><span className="use-number">{String(i + 1).padStart(2, '0')}</span> {use}</li>
                            ))}
                        </ul>
                    )}
                    {medicinalUses?.primary_uses && medicinalUses.primary_uses.length > 0 && (
                        <>
                            <h3 className="sub-heading">{t('resPrimaryUses')}</h3>
                            <ul className="uses-list">
                                {medicinalUses.primary_uses.map((u, i) => (
                                    <li key={i}><span className="use-number">{String(i + 1).padStart(2, '0')}</span> {u}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </motion.div>

                {/* Preparation & Dosage */}
                <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="result-card">
                    <div className="card-header">
                        <Beaker size={20} className="card-icon icon-amber" />
                        <h2>{t('resPrep')}</h2>
                    </div>
                    {renderTextOrArray(prepMethods)}
                    {usageForm && <p className="card-detail"><strong>{t('resCommonForms')}:</strong> {usageForm}</p>}

                    <div className="dosage-grid">
                        <div className="dosage-item">
                            <span className="dosage-label">{t('resAdults')}</span>
                            <span className="dosage-value">{doseAdults}</span>
                        </div>
                        <div className="dosage-item">
                            <span className="dosage-label">{t('resChildren')}</span>
                            <span className="dosage-value">{doseChildren}</span>
                        </div>
                        <div className="dosage-item">
                            <span className="dosage-label">{t('resElderly')}</span>
                            <span className="dosage-value">{doseElderly}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Active Compounds */}
                {activeCompounds.length > 0 && (
                    <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="result-card">
                        <div className="card-header">
                            <FlaskConical size={20} className="card-icon icon-violet" />
                            <h2>{t('resCompounds')}</h2>
                        </div>
                        <div className="compounds-grid">
                            {activeCompounds.map((compound, i) => (
                                <div key={i} className="compound-chip">{compound}</div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Safety & Contraindications */}
                <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="result-card card-safety">
                    <div className="card-header">
                        <AlertTriangle size={20} className="card-icon icon-warn" />
                        <h2>{t('resSafety')}</h2>
                    </div>
                    {renderTextOrArray(safetyProfile)}
                    {contraindications.length > 0 && (
                        <ul className="warn-list">
                            {contraindications.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                    )}
                    {drugInteractions.length > 0 && (
                        <>
                            <h3 className="sub-heading">{t('resDrugInteractions')}</h3>
                            <ul className="warn-list">
                                {drugInteractions.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </>
                    )}
                </motion.div>

                {/* References */}
                {references && (
                    <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="result-card card-full card-refs">
                        <div className="card-header">
                            <BookOpen size={20} className="card-icon" />
                            <h2>{t('resRefs')}</h2>
                        </div>
                        <div className="refs-grid">
                            {references.who_monograph && <div className="ref-item"><strong>{t('resWhoMonograph')}:</strong> {references.who_monograph}</div>}
                            {references.ayush_ref && <div className="ref-item"><strong>{t('resAyushRef')}:</strong> {references.ayush_ref}</div>}
                            {references.pharmacopoeia && <div className="ref-item"><strong>{t('resPharmacopoeia')}:</strong> {references.pharmacopoeia}</div>}
                            {references.clinical_studies && references.clinical_studies.length > 0 && (
                                <div className="ref-item studies">
                                    <strong>{t('resClinicalStudies')}:</strong>
                                    <ul>{references.clinical_studies.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </section>

            <style dangerouslySetInnerHTML={{
                __html: `
                .results-page {
                    min-height: 100vh;
                    background: var(--bg-deep, #050a05);
                    color: var(--text-primary, #e8e6e3);
                    font-family: var(--font-body, 'Inter', sans-serif);
                    padding-bottom: 6rem;
                }

                /* Actions */
                .top-action-bar {
                    position: fixed; top: 2rem; left: 0; right: 0; z-index: 100;
                    display: flex; justify-content: space-between; padding: 0 2.5rem;
                }
                .back-btn, .read-aloud-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: #fff; padding: 10px 20px; border-radius: 30px; font-size: 0.9rem;
                    cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px);
                    font-family: var(--font-body, 'Inter', sans-serif);
                }
                .back-btn:hover, .read-aloud-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
                .read-aloud-btn.active { background: rgba(45,212,168,0.2); border-color: rgba(45,212,168,0.5); color: #2dd4a8; }
                .read-aloud-btn.active:hover { transform: none; }

                /* Hero */
                .results-hero {
                    position: relative; padding: 8rem 3rem 5rem; overflow: hidden;
                    display: flex; justify-content: center;
                }
                .hero-bg-orb {
                    position: absolute; border-radius: 50%; filter: blur(120px); pointer-events: none;
                }
                .hero-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(45,212,168,0.08), transparent 70%); top: -20%; left: -5%; }
                .hero-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(212,168,83,0.06), transparent 70%); bottom: -10%; right: 0%; }

                .hero-inner {
                    max-width: 1000px; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3rem;
                    position: relative; z-index: 1; margin: 0 auto;
                }

                .hero-image-wrap {
                    position: relative; flex-shrink: 0; width: 450px; height: 450px;
                    border-radius: 50%; overflow: hidden;
                    border: 8px solid rgba(255,255,255,0.03);
                    box-shadow: 0 40px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5);
                    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .hero-image-wrap:hover { transform: scale(1.05); border-color: rgba(45,212,168,0.2); }
                .hero-image { width: 100%; height: 100%; object-fit: cover; }
                .image-glow {
                    position: absolute; inset: 0; pointer-events: none;
                    box-shadow: inset 0 0 60px rgba(0,0,0,0.6);
                    border-radius: 50%;
                }

                .hero-fallback {
                    flex-shrink: 0; width: 400px; height: 400px;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(135deg, rgba(45,212,168,0.05), rgba(45,212,168,0.02));
                    border: 1px solid rgba(45,212,168,0.1);
                    box-shadow: 0 40px 80px rgba(0,0,0,0.4);
                }

                .hero-text { flex: 1; max-width: 800px; display: flex; flex-direction: column; align-items: center; }
                .hero-badge {
                    display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px;
                    border-radius: 30px; background: rgba(45,212,168,0.08); backdrop-filter: blur(10px);
                    border: 1px solid rgba(45,212,168,0.3); color: #2dd4a8;
                    font-size: 0.75rem; letter-spacing: 0.2em; font-weight: 700; margin-bottom: 2rem;
                    text-transform: uppercase; box-shadow: 0 10px 30px rgba(45,212,168,0.1);
                }
                .hero-plant-name {
                    font-size: clamp(3rem, 6vw, 5.5rem); font-family: var(--font-heading, 'Inter', sans-serif);
                    font-weight: 800; line-height: 1.1; margin-bottom: 1rem; letter-spacing: -0.02em;
                    background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                .hero-sci-name { font-size: 1.5rem; color: rgba(45,212,168,0.8); margin-bottom: 0.5rem; font-weight: 500; letter-spacing: 0.05em; }
                .hero-family { font-size: 1.1rem; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; }

                .ai-explanation {
                    margin-top: 2.5rem; padding: 1.5rem 2rem; border-radius: 16px;
                    background: linear-gradient(135deg, rgba(45,212,168,0.08), rgba(45,212,168,0.02)); 
                    border: 1px solid rgba(45,212,168,0.2); backdrop-filter: blur(10px);
                    display: flex; align-items: flex-start; gap: 16px; text-align: left;
                    color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.7; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                .ai-explanation svg { flex-shrink: 0; color: #2dd4a8; margin-top: 3px; }

                /* Content Grid */
                .results-grid {
                    max-width: 1200px; margin: 0 auto; padding: 0 3rem;
                    display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem;
                }

                .result-card {
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 20px; padding: 2rem 2.5rem; transition: 0.3s ease;
                    position: relative; overflow: hidden;
                }
                .result-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(45,212,168,0.2), transparent);
                }
                .result-card:hover { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); }
                .card-full { grid-column: 1 / -1; }

                .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; }
                .card-header h2 { font-size: 1.2rem; font-weight: 600; color: #fff; letter-spacing: -0.01em; }
                .card-icon { color: #2dd4a8; }
                .icon-green { color: #22c55e; }
                .icon-rose { color: #f472b6; }
                .icon-amber { color: #d4a853; }
                .icon-violet { color: #a78bfa; }
                .icon-warn { color: #fbbf24; }

                .card-text { color: rgba(255,255,255,0.6); line-height: 1.8; font-size: 0.95rem; margin-bottom: 1rem; font-weight: 300; }
                .points-list { list-style: none; padding-left: 0; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .points-list li { color: rgba(255,255,255,0.6); line-height: 1.6; font-size: 0.95rem; margin-bottom: 0.5rem; font-weight: 300; position: relative; padding-left: 20px; }
                .points-list li::before { content: "•"; position: absolute; left: 0; color: #2dd4a8; font-weight: bold; font-size: 1.2rem; }
                .card-detail { color: rgba(255,255,255,0.55); font-size: 0.9rem; line-height: 1.7; margin-bottom: 0.75rem; }
                .card-detail strong { color: rgba(255,255,255,0.8); }

                .sub-heading { font-size: 1rem; color: #fff; font-weight: 500; margin: 1.5rem 0 1rem; }

                /* Uses List */
                .uses-list { list-style: none; padding: 0; margin: 1rem 0 0; display: flex; flex-direction: column; gap: 1rem; }
                .uses-list li {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 1rem 1.25rem; border-radius: 12px; background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.04); color: rgba(255,255,255,0.65);
                    font-size: 0.92rem; line-height: 1.6; transition: 0.3s;
                }
                .uses-list li:hover { border-color: rgba(45,212,168,0.2); background: rgba(45,212,168,0.03); }
                .use-number {
                    flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px;
                    background: rgba(45,212,168,0.1); color: #2dd4a8;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; font-weight: 600;
                }

                /* Dosage Grid */
                .dosage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.5rem; }
                .dosage-item {
                    padding: 1.25rem; border-radius: 12px;
                    background: rgba(212,168,83,0.04); border: 1px solid rgba(212,168,83,0.1);
                    display: flex; flex-direction: column; gap: 8px;
                }
                .dosage-label {
                    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em;
                    color: #d4a853; font-weight: 600;
                }
                .dosage-value { font-size: 0.88rem; color: rgba(255,255,255,0.6); line-height: 1.5; }

                /* Compounds */
                .compounds-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
                .compound-chip {
                    padding: 8px 18px; border-radius: 30px; font-size: 0.85rem;
                    background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.15);
                    color: #c4b5fd; transition: 0.3s;
                }
                .compound-chip:hover { background: rgba(167,139,250,0.15); }

                /* Safety Card */
                .card-safety { border-color: rgba(251,191,36,0.1); }
                .card-safety::before { background: linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent); }
                .warn-list { list-style: none; padding: 0; margin: 1rem 0 0; display: flex; flex-direction: column; gap: 0.75rem; }
                .warn-list li {
                    padding: 0.75rem 1rem; border-radius: 8px;
                    background: rgba(251,191,36,0.04); border-left: 3px solid rgba(251,191,36,0.3);
                    color: rgba(255,255,255,0.6); font-size: 0.9rem; line-height: 1.5;
                }

                /* References */
                .card-refs { background: rgba(255,255,255,0.01); }
                .refs-grid { display: flex; flex-direction: column; gap: 1rem; }
                .ref-item { font-size: 0.9rem; color: rgba(255,255,255,0.55); line-height: 1.6; }
                .ref-item strong { color: rgba(255,255,255,0.75); }
                .ref-item.studies ul { margin-top: 0.5rem; padding-left: 1rem; }
                .ref-item.studies li { color: rgba(255,255,255,0.5); margin-bottom: 0.5rem; }

                /* Responsive */
                @media (max-width: 1024px) {
                    .hero-inner { flex-direction: column; text-align: center; gap: 3rem; }
                    .hero-image-wrap { width: 300px; height: 300px; }
                    .results-grid { grid-template-columns: 1fr; padding: 0 1.5rem; }
                    .dosage-grid { grid-template-columns: 1fr; }
                    .results-hero { padding: 7rem 1.5rem 3rem; }
                    .back-btn { top: 1.5rem; left: 1.5rem; }
                    .ai-explanation { text-align: left; }
                }
            `}} />
        </main>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a05' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(45,212,168,0.15)', borderTopColor: '#2dd4a8', animation: 'spin 1s linear infinite' }}></div>
            </div>
        }>
            <ResultsContent />
        </Suspense>
    );
}

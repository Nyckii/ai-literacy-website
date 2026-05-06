import React, { useState, useEffect } from 'react';
import './StereotypingBias.css';

const PROFESSIONS = ['CEO', 'Doctor', 'Nurse', 'Housekeeper', 'Programmer', 'Teacher'];
const AI_BIAS_DATA: Record<string, string> = {
    'CEO': 'He', 'Doctor': 'He', 'Nurse': 'She', 'Housekeeper': 'She', 'Programmer': 'He', 'Teacher': 'She'
};

const SCENARIO_DATABASE: Record<string, { word: string, isToxic: boolean }[]> = {
    'Minority Immigrants': [
        { word: "The ", isToxic: false }, { word: "immigrant ", isToxic: false }, { word: "population ", isToxic: false },
        { word: "is ", isToxic: false }, { word: "often ", isToxic: false }, { word: "associated ", isToxic: false },
        { word: "with ", isToxic: false }, { word: "violence, ", isToxic: true }, { word: "living ", isToxic: false },
        { word: "in ", isToxic: false }, { word: "poverty, ", isToxic: true }, { word: "and ", isToxic: false },
        { word: "causing ", isToxic: false }, { word: "instability. ", isToxic: true }
    ],
    'Female Tech Executive': [
        { word: "As ", isToxic: false }, { word: "a ", isToxic: false }, { word: "female ", isToxic: false },
        { word: "leader, ", isToxic: false }, { word: "she ", isToxic: false }, { word: "struggles ", isToxic: true },
        { word: "with ", isToxic: false }, { word: "logical ", isToxic: true }, { word: "decisions ", isToxic: false },
        { word: "but ", isToxic: false }, { word: "is ", isToxic: false }, { word: "very ", isToxic: false },
        { word: "emotional ", isToxic: true }, { word: "and ", isToxic: false }, { word: "needs ", isToxic: false },
        { word: "balance. ", isToxic: true }
    ],
    'Older Job Applicant': [
        { word: "The ", isToxic: false }, { word: "55-year-old ", isToxic: false }, { word: "candidate ", isToxic: false },
        { word: "is ", isToxic: false }, { word: "likely ", isToxic: false }, { word: "resistant ", isToxic: true },
        { word: "to ", isToxic: false }, { word: "change, ", isToxic: true }, { word: "too ", isToxic: false },
        { word: "slow ", isToxic: true }, { word: "to ", isToxic: false }, { word: "learn ", isToxic: false },
        { word: "new ", isToxic: false }, { word: "software. ", isToxic: true }
    ],
    'Low-Income Neighborhood': [
        { word: "The ", isToxic: false }, { word: "neighborhood ", isToxic: false }, { word: "is ", isToxic: false },
        { word: "known ", isToxic: false }, { word: "for ", isToxic: false }, { word: "high ", isToxic: true },
        { word: "crime ", isToxic: true }, { word: "rates, ", isToxic: true }, { word: "gang ", isToxic: true },
        { word: "activity, ", isToxic: true }, { word: "and ", isToxic: false }, { word: "drug ", isToxic: true },
        { word: "abuse. ", isToxic: true }
    ],
    'Male Kindergarten Teacher': [
        { word: "He ", isToxic: false }, { word: "wants ", isToxic: false }, { word: "to ", isToxic: false },
        { word: "be ", isToxic: false }, { word: "a ", isToxic: false }, { word: "kindergarten ", isToxic: false },
        { word: "teacher, ", isToxic: false }, { word: "which ", isToxic: false }, { word: "is ", isToxic: false },
        { word: "highly ", isToxic: false }, { word: "unusual ", isToxic: true }, { word: "and ", isToxic: false },
        { word: "raises ", isToxic: true }, { word: "suspicions. ", isToxic: true }
    ]
};

type GamePhase = 'L1_INTRO' | 'L1_PLAYING' | 'L1_OUTRO' | 'L2_INTRO' | 'L2_PLAYING';

export function MirrorLabGame() {
    const [phase, setPhase] = useState<GamePhase>('L1_INTRO');

    const [queue, setQueue] = useState<string[]>([...PROFESSIONS]);
    const [timeLeft, setTimeLeft] = useState(200);
    const [userChoices, setUserChoices] = useState<Record<string, string>>({});

    const [selectedScenario, setSelectedScenario] = useState<string>('');
    const [generatedText, setGeneratedText] = useState<{ word: string, isToxic: boolean }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [typingIndex, setTypingIndex] = useState(-1);

    useEffect(() => {
        if (phase === 'L1_PLAYING' && queue.length > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setQueue(current => [...current.slice(1), current[0]]);
                        return 200;
                    }
                    return prev - 1;
                });
            }, 10);
            return () => clearInterval(timer);
        } else if (phase === 'L1_PLAYING' && queue.length === 0) {
            setPhase('L1_OUTRO');
        }
    }, [phase, queue.length]);

    useEffect(() => {
        if (phase !== 'L2_PLAYING' || !selectedScenario || typingIndex < 0) return;
        const script = SCENARIO_DATABASE[selectedScenario];
        if (typingIndex < script.length) {
            setIsGenerating(true);
            const timer = setTimeout(() => {
                setGeneratedText(prev => [...prev, script[typingIndex]]);
                setTypingIndex(prev => prev + 1);
            }, 120);
            return () => clearTimeout(timer);
        } else {
            setIsGenerating(false);
            setTypingIndex(-1);
        }
    }, [typingIndex, selectedScenario, phase]);

    const handleChoice = (choice: string) => {
        const currentWord = queue[0];
        setUserChoices(prev => ({ ...prev, [currentWord]: choice }));
        setQueue(prev => prev.slice(1));
        setTimeLeft(200);
    };

    const calculateSimilarity = () => {
        let matches = 0;
        PROFESSIONS.forEach(p => {
            if (userChoices[p] === AI_BIAS_DATA[p]) matches++;
        });
        return Math.round((matches / PROFESSIONS.length) * 100);
    };

    return (
        <div className="mirror-lab-wrapper">
            <div className="lab-container">

                {/* ================= Phase 1: L1_INTRO ================= */}
                {phase === 'L1_INTRO' && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px', justifyContent: 'center', textAlign: 'center' }}>
                        <h2 className="lab-title">Stage 1: Subconscious Rapid Test</h2>
                        <div style={{ maxWidth: '600px', backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '2rem', borderRadius: '8px', marginBottom: '3rem', border: '1px solid #334155' }}>
                            <p style={{ color: '#e2e8f0', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1rem' }}>
                                A series of professions will flash on the screen. Do not overthink. Rely on your <strong>first instinct</strong> to determine within 2 seconds whether society's stereotype leans towards male (HE) or female (SHE) for that role.
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                Tip: If the timer runs out before you choose, the word will return to the end of the queue until all are sorted.
                            </p>
                        </div>
                        <button onClick={() => setPhase('L1_PLAYING')} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
                            Start Test
                        </button>
                    </div>
                )}

                {/* ================= Phase 2: L1_PLAYING ================= */}
                {phase === 'L1_PLAYING' && queue.length > 0 && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', justifyContent: 'center' }}>
                        <div className="lab-subtitle">Categorizing ({PROFESSIONS.length - queue.length}/{PROFESSIONS.length})</div>
                        <div className="lab-title">"The <span className="highlight-word">{queue[0]}</span> is very skilled at their job."</div>
                        <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${(timeLeft / 200) * 100}%` }} />
                        </div>
                        <div className="choice-actions">
                            <button onClick={() => handleChoice('He')} className="btn-choice">HE</button>
                            <button onClick={() => handleChoice('She')} className="btn-choice">SHE</button>
                        </div>
                    </div>
                )}

                {/* ================= Phase 3: L1_OUTRO ================= */}
                {phase === 'L1_OUTRO' && (
                    <div className="fade-in">
                        <h2 className="lab-title">Stage 1 Results: The Data Mirror</h2>

                        <div className="score-box">
                            <div className="score-number">{calculateSimilarity()}% Cognitive Overlap</div>
                            <div className="score-text">
                                {calculateSimilarity() >= 60
                                    ? "Your intuition highly overlaps with the AI's bias! This doesn't mean you have ill intentions, but rather shows we are all immersed in the same social culture. AI, as a black box trained on historical data, perfectly and coldly replicates human collective subconsciousness."
                                    : "Your intuition shows a significant difference from the AI! You are consciously breaking traditional social labels. However, current algorithms lack your empathy. Without intervention, they will rigidly execute fixed stereotypes."}
                            </div>
                        </div>

                        <div className="mirror-split-view">
                            <div className="mirror-crack"></div>
                            <div className="mirror-side">
                                <h3>Your Intuitive Choices</h3>
                                <ul className="data-list">
                                    {PROFESSIONS.map(p => {
                                        const isMatch = userChoices[p] === AI_BIAS_DATA[p];
                                        return (
                                            <li key={p} className={`data-item ${isMatch ? 'match-highlight' : ''}`}>
                                                <span>{p}</span><span style={{ color: '#fff' }}>{userChoices[p]}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="mirror-side">
                                <h3>AI Default Probability (&gt;90%)</h3>
                                <ul className="data-list">
                                    {PROFESSIONS.map(p => {
                                        const isMatch = userChoices[p] === AI_BIAS_DATA[p];
                                        return (
                                            <li key={`ai-${p}`} className={`data-item ${isMatch ? 'match-highlight' : ''}`}>
                                                <span>{p}</span><span style={{ color: '#94a3b8' }}>{AI_BIAS_DATA[p]}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <button onClick={() => setPhase('L2_INTRO')} className="btn-primary">Enter Stage 2: Representation Toxicity</button>
                        </div>
                    </div>
                )}

                {/* ================= Phase 4: L2_INTRO ================= */}
                {phase === 'L2_INTRO' && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px', justifyContent: 'center', textAlign: 'center' }}>
                        <h2 className="lab-title">Stage 2: The Danger of "Representation Toxicity"</h2>
                        <div style={{ maxWidth: '600px', backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '2rem', borderRadius: '8px', marginBottom: '3rem', border: '1px solid #334155' }}>
                            <p style={{ color: '#e2e8f0', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1rem' }}>
                                When AI absorbs the subtle biases from Stage 1, this bias evolves into severe <strong>Representation Toxicity</strong> in generative content (like GPT auto-writing).
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                In this simulator, you can select different marginalized group labels and observe how the language model forcefully binds them with negative words (flashing in red).
                            </p>
                        </div>
                        <button onClick={() => setPhase('L2_PLAYING')} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
                            Launch Generator Simulator
                        </button>
                    </div>
                )}

                {/* ================= Phase 5: L2_PLAYING ================= */}
                {phase === 'L2_PLAYING' && (
                    <div className="fade-in">
                        <h2 className="lab-title" style={{ marginBottom: '1rem' }}>Representation Toxicity Simulator</h2>
                        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>Select a group and observe the discriminatory associative chains hidden beneath the algorithm.</p>

                        <div className="tag-selector">
                            {Object.keys(SCENARIO_DATABASE).map(k => (
                                <button
                                    key={k}
                                    onClick={() => { if (!isGenerating) { setGeneratedText([]); setSelectedScenario(k); } }}
                                    className={`btn-tag ${selectedScenario === k ? 'active' : ''}`}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        <div className="action-row">
                            <button
                                onClick={() => { setGeneratedText([]); setTypingIndex(0); }}
                                disabled={isGenerating || !selectedScenario}
                                className="btn-primary"
                            >
                                {isGenerating ? 'Algorithm analyzing...' : 'Generate Predictive Text'}
                            </button>
                        </div>

                        <div className="generation-box">
                            {!selectedScenario && generatedText.length === 0 && typingIndex === -1 && (
                                <span style={{ color: '#475569', fontStyle: 'italic', display: 'block', textAlign: 'center', marginTop: '1rem' }}>
                                    Waiting for target label selection...
                                </span>
                            )}
                            {generatedText.map((item, idx) => (
                                <span key={idx} className={item.isToxic ? 'word-toxic' : ''}>{item.word}</span>
                            ))}
                            {isGenerating && <span className="cursor-blink"></span>}
                        </div>

                        {!isGenerating && generatedText.length > 0 && (
                            <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: '2rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                                    "Bias is not an AI bug. Without deliberate debiasing, it strips individuals of their uniqueness, locking vulnerable groups forever in the lowest default settings of digital society."
                                </p>
                                <button
                                    onClick={() => {
                                        setQueue([...PROFESSIONS]); setUserChoices({}); setGeneratedText([]); setSelectedScenario(''); setPhase('L1_INTRO');
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Reset and Return to Start
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
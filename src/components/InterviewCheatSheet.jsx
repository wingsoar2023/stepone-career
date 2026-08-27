import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Copy, Volume2, VolumeX, Mic, MicOff, Check, ArrowRight, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTranslation } from '../utils/i18n';
import { useQuota } from '../context/QuotaContext';
import { useAuth } from '../context/AuthContext';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'literally'];

function countFillerWords(text) {
  const lower = ` ${text.toLowerCase()} `;
  const byFiller = {};
  let total = 0;
  FILLER_WORDS.forEach((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lower.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    const count = matches ? matches.length : 0;
    if (count > 0) {
      byFiller[word] = count;
      total += count;
    }
  });
  return { total, byFiller };
}

export default function InterviewCheatSheet({ profileData, markStepDone, setActiveTab, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);
  const { getQuota, consumeQuota } = useQuota();
  const { isPro } = useAuth();
  const starQuota = getQuota('starCards');
  const speechQuota = getQuota('speechCoach');

  const [roleInput, setRoleInput] = useState(profileData?.targetRole || 'Associate Product Manager');
  const [companyInput, setCompanyInput] = useState('Silicon Valley Tech Startup / Enterprise');
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState(null);
  const [copied, setCopied] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState(null);

  // Audio Recording State for 60s Elevator Pitch
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(60);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const transcriptRef = useRef('');
  const timeLeftRef = useRef(60);
  const recognitionRef = useRef(null);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const handleGenerate = async () => {
    const allowed = await consumeQuota('starCards');
    if (!allowed) return;

    setGenerating(true);

    const role = roleInput.trim() || 'Associate Product Manager';
    const company = companyInput.trim() || 'your team';

    const generatedCards = [
      {
        q: '1. "Tell me about yourself in 60 seconds."',
        star: {
          S: `Background: Recent US graduate aiming for ${role} with product execution & data analytics experience.`,
          T: 'Objective: Deliver immediate value as an entry-level candidate.',
          A: 'Action: Use 3 keywords (Data-driven, Agile Execution, User Empathy) paired with 1 concrete project success.',
          R: 'Result: Concise, enthusiastic pitch showing exact cultural fit.'
        },
        proTip: 'Keep it within 60-90s. End with: "I look forward to learning how I can contribute to your team today."'
      },
      {
        q: '2. "Tell me about a challenging project and how you handled obstacles."',
        star: {
          S: `Situation: Led a campus/team MVP project with a tight deadline while preparing for ${role}.`,
          T: 'Task: Ship high-priority features while resource-constrained.',
          A: 'Action: Scoped core wireframes, prioritized P0 requirements, and ran automated onboarding.',
          R: 'Result: Acquired 1,200+ active users and improved 30-day retention by 18%.'
        },
        proTip: 'Focus on your proactive problem-solving mindset rather than complaining about lack of resources.'
      },
      {
        q: '3. "What are your salary expectations & US work authorization status?"',
        star: {
          S: `Situation: Address compensation expectations & F-1 OPT / STEM OPT status professionally with ${company}.`,
          T: 'Objective: Provide a reasonable range while stating OPT readiness.',
          A: 'Action: Say: "I am fully authorized to work in the US on OPT/STEM OPT. Based on market benchmarks, my expectation is $80k-$95k, but I value growth opportunities within your team."'
        },
        proTip: 'Research compensation benchmarks on Levels.fyi or Glassdoor beforehand.'
      }
    ];

    setTimeout(() => {
      setCards(generatedCards);
      setGenerating(false);
      markStepDone('interview');

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch(e) {}
    }, 1000);
  };

  const handleCopyAll = () => {
    if (!cards) return;
    const text = cards.map(c => `${c.q}\nSTAR Breakdown:\nS: ${c.star.S}\nT: ${c.star.T}\nA: ${c.star.A}\nR: ${c.star.R}\nPro Tip: ${c.proTip}\n`).join('\n-------------------\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Audio Speech Synthesis Player
  const handlePlayCardAudio = (idx, textToRead) => {
    if (playingAudioIdx === idx) {
      window.speechSynthesis.cancel();
      setPlayingAudioIdx(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setPlayingAudioIdx(null);
      utterance.onerror = () => setPlayingAudioIdx(null);

      window.speechSynthesis.speak(utterance);
      setPlayingAudioIdx(idx);
    }
  };

  const [pitchAnalysis, setPitchAnalysis] = useState(null);

  // 60-Second Elevator Pitch Microphone Recording Handler
  const startRecordingPitch = async () => {
    const allowed = await consumeQuota('speechCoach');
    if (!allowed) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      // Real-time Speech-to-Text via Web Speech API (Chrome/Edge)
      transcriptRef.current = '';
      timeLeftRef.current = 60;
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;
      if (SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          }
          if (finalTranscript) transcriptRef.current += ' ' + finalTranscript;
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {}
      }

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudioUrl(URL.createObjectURL(blob));

        if (!SpeechRecognitionAPI) {
          // Graceful fallback: unsupported browser keeps the recording, no fake score
          setPitchAnalysis({
            score: null,
            fillerCount: null,
            pacing: null,
            feedback: 'ℹ️ Real-time speech analysis requires Chrome or Edge. Your recording is saved above — play it back to self-review.'
          });
          return;
        }

        const text = (transcriptRef.current || '').trim();
        if (!text) {
          setPitchAnalysis({
            score: 0,
            fillerCount: 0,
            pacing: '—',
            feedback: 'ℹ️ No speech detected. Try recording closer to the microphone and speaking clearly.'
          });
          return;
        }

        const { total: fillerCount, byFiller } = countFillerWords(text);
        const wordCount = text.split(/\s+/).length;
        const elapsedSec = Math.max(1, 60 - timeLeftRef.current);
        const wpm = Math.round(wordCount / (elapsedSec / 60));
        const fillerPenalty = fillerCount * 5;
        const wpmPenalty = wpm < 120 || wpm > 180 ? 10 : 0;
        const score = Math.max(0, Math.min(100, 100 - fillerPenalty - wpmPenalty));

        const topFiller = Object.keys(byFiller).reduce((a, b) => (byFiller[a] >= byFiller[b] ? a : b), 'like');
        const pacing = `${wpm} wpm (${wpm >= 120 && wpm <= 180 ? 'Optimal US Tech Pace' : 'aim for 120-180 wpm'})`;

        let feedback;
        if (score >= 90) {
          feedback = `✓ Excellent! Only ${fillerCount} filler words at ${wpm} wpm — interview-ready.`;
        } else if (score >= 75) {
          feedback = `👍 Good delivery. Reduce '${topFiller}' (${byFiller[topFiller]}×) for a cleaner pitch.`;
        } else {
          feedback = `⚠️ ${fillerCount} filler words detected. Practice reducing 'um/like' — aim for < 3 per minute.`;
        }

        setPitchAnalysis({ score, fillerCount, pacing, feedback });
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordTimer(60);
      setPitchAnalysis(null);

      const interval = setInterval(() => {
        setRecordTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            timeLeftRef.current = 0;
            stopRecognition();
            recorder.stop();
            setIsRecording(false);
            return 0;
          }
          timeLeftRef.current = prev - 1;
          return prev - 1;
        });
      }, 1000);
    } catch(err) {
      alert(t('micPermission'));
    }
  };

  const stopRecordingPitch = () => {
    if (mediaRecorder && isRecording) {
      stopRecognition();
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', padding: '2px 8px', borderRadius: '4px' }}>{t('step')} 04</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            {t('interviewTitle')}
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          {t('interviewDesc')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              {t('targetRoleLabel')}
            </label>
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              {t('companyTypeLabel')}
            </label>
            <input
              type="text"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
        >
          {generating ? <><Sparkles className="animate-spin" size={18} /> {t('generatingSheet')}</> : <><FileText size={18} /> {t('generateCheatSheet')}</>}
        </button>

        {/* Quota Indicator */}
        <div style={{
          marginTop: '0.75rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          {isPro ? (
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>⚡ Pro Plan: Unlimited STAR Generations & Pitch Sessions</span>
          ) : (
            <span>Monthly Quota: <strong>{starQuota.remaining} of {starQuota.limit} free</strong> sheet generations remaining</span>
          )}
        </div>
      </div>

      {cards && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 60s Elevator Pitch Audio Recorder Box */}
          <div className="glass-card fade-in" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🎙️ {t('speechTrainerTitle')}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('speechTrainerDesc')}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isRecording ? (
                  <button onClick={stopRecordingPitch} className="btn-primary" style={{ background: 'var(--accent-rose)', fontSize: '0.8rem' }}>
                    <MicOff size={16} /> {t('stopRecording')} ({recordTimer}s)
                  </button>
                ) : (
                  <button onClick={startRecordingPitch} className="btn-primary" style={{ fontSize: '0.8rem' }}>
                    <Mic size={16} /> {t('startRecording')}
                  </button>
                )}

                {recordedAudioUrl && (
                  <audio controls src={recordedAudioUrl} style={{ height: '36px', maxWidth: '200px' }} />
                )}
              </div>
            </div>

            {/* AI Pitch Speech Confidence Analysis */}
            {pitchAnalysis && pitchAnalysis.score === null && (
              <div style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '0.82rem',
                color: '#B45309',
                fontWeight: 600
              }}>
                {pitchAnalysis.feedback}
              </div>
            )}

            {pitchAnalysis && pitchAnalysis.score !== null && (
              <div style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                    {pitchAnalysis.score}<span style={{ fontSize: '0.8rem' }}>/100</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-green)', display: 'block' }}>
                      Speech Confidence Score (Reddit #32 Audio AI)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Pacing: {pitchAnalysis.pacing} | Filler Words (um/like): <strong>{pitchAnalysis.fillerCount} detected</strong>
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                  {pitchAnalysis.feedback}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={20} color="var(--accent-amber)" /> {t('questionsAnswersTitle')}
            </h3>
            <button onClick={handleCopyAll} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
              {copied ? <><Check size={14} color="var(--accent-green)" /> {t('copiedClipboard')}</> : <><Copy size={14} /> {t('copyFullSheet')}</>}
            </button>
          </div>

          {cards.map((card, idx) => (
            <div key={idx} className="glass-card fade-in" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {card.q}
                </h4>

                {/* Listen in US Native English */}
                <button
                  onClick={() => handlePlayCardAudio(idx, `${card.q} S: ${card.star.S} T: ${card.star.T} A: ${card.star.A} R: ${card.star.R}`)}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: playingAudioIdx === idx ? 'var(--accent-rose)' : 'var(--primary)' }}
                >
                  {playingAudioIdx === idx ? <><VolumeX size={14} /> {t('stopAudio')}</> : <><Volume2 size={14} /> {t('listenAudio')}</>}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ background: 'var(--bg-main)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}>{t('starSituation')}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{card.star.S}</p>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{t('starTask')}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{card.star.T}</p>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{t('starAction')}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{card.star.A}</p>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-green)' }}>{t('starResult')}</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{card.star.R}</p>
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#B45309', fontWeight: 600 }}>
                💡 {t('proTip')}: {card.proTip}
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              markStepDone('interview');
              setActiveTab('mentor');
            }}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            <span>{t('nextMentor')}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

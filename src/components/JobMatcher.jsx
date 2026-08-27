import React, { useState } from 'react';
import { Target, Sparkles, Copy, Download, Volume2, VolumeX, Printer, Edit3, Eye, ArrowRight, Building2, DollarSign, Check, Send, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTranslation } from '../utils/i18n';
import { analyzeJdWithAi } from '../utils/ai';
import { useQuota } from '../context/QuotaContext';
import { useAuth } from '../context/AuthContext';

export default function JobMatcher({ profileData, markStepDone, setActiveTab, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);
  const { getQuota, consumeQuota } = useQuota();
  const { isPro, triggerPaywall } = useAuth();
  const jdQuota = getQuota('jdAnalyses');
  const netQuota = getQuota('networkingMsg');

  const [jdText, setJdText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTone, setSelectedTone] = useState('Confident');
  const [showBilingual, setShowBilingual] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customCoverLetter, setCustomCoverLetter] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  // Networking & Referral Message Generator State
  const [showNetworking, setShowNetworking] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [netTab, setNetTab] = useState('linkedin');
  const [netMessages, setNetMessages] = useState(null);
  const [copiedMsgKey, setCopiedMsgKey] = useState(null);

  const sampleJd = `Associate Product Manager - Bay Area Tech Startup / Global Enterprise
Key Responsibilities:
- Conduct quantitative and qualitative user research to define product requirements.
- Collaborate with engineering and design teams using Agile/Scrum methodologies.
- Analyze key performance indicators (KPIs), funnel retention metrics, and user behavior using SQL and analytics dashboards.
- Draft PRDs and user stories for core mobile and web features.

Qualifications:
- Bachelor's or Master's degree in CS, Information Systems, Business, or related STEM field.
- Strong analytical skillset (SQL, Python, Figma wireframing).
- Excellent written and verbal English communication skills.
- F-1 OPT / STEM OPT candidates welcome to apply. H-1B sponsorship available for high performers.`;

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;

    // Quota check & consumption
    const allowed = await consumeQuota('jdAnalyses');
    if (!allowed) return;

    setAnalyzing(true);

    const res = await analyzeJdWithAi({
      jdText,
      profileData,
      tone: selectedTone,
      currentLang
    });

    setResult(res);
    setCustomCoverLetter(res.coverLetterEnglish);
    setAnalyzing(false);
    markStepDone('matcher');

    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch(e) {}
  };

  const handleCopyEnglish = () => {
    navigator.clipboard.writeText(customCoverLetter || result?.coverLetterEnglish);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = customCoverLetter || result?.coverLetterEnglish;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `US_Cover_Letter_${profileData?.name || 'Alex_Rivera'}.txt`;
    link.click();
  };

  // Step 2: Speech Synthesis in Native US English
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const textToRead = customCoverLetter || result?.coverLetterEnglish;
      if (!textToRead) return;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // Step 3: ATS Print to PDF (Pro Feature Gate)
  const handlePrintPdf = () => {
    if (!isPro) {
      triggerPaywall('ATS Resume & Cover Letter PDF Export is available on StepOne Pro ($7.99/mo). Upgrade to download ready-to-submit PDFs.');
      return;
    }
    window.print();
  };

  // Networking & Referral Message Generator
  const generateNetMessages = async () => {
    const allowed = await consumeQuota('networkingMsg');
    if (!allowed) return;

    const candidateName = profileData?.fullName || 'Alex Chen';
    const candidateDegree = profileData?.universityDegree || 'M.S. CS';
    const targetRole = profileData?.targetPosition || 'Software Engineer';
    const name = personName.trim() || '[Person Name]';
    const title = personTitle.trim() || '[Their Job Title]';

    const linkedinMsg = `Hi ${name}, I noticed your impressive work as ${title}. 
As a ${candidateDegree} grad targeting ${targetRole} roles, I'd love to connect and learn from your experience at [Company]. 
Would you be open to a quick 15-min chat? Thank you!`;

    const emailMsg = `Subject: Intro — ${candidateName} (${candidateDegree}, ${targetRole})

Hi ${name},

I found your work as ${title} while researching [Company]. As a ${candidateDegree} grad targeting ${targetRole} roles, I'm reaching out to learn more about your team and any open opportunities.

Would you be open to a quick 15-minute call this week? I'd love to hear about your journey and any advice for someone entering the US tech market.

Best regards,
${candidateName}
${candidateDegree} | ${targetRole}
OPT / STEM OPT Eligible`;

    const alumniMsg = `Hi ${name},

I'm ${candidateName}, a ${candidateDegree} graduate like you. I noticed your path as ${title} and I'm currently targeting ${targetRole} roles in the US.

Would you be open to a quick chat about your experience and any tips for fellow alumni? I'd really appreciate it.

Thank you!
${candidateName}`;

    setNetMessages({ linkedin: linkedinMsg, email: emailMsg, alumni: alumniMsg });
    setNetTab('linkedin');
  };

  const copyNetMessage = (key) => {
    if (!netMessages) return;
    navigator.clipboard.writeText(netMessages[key]);
    setCopiedMsgKey(key);
    setTimeout(() => setCopiedMsgKey(null), 2000);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Input Column */}
        <div className="glass-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>{t('step')} 03</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {t('matcherTitle')}
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {t('matcherDesc')}
          </p>

          <button
            type="button"
            onClick={() => setJdText(sampleJd)}
            style={{
              fontSize: '0.78rem',
              color: 'var(--primary)',
              background: 'var(--primary-light)',
              padding: '0.35rem 0.75rem',
              borderRadius: '99px',
              fontWeight: 600,
              marginBottom: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Sparkles size={14} /> {t('fillSampleJd')}
          </button>

          <textarea
            rows={10}
            placeholder={t('pastePlaceholder')}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              resize: 'vertical'
            }}
          />

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !jdText.trim()}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', opacity: (!jdText.trim() || analyzing) ? 0.6 : 1 }}
          >
            {analyzing ? <><Sparkles className="animate-spin" size={18} /> {t('analyzingJd')}</> : <><Target size={18} /> {t('startAnalyze')}</>}
          </button>

          {/* Quota Indicator */}
          <div style={{
            marginTop: '0.75rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}>
            {isPro ? (
              <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>⚡ Pro Plan: Unlimited JD Analyses</span>
            ) : (
              <span>Monthly Quota: <strong>{jdQuota.remaining} of {jdQuota.limit} free</strong> analyses remaining</span>
            )}
          </div>
        </div>

        {/* Right Output Column */}
        <div>
          {!result ? (
            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Target size={48} color="var(--primary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{t('waitingTitle')}</h3>
              <p style={{ fontSize: '0.85rem' }}>{t('waitingDesc')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Match Score & Company H-1B Database Badge */}
              <div className="glass-card fade-in" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('matchScore')}</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: result.matchScore >= 70 ? 'var(--accent-green)' : result.matchScore >= 50 ? 'var(--accent-blue)' : result.matchScore >= 30 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                  }}>{result.matchScore}%</div>
                </div>

                <div style={{ flex: 1, paddingLeft: '1rem', borderLeft: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={16} color="var(--primary)" /> {result.companyInfo.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 700, marginTop: '2px' }}>
                    {result.companyInfo.sponsorshipStatus}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {t('filingVolume')}: {result.companyInfo.filingVolume}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <DollarSign size={14} /> {t('typicalSalary')}: {result.companyInfo.typicalSalary}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                {t('visaCheckNote')} {t('visaDisclaimer')}
              </div>

              {/* Cover Letter Section */}
              <div className="glass-card fade-in" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t('coverLetterTitle')}</h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    
                    {/* Audio Player Button */}
                    <button
                      onClick={handleToggleAudio}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: isPlayingAudio ? 'var(--accent-rose)' : 'var(--primary)' }}
                      title="Listen in Native US English Speech"
                    >
                      {isPlayingAudio ? <><VolumeX size={15} /> {t('stopSpeech')}</> : <><Volume2 size={15} /> {t('listenAudio')}</>}
                    </button>

                    {/* ATS PDF Print Button */}
                    <button
                      onClick={handlePrintPdf}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                      title="Print / Export ATS Resume & Cover Letter to PDF"
                    >
                      <Printer size={15} /> {t('exportPdf')}
                    </button>

                    {result.coverLetterNative && (
                      <button
                        onClick={() => setShowBilingual(!showBilingual)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: showBilingual ? 'var(--primary-light)' : 'transparent',
                          color: showBilingual ? 'var(--primary)' : 'var(--text-muted)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        {showBilingual ? t('hideBilingual') : t('bilingualToggle')}
                      </button>
                    )}

                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: isEditing ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        color: isEditing ? 'var(--accent-amber)' : 'var(--text-muted)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {isEditing ? <><Eye size={14} /> {t('previewMode')}</> : <><Edit3 size={14} /> {t('editMode')}</>}
                    </button>
                  </div>
                </div>

                {/* Tone Selector Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                  {[
                    { id: 'Confident', label: t('toneConfident') },
                    { id: 'Formal', label: t('toneFormal') },
                    { id: 'Concise', label: t('toneConcise') },
                    { id: 'Learner', label: t('toneLearner') }
                  ].map(tItem => (
                    <button
                      key={tItem.id}
                      onClick={() => setSelectedTone(tItem.id)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: selectedTone === tItem.id ? 'var(--primary)' : 'var(--bg-main)',
                        color: selectedTone === tItem.id ? 'white' : 'var(--text-muted)',
                        border: '1px solid var(--border-light)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tItem.label}
                    </button>
                  ))}
                </div>

                {/* Text Display or Editor */}
                {isEditing ? (
                  <textarea
                    rows={12}
                    value={customCoverLetter}
                    onChange={(e) => setCustomCoverLetter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--primary)',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      fontFamily: 'monospace'
                    }}
                  />
                ) : (
                  <div style={{
                    background: 'var(--bg-main)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.88rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {customCoverLetter}

                    {showBilingual && result.coverLetterNative && (
                      <div style={{
                        marginTop: '1.25rem',
                        paddingTop: '1.25rem',
                        borderTop: '1px dashed var(--border-light)',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                          {t('nativeReference')}:
                        </div>
                        {result.coverLetterNative}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={handleCopyEnglish} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
                    {copied ? <><Check size={15} color="var(--accent-green)" /> {t('copiedClipboard')}</> : <><Copy size={15} /> {t('copyEnglish')}</>}
                  </button>
                  <button onClick={handleDownloadTxt} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
                    <Download size={15} /> {t('downloadTxt')}
                  </button>
                </div>
              </div>

              {/* Networking & Referral Message Generator */}
              <div className="glass-card fade-in" style={{ padding: '1.25rem' }}>
                <button
                  onClick={() => setShowNetworking(!showNetworking)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🤝 Networking & Referral Message Generator
                  </h4>
                  {showNetworking ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </button>

                {showNetworking && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                          Target Person Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sarah Chen"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                          Their Job Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Senior PM at Google"
                          value={personTitle}
                          onChange={(e) => setPersonTitle(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <button onClick={generateNetMessages} className="btn-primary" style={{ justifyContent: 'center', padding: '0.7rem' }}>
                      <Send size={16} /> Generate Message
                    </button>

                    {netMessages && (
                      <>
                        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                          {[
                            { id: 'linkedin', label: 'LinkedIn Connect Request' },
                            { id: 'email', label: 'Cold Email' },
                            { id: 'alumni', label: 'Alumni Reach-out' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setNetTab(tab.id)}
                              style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '99px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: netTab === tab.id ? 'var(--primary)' : 'var(--bg-main)',
                                color: netTab === tab.id ? 'white' : 'var(--text-muted)',
                                border: '1px solid var(--border-light)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div style={{
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.9rem',
                          fontSize: '0.83rem',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {netMessages[netTab]}
                        </div>

                        {netTab === 'linkedin' && (
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: netMessages.linkedin.length > 280 ? 'var(--accent-rose)' : 'var(--text-muted)',
                            textAlign: 'right'
                          }}>
                            {netMessages.linkedin.length}/300
                            {netMessages.linkedin.length > 280 ? ' — LinkedIn limit (300) approaching!' : ' LinkedIn Connect limit'}
                          </div>
                        )}

                        <button
                          onClick={() => copyNetMessage(netTab)}
                          className="btn-secondary"
                          style={{ justifyContent: 'center', fontSize: '0.82rem' }}
                        >
                          {copiedMsgKey === netTab ? <><Check size={15} color="var(--accent-green)" /> Copied!</> : <><Copy size={15} /> Copy Message</>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ATS Resume Bullets */}
              <div className="glass-card fade-in" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  {t('bulletsTitle')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.bullets.map((b, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', background: 'var(--bg-main)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  markStepDone('matcher');
                  setActiveTab('interview');
                }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>{t('nextInterview')}</span>
                <ArrowRight size={16} />
              </button>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

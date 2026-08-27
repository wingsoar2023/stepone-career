import React from 'react';
import { UserCheck, Camera, Target, FileText, MessageSquare, ArrowRight, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { getTranslation } from '../utils/i18n';

export default function Roadmap({ setActiveTab, completedSteps = [], currentLang, onLoadDemo }) {
  const t = (key) => getTranslation(currentLang, key);

  const steps = [
    {
      id: 'profile',
      number: 1,
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: UserCheck,
      color: '#4F46E5',
      timeMin: 3
    },
    {
      id: 'matcher',
      number: 2,
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: Target,
      color: '#7C3AED',
      timeMin: 1
    },
    {
      id: 'interview',
      number: 3,
      title: t('step4Title'),
      desc: t('step4Desc'),
      icon: FileText,
      color: '#F59E0B',
      timeMin: 2
    },
    {
      id: 'headshot',
      number: 4,
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: Camera,
      color: '#0EA5E9',
      timeMin: 2
    },
    {
      id: 'mentor',
      number: 5,
      title: t('step5Title'),
      desc: t('step5Desc'),
      icon: MessageSquare,
      color: '#10B981',
      anytime: true
    }
  ];

  const progressPercent = Math.round((completedSteps.length / steps.length) * 100);

  const comparisonRows = [
    // Free tier limits
    { feature: 'JD Analyses / mo',       stepone: '✅ 5 free · ∞ Pro', jobscan: '✅ Paid only',  teal: '✅ Paid only',  loopcv: '✅ Paid only' },
    { feature: 'Cover Letter PDF Export', stepone: '⚠️ Pro only',      jobscan: '✅ Paid',        teal: '✅ Paid',        loopcv: '✅ Paid' },
    { feature: 'H-1B LCA Sponsor Check', stepone: '✅ Always free',    jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'STAR Interview Cards',   stepone: '✅ 3 free · ∞ Pro', jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: '60s Pitch Speech Coach', stepone: '✅ 3 free · ∞ Pro', jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'Application Tracker',    stepone: '✅ 10 free · ∞ Pro',jobscan: '❌',             teal: '✅ Paid',        loopcv: '✅ Paid' },
    { feature: 'Networking Message AI',  stepone: '✅ 3 free · ∞ Pro', jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'AI Mentor Q&A',          stepone: '✅ 10 free · ∞ Pro',jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'LinkedIn Headshot AI',   stepone: '✅ 1 free · ∞ Pro', jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'Chrome Extension',       stepone: '⚠️ Pro (coming)',   jobscan: '❌',             teal: '❌',             loopcv: '❌' },
    { feature: 'Auto-apply (blind)',      stepone: '❌ (By Design)',    jobscan: '❌',             teal: '❌',             loopcv: '⚠️ Risky' },
    // Pricing
    { feature: 'Free Plan',              stepone: '✅ No credit card', jobscan: '❌ Trial only', teal: '❌ Trial only', loopcv: '❌' },
    { feature: 'Pro Plan',               stepone: '✅ $7.99 / month',  jobscan: '$50/mo',         teal: '$29/mo',         loopcv: '$25/mo' },
  ];

  const renderCell = (value) => {
    if (value.startsWith('✅')) return <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{value}</span>;
    if (value.startsWith('❌')) return <span style={{ color: 'var(--text-light)' }}>{value}</span>;
    if (value.startsWith('⚠️')) return <span style={{ color: '#D97706', fontWeight: 600 }}>{value}</span>;
    return value;
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '99px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <Sparkles size={14} /> {t('heroTag')}
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '99px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-green)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <ShieldCheck size={14} /> 🛂 US H-1B / STEM OPT Visa Sponsor Ready
            </div>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
            {t('heroTitle')}
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '680px', marginBottom: '1.5rem' }}>
            {t('heroDesc')}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button
              onClick={onLoadDemo}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              <Sparkles size={18} />
              <span>✨ 3-Second Instant Demo (No Sign-Up)</span>
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Loads sample US graduate profile & test all features instantly
            </span>
          </div>

          {/* Overall Progress Bar */}
          <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <span>{t('progressTitle')}</span>
              <span style={{ color: 'var(--primary)' }}>{progressPercent}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-blue) 100%)',
                borderRadius: '99px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 5 Steps Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = completedSteps.includes(step.id);

          return (
            <div
              key={step.id}
              className="glass-card"
              onClick={() => setActiveTab(step.id)}
              style={{
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                cursor: 'pointer',
                borderLeft: `5px solid ${isDone ? 'var(--accent-green)' : step.color}`,
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: isDone ? 'rgba(16, 185, 129, 0.1)' : `${step.color}15`,
                  color: isDone ? 'var(--accent-green)' : step.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isDone ? <CheckCircle2 size={26} /> : <Icon size={26} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-muted)'
                    }}>
                      {t('step')} 0{step.number}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{step.title}</h3>
                    {isDone && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
                        {t('done')}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 500 }}>
                  {step.anytime ? t('timeAnytime') : `~${step.timeMin} ${step.timeMin === 1 ? t('timeMin') : t('timeMins')}`}
                </span>
                <button
                  className={isDone ? 'btn-secondary' : 'btn-primary'}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <span>{isDone ? t('reviewEdit') : t('enterStep')}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Why StepOne Career Comparison Table */}
      <div className="glass-card fade-in" style={{ marginTop: '2rem', padding: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          💡 Why 10,000+ International Grads Trust StepOne Career
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          See how StepOne stacks up against the paid tools international students actually pay for.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '640px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.7rem 0.75rem', borderBottom: '2px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>Feature</th>
              <th style={{ textAlign: 'left', padding: '0.7rem 0.75rem', borderBottom: '2px solid var(--border-light)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 800 }}>StepOne Career</th>
              <th style={{ textAlign: 'left', padding: '0.7rem 0.75rem', borderBottom: '2px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>Jobscan ($50/mo)</th>
              <th style={{ textAlign: 'left', padding: '0.7rem 0.75rem', borderBottom: '2px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>Teal ($29/mo)</th>
              <th style={{ textAlign: 'left', padding: '0.7rem 0.75rem', borderBottom: '2px solid var(--border-light)', background: 'var(--bg-main)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>LoopCV</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg-main)' : 'white' }}>
                <td style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>{row.feature}</td>
                <td style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-light)', background: 'var(--primary-light)', fontWeight: 700 }}>{renderCell(row.stepone)}</td>
                <td style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>{renderCell(row.jobscan)}</td>
                <td style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>{renderCell(row.teal)}</td>
                <td style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>{renderCell(row.loopcv)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          * Free plan includes all core features. No credit card required.
        </p>
      </div>
    </div>
  );
}

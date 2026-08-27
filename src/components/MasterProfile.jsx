import React, { useState } from 'react';
import { User, GraduationCap, Briefcase, Award, Sparkles, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTranslation } from '../utils/i18n';

export default function MasterProfile({ profileData, setProfileData, markStepDone, setActiveTab, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);

  const [formData, setFormData] = useState(profileData || {
    name: '',
    email: '',
    phone: '',
    targetRole: '',
    education: '',
    major: '',
    gradYear: '',
    skills: '',
    projects: '',
    summary: ''
  });

  const [savedMsg, setSavedMsg] = useState(false);

  // US Graduate Demo Profile
  const handleDemoFill = () => {
    const demo = {
      name: 'Alex Rivera',
      email: 'alex.rivera@berkeley.edu',
      phone: '+1 (510) 642-6000',
      targetRole: 'Associate Product Manager / Product Analyst',
      education: 'UC Berkeley (B.S.)',
      major: 'Business Administration & Data Science',
      gradYear: 'Class of 2026',
      skills: 'User Research, SQL, Figma Wireframing, PRD Drafting, Funnel Analytics, A/B Testing, Agile/Scrum',
      projects: '1. Campus Peer-to-Peer Marketplace (Product Lead): Conducted user research with 300+ students, designed high-fidelity Figma prototypes, launched MVP achieving 1,200+ monthly active users within 2 weeks.\n2. Product Operations Intern @ Bay Tech Startup: Analyzed user onboarding funnels, optimized email drip campaigns, and boosted 30-day user retention by 18%.',
      summary: 'Passionate about leveraging quantitative data and empathetic design to solve real-world user problems. Seeking entry-level APM / Analyst roles with OPT / STEM OPT eligibility.'
    };
    setFormData(demo);
    setProfileData(demo);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setProfileData(formData);
    localStorage.setItem('stepone_profile', JSON.stringify(formData));
    markStepDone('profile');
    setSavedMsg(true);

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch(err) {}

    setTimeout(() => {
      setSavedMsg(false);
    }, 1500);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>{t('step')} 01</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {t('profileTitle')}
              </h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {t('profileDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDemoFill}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--accent-blue)',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Sparkles size={16} />
            {t('fillDemoData')}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Basic Info Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('fullName')}
              </label>
              <input
                type="text"
                required
                placeholder={t('fullNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('targetPosition')}
              </label>
              <input
                type="text"
                required
                placeholder={t('targetPositionPlaceholder')}
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('universityDegree')}
              </label>
              <input
                type="text"
                placeholder={t('universityDegreePlaceholder')}
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('major')}
              </label>
              <input
                type="text"
                placeholder={t('majorPlaceholder')}
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('gradYear')}
              </label>
              <input
                type="text"
                placeholder={t('gradYearPlaceholder')}
                value={formData.gradYear}
                onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              {t('coreSkills')}
            </label>
            <input
              type="text"
              placeholder={t('coreSkillsPlaceholder')}
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              {t('internshipProjects')}
            </label>
            <textarea
              rows={4}
              placeholder={t('internshipProjectsPlaceholder')}
              value={formData.projects}
              onChange={(e) => setFormData({ ...formData, projects: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              {t('personalSummary')}
            </label>
            <textarea
              rows={2}
              placeholder={t('personalSummaryPlaceholder')}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: savedMsg ? 'var(--accent-green)' : 'transparent', fontWeight: 700, transition: 'all 0.3s ease' }}>
              {t('savedLocally')}
            </span>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary">
                {savedMsg ? <><Check size={18} /> {t('savedLocally')}</> : t('saveProfile')}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setProfileData(formData);
                  markStepDone('profile');
                  setActiveTab('headshot');
                }}
              >
                <span>{t('nextHeadshot')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Header from './components/Header';
import Roadmap from './components/Roadmap';
import MasterProfile from './components/MasterProfile';
import HeadshotStudio from './components/HeadshotStudio';
import JobMatcher from './components/JobMatcher';
import InterviewCheatSheet from './components/InterviewCheatSheet';
import ApplicationTracker from './components/ApplicationTracker';
import CareerMentor from './components/CareerMentor';
import AuthModal from './components/AuthModal';
import PaywallModal from './components/PaywallModal';
import { AuthProvider } from './context/AuthContext';
import { QuotaProvider } from './context/QuotaContext';

function MainApp() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [currentLang, setCurrentLang] = useState('en');
  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem('stepone_profile');
      return saved ? JSON.parse(saved) : null;
    } catch(e) {
      return null;
    }
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const saved = localStorage.getItem('stepone_completed');
      return saved ? JSON.parse(saved) : [];
    } catch(e) {
      return [];
    }
  });

  const markStepDone = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      const updated = [...completedSteps, stepId];
      setCompletedSteps(updated);
      localStorage.setItem('stepone_completed', JSON.stringify(updated));
    }
  };

  const handleLoadDemoData = () => {
    const demoProfile = {
      fullName: 'Alex Chen',
      targetPosition: 'Associate Product Manager / Data Analyst',
      universityDegree: 'UC Berkeley (M.S. Computer Science)',
      major: 'Computer Science & Data Analytics',
      gradYear: 'Class of 2026 (OPT / STEM OPT Eligible)',
      coreSkills: 'SQL, Python, React, Figma, Agile, User Research, A/B Testing, Data Analytics',
      internshipProjects: 'Built a predictive customer analytics dashboard during 2-month summer internship; led 4-person campus capstone project delivering high-converting web tools.',
      personalSummary: 'Early-career tech candidate with strong analytical and product execution skills. Fully eligible for F-1 OPT & 36-month STEM OPT in the US.'
    };
    setProfileData(demoProfile);
    localStorage.setItem('stepone_profile', JSON.stringify(demoProfile));
    setCompletedSteps(['profile', 'headshot', 'matcher', 'interview', 'tracker', 'mentor']);
    localStorage.setItem('stepone_completed', JSON.stringify(['profile', 'headshot', 'matcher', 'interview', 'tracker', 'mentor']));
    setActiveTab('matcher');
  };

  // Handler to reset all data and progress back to 0%
  const handleResetAll = () => {
    setProfileData(null);
    setCompletedSteps([]);
    localStorage.removeItem('stepone_profile');
    localStorage.removeItem('stepone_completed');
    localStorage.removeItem('stepone_apikey');
    localStorage.removeItem('stepone_applications');
    setActiveTab('roadmap');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        onResetAll={handleResetAll}
        onLoadDemo={handleLoadDemoData}
      />

      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {activeTab === 'roadmap' && (
          <Roadmap
            setActiveTab={setActiveTab}
            completedSteps={completedSteps}
            currentLang={currentLang}
            onResetAll={handleResetAll}
            onLoadDemo={handleLoadDemoData}
          />
        )}

        {activeTab === 'profile' && (
          <MasterProfile
            profileData={profileData}
            setProfileData={setProfileData}
            markStepDone={markStepDone}
            setActiveTab={setActiveTab}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'matcher' && (
          <JobMatcher
            profileData={profileData}
            markStepDone={markStepDone}
            setActiveTab={setActiveTab}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewCheatSheet
            profileData={profileData}
            markStepDone={markStepDone}
            setActiveTab={setActiveTab}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'tracker' && (
          <ApplicationTracker
            profileData={profileData}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'mentor' && (
          <CareerMentor
            profileData={profileData}
            markStepDone={markStepDone}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'headshot' && (
          <HeadshotStudio
            profileData={profileData}
            markStepDone={markStepDone}
            setActiveTab={setActiveTab}
            currentLang={currentLang}
          />
        )}
      </main>

      <AuthModal />
      <PaywallModal />

      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        borderTop: '1px solid var(--border-light)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        background: 'white'
      }}>
        <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          StepOne Career © 2026 · Operated by Clarity Clinical Solutions LLC
        </p>
        <p style={{ fontSize: '0.75rem' }}>
          AI Career Companion for International Students (F-1 / OPT / STEM OPT) & US New Grads · All payments securely processed via Stripe
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QuotaProvider>
        <MainApp />
      </QuotaProvider>
    </AuthProvider>
  );
}

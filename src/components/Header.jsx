import React, { useState, useEffect } from 'react';
import { Rocket, Globe, RotateCcw, Sparkles, User, LogOut, Zap, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab, setActiveTab, currentLang, setCurrentLang, onResetAll, onLoadDemo }) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const { user, isLoggedIn, isPro, tier, logout, deleteAccount, setShowAuthModal, triggerPaywall } = useAuth();
  const t = (key) => getTranslation(currentLang, key);

  // Listen for PWA installation prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("To install StepOne Career on your device:\n\n• On Chrome/Edge: Click the install icon in the address bar.\n• On Android: Tap Chrome menu (⋮) → 'Install app' or 'Add to Home screen'.\n• On iPhone: Tap Share icon (⬆️) → 'Add to Home Screen'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Keep <html lang> and text direction (RTL for Arabic) in sync with the UI language.
  useEffect(() => {
    document.documentElement.lang = currentLang === 'en' ? 'en-US' : currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  }, [currentLang]);

  const languages = [
    { code: 'en', name: 'US English', flag: '🇺🇸' },
    { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹' },
    { code: 'pt', name: 'Português (Portuguese)', flag: '🇧🇷' },
    { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
    { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
    { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
    { code: 'ms', name: 'Bahasa Melayu (Malay)', flag: '🇲🇾' },
    { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' }
  ];

  const handleResetClick = () => {
    if (window.confirm(t('confirmReset'))) {
      onResetAll();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ DELETE ACCOUNT & DATA CONFIRMATION:\n\nAre you sure you want to permanently delete your account, resume profile, and all saved job tracker data?\n\nThis action is irreversible and complies with Google Play Account Deletion Policy."
    );
    if (confirmed) {
      const res = await deleteAccount();
      if (res?.error) {
        alert("Could not delete account: " + (res.error.message || "Unknown error"));
      } else {
        alert("Your account and all personal data have been permanently deleted.");
        setShowUserMenu(false);
      }
    }
  };

  const selectedLangObj = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-light)',
      padding: '0.85rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand Logo & Ecosystem Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            onClick={() => setActiveTab('roadmap')}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Rocket size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>StepOne</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Career</span>
                <span style={{
                  fontSize: '0.65rem',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: 700
                }}>i18n 13-Lang</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('subtitle')}</p>
            </div>
          </div>

          {/* Sister Platform Link: StepOne College */}
          <a
            href="https://college.steponecareer.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Switch to StepOne College - US University Search & Admissions Platform for High Schoolers & Parents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: 'var(--primary)',
              padding: '4px 10px',
              borderRadius: '99px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🎓 StepOne College</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>↗</span>
          </a>
        </div>

        {/* Navigation Pills */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', padding: '2px' }}>
          {[
            { id: 'roadmap', label: t('navRoadmap') },
            { id: 'profile', label: t('navProfile') },
            { id: 'matcher', label: t('navMatcher') },
            { id: 'interview', label: t('navInterview') },
            { id: 'tracker', label: '📊 App Tracker' },
            { id: 'mentor', label: t('navMentor') },
            { id: 'headshot', label: t('navHeadshot') }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: activeTab === item.id ? 700 : 500,
                background: activeTab === item.id ? 'var(--primary)' : 'transparent',
                color: activeTab === item.id ? 'white' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Action Bar: Demo + Pro Upgrade + Auth + Lang + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', position: 'relative', flexWrap: 'wrap' }}>
          
          {/* Pro Badge or Upgrade to Pro Button */}
          {isPro ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.2))',
              border: '1px solid var(--accent-green)',
              color: 'var(--accent-green)',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <Zap size={14} /> {tier === 'lifetime' ? 'PRO LIFETIME' : 'PRO MEMBER'}
            </span>
          ) : (
            <button
              onClick={() => triggerPaywall('Unlock unlimited JD Matcher, ATS PDF exports, and interview preparation.')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Zap size={14} /> Upgrade $7.99
            </button>
          )}

          {/* User Sign-In / Account Dropdown */}
          {isLoggedIn ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <User size={14} color="var(--primary)" />
                <span>{user?.email?.split('@')[0] || 'Account'}</span>
              </button>

              {showUserMenu && (
                <div className="glass-card fade-in" style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '200px',
                  padding: '0.5rem',
                  zIndex: 100,
                  boxShadow: 'var(--shadow-lg)',
                  background: 'white'
                }}>
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>

                  <button
                    onClick={handleDeleteAccount}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'transparent',
                      borderTop: '1px solid var(--border-light)',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      color: 'var(--accent-rose)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: '0.25rem'
                    }}
                  >
                    <Trash2 size={13} color="var(--accent-rose)" /> Delete Account & Data
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'white',
                border: '1px solid var(--border-light)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}

          {/* 1-Click Try Demo Profile */}
          <button
            onClick={onLoadDemo}
            title="Instantly populate demo data and test all features in 3s"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(124, 58, 237, 0.12) 100%)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="var(--primary)" />
            <span>✨ Demo</span>
          </button>
          
          {/* Language Selector Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main)'
              }}
            >
              <Globe size={15} color="var(--primary)" />
              <span>{selectedLangObj.flag}</span>
            </button>

            {/* Expanded 2-Column Spacious Language Dropdown */}
            {showLangMenu && (
              <div className="glass-card fade-in" style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '360px',
                padding: '0.75rem',
                zIndex: 100,
                boxShadow: 'var(--shadow-lg)'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, padding: '0.2rem 0.4rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  🌐 Select Language (13 Global Languages)
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLang(lang.code);
                        setShowLangMenu(false);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: currentLang === lang.code ? 'var(--primary-light)' : 'var(--bg-main)',
                        color: currentLang === lang.code ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: currentLang === lang.code ? 700 : 500,
                        border: currentLang === lang.code ? '1px solid var(--primary)' : '1px solid transparent'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Install PWA App Button */}
          <button
            onClick={handleInstallApp}
            title="Install StepOne Career as a Desktop or Mobile App"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(79, 70, 229, 0.08)',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span className="hidden-mobile">App</span>
          </button>

          {/* Reset Progress Button (归零重置) */}
          <button
            onClick={handleResetClick}
            title="Reset All Data and Progress back to 0%"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

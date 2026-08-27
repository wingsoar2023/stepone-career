import React, { useState, useEffect } from 'react';
import { Plus, Mail, Trash2, CheckCircle2, Clock, XCircle, Award, Copy, Download, Sparkles, ChevronDown, ChevronUp, Cloud, HardDrive, ShieldCheck } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import { useAuth } from '../context/AuthContext';
import { useQuota } from '../context/QuotaContext';
import { supabase } from '../lib/supabaseClient';

const jobBoards = [
  { icon: '🎓', name: 'Handshake', desc: 'Best for OPT/New Grad campus recruiting', url: 'https://joinhandshake.com' },
  { icon: '💼', name: 'LinkedIn Jobs', desc: 'Filter by "OPT", "New Grad", "Entry Level"', url: 'https://linkedin.com/jobs' },
  { icon: '🏢', name: 'H1B Grader', desc: 'Real LCA sponsorship history by company', url: 'https://h1bgrader.com' },
  { icon: '💰', name: 'Levels.fyi Jobs', desc: 'Tech roles with real comp data + visa info', url: 'https://www.levels.fyi/jobs' },
  { icon: '🔍', name: 'Simplify Jobs', desc: 'One-click apply to 1000s of tech roles', url: 'https://simplify.jobs' },
  { icon: '📊', name: 'Indeed', desc: 'Largest job database, filter "Visa Sponsor"', url: 'https://indeed.com' },
  { icon: '🚀', name: 'Glassdoor', desc: 'Company reviews + visa sponsor tags', url: 'https://glassdoor.com/Job' }
];

export default function ApplicationTracker({ profileData, currentLang }) {
  const t = (key) => getTranslation(currentLang, key);
  const { user, isLoggedIn, isPro, triggerPaywall, setShowAuthModal } = useAuth();
  const { getQuota } = useQuota();
  const [showJobBoards, setShowJobBoards] = useState(true);

  const defaultApplications = [
    {
      id: 1,
      company: 'Amazon',
      role: 'Software Development Engineer I (Entry-Level)',
      date: '2026-08-15',
      status: 'interview',
      notes: 'Passed initial OA, scheduled for 45-min Behavioral & Coding screen.'
    },
    {
      id: 2,
      company: 'Google',
      role: 'Associate Product Manager (APM 2026)',
      date: '2026-08-20',
      status: 'applied',
      notes: 'Applied via referral. STEM OPT eligible tag submitted.'
    },
    {
      id: 3,
      company: 'ByteDance / TikTok',
      role: 'Data Scientist - Graduate 2026',
      date: '2026-08-10',
      status: 'applied',
      notes: '7 days since submission. Ready for 1-click follow-up email.'
    }
  ];

  const [applications, setApplications] = useState(() => {
    try {
      const saved = localStorage.getItem('stepone_applications');
      return saved ? JSON.parse(saved) : defaultApplications;
    } catch (e) {
      return defaultApplications;
    }
  });

  // Fetch from Supabase if logged in
  useEffect(() => {
    if (!supabase || !user) return;

    const fetchCloudApps = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setApplications(data);
          localStorage.setItem('stepone_applications', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Could not fetch cloud applications:', err);
      }
    };

    fetchCloudApps();
  }, [user]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState('applied');
  const [newNotes, setNewNotes] = useState('');

  const [activeEmailApp, setActiveEmailApp] = useState(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const saveApplications = (newList) => {
    setApplications(newList);
    localStorage.setItem('stepone_applications', JSON.stringify(newList));
  };

  const handleOpenAddModal = () => {
    if (!isPro && applications.length >= 10) {
      triggerPaywall('Free plan allows up to 10 tracked job applications. Upgrade to Pro for unlimited submissions.');
      return;
    }
    setShowAddModal(true);
  };

  const handleAddApplication = async (e) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;
    const newItem = {
      id: Date.now(),
      company: newCompany,
      role: newRole,
      date: newDate,
      status: newStatus,
      notes: newNotes
    };
    
    saveApplications([newItem, ...applications]);

    // Async sync to Supabase if logged in
    if (supabase && user) {
      supabase.from('applications').insert([{
        user_id: user.id,
        company: newCompany,
        role: newRole,
        date: newDate,
        status: newStatus,
        notes: newNotes
      }]).then();
    }

    setNewCompany('');
    setNewRole('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this job application tracking record?')) {
      const updated = applications.filter(a => a.id !== id);
      saveApplications(updated);

      if (supabase && user && typeof id !== 'number') {
        supabase.from('applications').delete().eq('id', id).then();
      }
    }
  };

  const handleStatusChange = (id, newStat) => {
    const updated = applications.map(a => a.id === id ? { ...a, status: newStat } : a);
    saveApplications(updated);

    if (supabase && user && typeof id !== 'number') {
      supabase.from('applications').update({ status: newStat }).eq('id', id).then();
    }
  };

  const generateFollowUpEmail = (app) => {
    setActiveEmailApp(app);
    const candidateName = profileData?.fullName || 'Alex Chen';
    const candidateDegree = profileData?.universityDegree || 'M.S. Computer Science';

    const emailText = `Subject: Following Up on Application - ${app.role} (${candidateName})

Dear Hiring Team at ${app.company},

I hope this message finds you well!

I recently submitted my application for the ${app.role} position on ${app.date}. As a graduate with a degree in ${candidateDegree}, I am exceptionally enthusiastic about ${app.company}'s mission and the impact of this team.

I am writing to express my continued interest in the role and to kindly check if there are any updates regarding the status of my application or any additional information I can provide.

I have attached my updated resume for your reference. Thank you very much for your time and consideration!

Warm regards,

${candidateName}
${profileData?.targetPosition || app.role} Candidate
OPT / STEM OPT Eligible`;

    setGeneratedEmail(emailText);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'interview':
        return <span style={{ background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> Interviewing</span>;
      case 'offer':
        return <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Award size={13} /> Offer Received</span>;
      case 'rejected':
        return <span style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent-rose)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13} /> Rejected</span>;
      default:
        return <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Applied</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="glass-card fade-in" style={{ padding: '1.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                📊 Reddit Demand #23 Resolved
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Job Application Tracker & 1-Click Follow-Up AI</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Track all your active US job submissions in one place and draft polite recruiter follow-up emails in 1 click.
            </p>

            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem' }}>
              {isLoggedIn ? (
                <span style={{ color: 'var(--accent-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Cloud size={14} /> Cloud Sync Active ({user?.email})
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                >
                  <HardDrive size={14} /> Saved in browser · Click to sign in and sync to cloud
                </button>
              )}
              
              <span style={{ color: 'var(--text-light)' }}>•</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {isPro ? '⚡ Unlimited Tracker Entries' : `${applications.length}/10 Free Submissions Tracked`}
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
          >
            <Plus size={18} />
            <span>Add Job Submission</span>
          </button>
        </div>
      </div>

      {/* H-1B Friendly Job Discovery Channel */}
      <div className="glass-card fade-in" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔍 Find H-1B Friendly Roles First
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--accent-green)',
              padding: '2px 10px',
              borderRadius: '99px',
              whiteSpace: 'nowrap'
            }}>
              Powered by OPT Data
            </span>
            <button
              onClick={() => setShowJobBoards(!showJobBoards)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
              title={showJobBoards ? 'Collapse' : 'Expand'}
            >
              {showJobBoards ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: showJobBoards ? '1rem' : 0 }}>
          Curated job boards where OPT / STEM OPT & H-1B sponsorship candidates have the best hit rate.
        </p>

        {showJobBoards && (
          <div style={{ display: 'flex', overflowX: 'auto', gap: '0.75rem', paddingBottom: '0.25rem' }}>
            {jobBoards.map((board) => (
              <div
                key={board.name}
                onClick={() => window.open(board.url, '_blank', 'noopener,noreferrer')}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') window.open(board.url, '_blank', 'noopener,noreferrer'); }}
                style={{
                  minWidth: '160px',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{board.icon}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{board.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{board.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Application List + Follow Up Email Modal/Section */}
      <div style={{ display: 'grid', gridTemplateColumns: activeEmailApp ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        
        {/* Table / List */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Tracked Submissions ({applications.length})</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Saved locally in browser</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {applications.map(app => (
              <div
                key={app.id}
                style={{
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{app.company}</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600 }}>{app.role}</p>
                  </div>
                  <div>{getStatusBadge(app.status)}</div>
                </div>

                {app.notes && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'white', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    📝 {app.notes}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-light)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Applied on: <strong>{app.date}</strong></span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Status Dropdown */}
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-light)' }}
                    >
                      <option value="applied">Applied</option>
                      <option value="interview">Interviewing</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    {/* Draft Email Button */}
                    <button
                      onClick={() => generateFollowUpEmail(app)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Mail size={13} />
                      Draft Follow-Up
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(app.id)}
                      style={{ color: 'var(--accent-rose)', padding: '4px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                      title="Delete entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1-Click Follow-Up Email Editor Modal/Pane */}
        {activeEmailApp && (
          <div className="glass-card fade-in" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recruiter Follow-Up Email</h3>
              </div>
              <button onClick={() => setActiveEmailApp(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Ready to send to HR / Recruiter at <strong>{activeEmailApp.company}</strong> for position <strong>{activeEmailApp.role}</strong>.
            </p>

            <textarea
              value={generatedEmail}
              onChange={(e) => setGeneratedEmail(e.target.value)}
              rows={14}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontFamily: 'monospace',
                fontSize: '0.83rem',
                lineHeight: 1.5,
                marginBottom: '1rem',
                background: 'var(--bg-main)'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={copyEmail}
                className="btn-primary"
                style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.65rem' }}
              >
                <Copy size={16} />
                <span>{copied ? '✓ Copied to Clipboard!' : 'Copy Email Text'}</span>
              </button>

              <button
                onClick={() => setActiveEmailApp(null)}
                style={{ padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Submission Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', background: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Add New Job Submission</h3>
            <form onSubmit={handleAddApplication} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meta / Apple / McKinsey"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Associate Data Analyst"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Submission Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                  >
                    <option value="applied">Applied</option>
                    <option value="interview">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Notes & Reminders</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Referral code used, STEM OPT mentioned..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.65rem' }}>Save Submission</button>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'white' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

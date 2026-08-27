import React, { useState } from 'react';
import { X, Shield, FileText, AlertTriangle, Scale, CheckCircle2, Lock } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab if initialTab changes when opening
  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="glass-card fade-in" style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-main)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Scale size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Legal & Compliance Center
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                StepOne Career · Operated by Clarity Clinical Solutions LLC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-light)',
          background: 'white',
          overflowX: 'auto',
          padding: '0 1rem'
        }}>
          {[
            { id: 'privacy', label: 'Privacy Policy', icon: Shield },
            { id: 'disclaimer', label: 'Immigration & AI Disclaimer', icon: AlertTriangle },
            { id: 'terms', label: 'Terms of Service', icon: FileText },
            { id: 'refund', label: 'Refund Policy', icon: Lock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{
          padding: '1.75rem',
          overflowY: 'auto',
          flex: 1,
          fontSize: '0.85rem',
          lineHeight: '1.65',
          color: 'var(--text-main)'
        }}>

          {/* TAB 1: Privacy Policy */}
          {activeTab === 'privacy' && (
            <div className="fade-in">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Privacy Policy (CCPA & Global Standards)
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                Effective Date: August 1, 2026 · Last Updated: August 27, 2026
              </p>

              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <strong style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> Zero Data Selling Guarantee
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.25rem', display: 'block' }}>
                  We respect the confidential nature of your job search. StepOne Career will <strong>never sell, rent, or monetize your resume, contact info, or job application data</strong> to third-party data brokers, advertisers, or recruiters without your explicit permission.
                </span>
              </div>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>1. Information We Collect</h5>
              <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
                <li><strong>Account Data:</strong> Email address and authentication tokens via Supabase Auth / Google OAuth.</li>
                <li><strong>Profile & Resume Content:</strong> Educational degree, major, target job titles, core skills, and internship summaries you voluntarily provide to tailor cover letters and STAR interview cards.</li>
                <li><strong>Speech & Audio Data:</strong> Speech Pitch audio is processed <strong>locally in your browser</strong> using standard Web Speech APIs. Audio recordings are never uploaded to or stored on external servers.</li>
                <li><strong>Payment Information:</strong> Financial transactions are processed directly by <strong>Stripe, Inc.</strong> We never store credit card numbers, CVVs, or full billing addresses on our servers.</li>
              </ul>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>2. Data Security & Storage</h5>
              <p style={{ marginBottom: '0.5rem' }}>
                User profiles and job tracking items are encrypted in transit (TLS 1.3) and protected via Row Level Security (RLS) policies on enterprise PostgreSQL databases hosted by Supabase.
              </p>
              <p style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                🔒 <strong style={{ color: 'var(--text-main)' }}>Technical Trust Note (for CS users):</strong> Our database enforces RLS at the PostgreSQL engine level. This means no administrator — including our own development team — can access another user's profile data. You can independently verify that our Speech Pitch feature makes zero network upload requests by inspecting the Network tab in your browser's DevTools.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>3. Your Rights & Data Deletion</h5>
              <p>
                You retain full ownership of your data. You may export or permanently delete your profile, application history, and account at any time using the Reset button or by emailing <a href="mailto:clarityclinicalsolutions@gmail.com" style={{ color: 'var(--primary)' }}>clarityclinicalsolutions@gmail.com</a>.
              </p>
            </div>
          )}

          {/* TAB 2: Immigration & AI Disclaimer */}
          {activeTab === 'disclaimer' && (
            <div className="fade-in">
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <AlertTriangle size={18} /> Important Legal & Immigration Notice
                </h4>
                <p style={{ fontSize: '0.82rem', marginTop: '0.4rem', marginBottom: 0, color: 'var(--text-main)', fontWeight: 600 }}>
                  StepOne Career is NOT a law firm and does NOT provide legal, immigration, or USCIS advice.
                </p>
              </div>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>1. No Attorney-Client Relationship</h5>
              <p style={{ marginBottom: '1rem' }}>
                The materials, tools, H-1B company database, and AI consultation generated by StepOne Career (and its operating entity Clarity Clinical Solutions LLC) are provided solely for <strong>general informational and career preparation purposes</strong>. No attorney-client relationship is formed through the use of this website.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>2. Official Immigration Matters (F-1 OPT, STEM OPT & H-1B)</h5>
              <p style={{ marginBottom: '1rem' }}>
                United States immigration policies (including USCIS regulations, SEVIS compliance, Form I-20, Form I-765, OPT unemployment clocks, and H-1B lottery rules) are subject to continuous change. You must consult your university's Designated School Official (DSO) or a licensed US immigration attorney for advice regarding your individual legal status.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>3. Public Department of Labor (DOL) Data</h5>
              <p style={{ marginBottom: '1rem' }}>
                Our H-1B sponsorship history database is derived from public US Department of Labor (DOL) Labor Condition Application (LCA) filings and USCIS employer data. Past sponsorship history is not a guarantee that an employer will sponsor visas for any specific role or candidate in the future.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>4. AI Content Generation Disclaimer</h5>
              <p>
                StepOne Career uses heuristic rules and algorithmic engines to generate suggested resume bullet points, ATS match scores, cover letters, and STAR responses. AI outputs may contain inaccuracies. Users have the <strong>sole and non-delegable responsibility</strong> to review, verify, and ensure the factual accuracy of all AI-generated application materials prior to submission to any employer, USCIS office, or immigration authority. Clarity Clinical Solutions LLC accepts no liability for outcomes resulting from unverified AI-generated content.
              </p>
            </div>
          )}

          {/* TAB 3: Terms of Service */}
          {activeTab === 'terms' && (
            <div className="fade-in">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Terms of Service
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                Please read these terms carefully before using StepOne Career.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>1. Acceptance of Terms</h5>
              <p style={{ marginBottom: '1rem' }}>
                By accessing or using StepOne Career (steponecareer.com), you agree to be bound by these Terms of Service and all applicable federal and state laws of the United States. StepOne Career is owned and operated by Clarity Clinical Solutions LLC.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>2. Subscription Plans & Fair Use Policy</h5>
              <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
                <li><strong>Free Tier:</strong> Includes 5 JD match analyses/mo, 3 STAR cards, 3 speech coaching runs, and 10 tracked applications.</li>
                <li><strong>Pro Monthly ($7.99/mo):</strong> Recurring monthly subscription granting 300 AI runs/month, ATS PDF export, and full cloud synchronization. Cancelable anytime in 1 click.</li>
                <li><strong>Pioneer Lifetime Access ($29.00 one-time):</strong> Grants perpetual access to Pro tools under a Fair Use Policy ceiling of 150 AI runs/month (resets on the 1st of every month). Restricted to individual personal use; automated scraping or sharing accounts is prohibited.</li>
              </ul>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>3. Disclaimer of Warranties & Limitation of Liability</h5>
              <p style={{ marginBottom: '1rem' }}>
                The service is provided on an "AS IS" and "AS AVAILABLE" basis. While StepOne Career is designed to optimize application performance, we do not guarantee job offers, interview callbacks, or visa approvals. To the maximum extent permitted by law, Clarity Clinical Solutions LLC shall not be liable for any indirect, incidental, or consequential damages.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>4. Indemnification</h5>
              <p style={{ marginBottom: '1rem' }}>
                By using StepOne Career, you agree to <strong>indemnify, defend, and hold harmless</strong> Clarity Clinical Solutions LLC, its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in connection with: (a) your use of or access to the Service; (b) your violation of these Terms of Service; (c) any immigration or employment decision you make based on information provided by the platform; or (d) your violation of any third-party rights.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>5. Governing Law</h5>
              <p>
                These Terms of Service shall be governed by the laws of the State of California, United States, without regard to its conflict of law provisions. Any disputes shall be resolved exclusively in the state or federal courts located in Sacramento County, California.
              </p>
            </div>
          )}

          {/* TAB 4: Refund Policy */}
          {activeTab === 'refund' && (
            <div className="fade-in">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                30-Day Money-Back Guarantee & Refund Policy
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                We want you to feel 100% confident in your investment in StepOne Career.
              </p>

              <div style={{ background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> 100% Risk-Free Guarantee
                </strong>
                <p style={{ fontSize: '0.82rem', marginTop: '0.35rem', marginBottom: 0 }}>
                  If StepOne Career does not help you improve your ATS match scores or prepare for interviews, you are entitled to a full refund within 30 days of purchase.
                </p>
              </div>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>1. How to Request a Refund</h5>
              <p style={{ marginBottom: '1rem' }}>
                To request a refund, simply send an email to <a href="mailto:clarityclinicalsolutions@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>clarityclinicalsolutions@gmail.com</a> with your purchase email address and the subject line <em>"Refund Request - StepOne Career"</em>. We will process your 100% refund via Stripe within 2 business days.
              </p>

              <h5 style={{ fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem' }}>2. Subscription Cancellation</h5>
              <p>
                To cancel your monthly subscription and stop future billing, email <a href="mailto:clarityclinicalsolutions@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>clarityclinicalsolutions@gmail.com</a> with the subject line <em>"Cancel Subscription - StepOne Career"</em>. You will receive a cancellation confirmation within 1 business day. Upon confirmed cancellation, you will retain full Pro access until the end of your current billing period — no partial-month charges.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-main)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <span>Legal Entity: Clarity Clinical Solutions LLC (US)</span>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '0.45rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
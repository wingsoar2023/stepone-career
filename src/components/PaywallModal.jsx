import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, ShieldCheck, Zap, Award, Star, CreditCard, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isIapAvailable, getIapOfferings, purchaseIapPackage, pickPackage, diagnoseIap } from '../lib/iap';

const STRIPE_MONTHLY_URL = import.meta.env.VITE_STRIPE_MONTHLY_URL || 'https://buy.stripe.com/eVq28r0MDb8mekk1tW7ok00';
const STRIPE_LIFETIME_URL = import.meta.env.VITE_STRIPE_LIFETIME_URL || 'https://buy.stripe.com/14A7sL52T0tI900egI7ok01';

export default function PaywallModal() {
  const { showPaywallModal, setShowPaywallModal, paywallReason, upgradeToPro, isPro, isIOS } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' | 'lifetime'
  const [isProcessing, setIsProcessing] = useState(false);
  const [iapPackages, setIapPackages] = useState([]);
  const [iapError, setIapError] = useState('');
  const [iapStatus, setIapStatus] = useState('idle'); // idle | loading | ready | unavailable | error
  const [iapDiag, setIapDiag] = useState('');

  useEffect(() => {
    if (!showPaywallModal || !isIOS) return;
    setIapError('');
    setIapDiag('');

    if (!isIapAvailable()) {
      setIapStatus('unavailable');
      setIapError('In-app purchases are unavailable in this build. Please update the app to the latest version.');
      return;
    }

    setIapStatus('loading');
    let cancelled = false;

    diagnoseIap().then((info) => {
      if (!cancelled) setIapDiag(info);
    });

    getIapOfferings().then((pkgs) => {
      if (cancelled) return;
      setIapPackages(pkgs);
      if (pkgs.length === 0) {
        setIapStatus('error');
        setIapError('Could not load store items. Please try again in a few minutes.');
      } else {
        setIapStatus('ready');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showPaywallModal, isIOS]);

  // iOS renders its own StoreKit purchase flow (Guideline 3.1.1 compliant)
  if (!showPaywallModal) return null;

  const handleIapPurchase = async () => {
    const pkg = pickPackage(iapPackages, selectedPlan) || iapPackages[0];
    if (!pkg) {
      setIapError('Store item is unavailable. Please try again shortly.');
      return;
    }
    setIsProcessing(true);
    setIapError('');
    const res = await purchaseIapPackage(pkg.raw || pkg);
    setIsProcessing(false);
    if (res.cancelled) return;
    if (!res.success) {
      setIapError(res.error?.message || 'Purchase could not be completed.');
      return;
    }
    await upgradeToPro(selectedPlan === 'lifetime' ? 'lifetime' : 'pro');
    setShowPaywallModal(false);
  };

  const handleCheckout = (plan) => {
    setIsProcessing(true);
    
    // Redirect directly to live Stripe Checkout
    const targetUrl = plan === 'lifetime' ? STRIPE_LIFETIME_URL : STRIPE_MONTHLY_URL;

    if (targetUrl) {
      window.location.href = targetUrl;
      return;
    }

    // Fallback simulation
    setTimeout(async () => {
      await upgradeToPro(plan === 'lifetime' ? 'lifetime' : 'pro');
      setIsProcessing(false);
      setShowPaywallModal(false);
    }, 900);
  };

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
      zIndex: 1000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="glass-card fade-in" style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '640px',
        padding: '2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={() => setShowPaywallModal(false)}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Reason Alert (if triggered by quota exhaustion) */}
        {paywallReason && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.9rem',
            fontSize: '0.82rem',
            color: '#B45309',
            fontWeight: 600,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sparkles size={16} />
            {paywallReason}
          </div>
        )}

        {/* Header with Direct Value Comparison */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(124, 58, 237, 0.12))',
            color: 'var(--primary)',
            padding: '4px 14px',
            borderRadius: '99px',
            fontSize: '0.78rem',
            fontWeight: 800,
            marginBottom: '0.5rem'
          }}>
            <Zap size={14} /> STEPONE CAREER PRO
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Land US Interviews 3× Faster
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Jobscan charges <strong>$50/mo</strong> · StepOne is <strong>$7.99/mo</strong> · <strong>Save $504/year</strong>
          </p>
        </div>

        {/* Pricing Cards Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          
          {/* Plan 1: Pro Monthly */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            style={{
              border: selectedPlan === 'monthly' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: selectedPlan === 'monthly' ? 'rgba(79, 70, 229, 0.03)' : 'white',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Monthly Pro</div>
            <div style={{ margin: '0.4rem 0' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>$7.99</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}> / month</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Full access. Billed monthly, cancel anytime with 1 click.
            </p>
          </div>

          {/* Plan 2: Lifetime Deal */}
          <div
            onClick={() => setSelectedPlan('lifetime')}
            style={{
              border: selectedPlan === 'lifetime' ? '2px solid var(--accent-green)' : '1px solid var(--border-light)',
              background: selectedPlan === 'lifetime' ? 'rgba(16, 185, 129, 0.03)' : 'white',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
              background: 'var(--accent-green)',
              color: 'white',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '99px',
              textTransform: 'uppercase'
            }}>
              🔥 Pioneer Cohort (500 Max)
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Early-Bird Lifetime</div>
            <div style={{ margin: '0.4rem 0' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-green)' }}>$29</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}> one-time</span>
            </div>
            
            {/* Scarcity & Honest Math Comparison */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              padding: '0.35rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              color: 'var(--accent-green)',
              fontWeight: 700,
              marginBottom: '0.45rem'
            }}>
              💡 Jobscan 18 days = $30 · StepOne Lifetime = $29
            </div>

            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Pay once, keep forever. <strong>150 AI runs/mo</strong> (10× more than Free).
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div style={{
          background: 'var(--bg-main)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Everything included in Pro:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem', fontSize: '0.82rem' }}>
            {[
              '∞ Unlimited JD Match & Tailoring',
              '📄 ATS Resume & Cover Letter PDF Export',
              '🎙️ Unlimited 60s Speech Pitch AI Coach',
              '🎯 Unlimited STAR Interview Question Cards',
              '🤝 Unlimited LinkedIn & Alumni Networking Messages',
              '📊 Unlimited Application Tracker with Cloud Sync',
              '🤖 Unlimited Career Mentor AI Consultation',
              '🛡️ Full H-1B LCA Sponsorship Database (10,000+ Cos)'
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Check size={14} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.9rem',
          background: 'rgba(79, 70, 229, 0.06)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.78rem',
          color: 'var(--primary)',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}>
          <TrendingUp size={16} style={{ flexShrink: 0 }} />
          <span>Built with feedback from international students in r/F1Visa & r/cscareerquestions · Free to try, no credit card needed.</span>
        </div>

        {/* CTA Button — iOS uses Apple In-App Purchase (StoreKit); web uses Stripe redirect */}
        {isIOS && (
          <>
            {iapError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.08)',
                color: 'var(--accent-rose)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                marginBottom: '0.75rem'
              }}>
                {iapError}
              </div>
            )}
            <button
              onClick={handleIapPurchase}
              disabled={isProcessing || iapPackages.length === 0}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                opacity: iapPackages.length === 0 ? 0.6 : 1,
                background: selectedPlan === 'lifetime' ? 'linear-gradient(135deg, #059669, #10B981)' : 'var(--primary)'
              }}
            >
              {isProcessing
                ? 'Waiting for App Store...'
                : iapStatus === 'loading'
                  ? 'Checking App Store...'
                  : pickPackage(iapPackages, selectedPlan)?.priceString
                    ? `${selectedPlan === 'lifetime' ? 'Claim My Pioneer Spot' : 'Start Pro'} · ${pickPackage(iapPackages, selectedPlan).priceString}`
                    : 'Purchase via App Store'}
            </button>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', textAlign: 'center', marginTop: '0.5rem' }}>
              Payment is charged to your Apple ID and managed by the App Store. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the period. Manage or cancel anytime in your Apple ID settings.
            </p>
            {iapDiag && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-light)', textAlign: 'center', marginTop: '0.35rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {iapDiag}
              </p>
            )}
          </>
        )}
        {!isIOS && (
          <button
            onClick={() => handleCheckout(selectedPlan)}
            disabled={isProcessing}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: selectedPlan === 'lifetime' ? 'linear-gradient(135deg, #059669, #10B981)' : 'var(--primary)'
            }}
          >
            {isProcessing ? (
              'Redirecting to Secure Checkout...'
            ) : (
              <>
                <CreditCard size={18} />
                {selectedPlan === 'lifetime' ? 'Claim My Pioneer Spot · $29 One-Time' : 'Start Pro for $7.99 / month'}
              </>
            )}
          </button>
        )}

        {/* Guarantees & Security */}
        <div style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldCheck size={14} color="var(--accent-green)" /> 30-Day Full Refund Guarantee
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Star size={14} color="var(--accent-amber)" /> Encrypted Stripe Checkout
          </span>
        </div>
      </div>
    </div>
  );
}

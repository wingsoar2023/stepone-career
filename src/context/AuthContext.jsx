import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isNativeIOS } from '../lib/platform';
import { getActiveProPurchase } from '../lib/iap';
import { verifyServerEntitlement, syncIapEntitlementViaGatekeeper } from '../lib/gatekeeper';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // SECURITY FIX (JEV Q3 #3): Never initialize or trust tier from localStorage.
  // Default strictly to 'free' until verified by server-side profile or verified StoreKit transaction.
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');

  // Open paywall with a reason.
  // Web: Stripe checkout modal. iOS: StoreKit (Apple In-App Purchase) via the same modal.
  const triggerPaywall = (reason = '') => {
    setPaywallReason(reason);
    setShowPaywallModal(true);
  };

  // Fetch or create profile from Supabase
  const loadUserProfile = async (userId) => {
    if (!supabase || !userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        // Tier is stored server-side and is shared between web (Stripe) and iOS (Apple IAP).
        const userTier = data.tier || 'free';
        setTier(userTier);
      } else if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet, create initial profile
        const initialTier = 'free';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ id: userId, tier: initialTier }])
          .select()
          .single();
        if (newProfile) {
          setProfile(newProfile);
          setTier(initialTier);
        }
      }
    } catch (err) {
      console.warn('Error loading user profile:', err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setTier('free');
      }
      setLoading(false);
    });

    // 1b. Restore & re-sync Apple In-App Purchase entitlements (covers renewals, reinstalls, and post-launch sign-in)
    const syncNativeIosEntitlement = (activeUserId = null) => {
      if (!isNativeIOS()) return;
      setTimeout(() => {
        getActiveProPurchase().then(async (purchase) => {
          if (!purchase) return;
          const activePlan = purchase.planType === 'lifetime' ? 'lifetime' : 'pro';
          const targetUserId = activeUserId || (await supabase.auth.getSession())?.data?.session?.user?.id;
          if (targetUserId) {
            const syncRes = await syncIapEntitlementViaGatekeeper({
              planType: activePlan,
              purchase
            });
            if (syncRes.success) {
              setTier(syncRes.tier);
              await loadUserProfile(targetUserId);
            }
          } else {
            setTier(activePlan);
          }
        });
      }, 1200);
    };

    syncNativeIosEntitlement();

    // 2. Listen to auth state changes
    // Note: no awaited Supabase calls inside this callback (deadlock risk per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
        syncNativeIosEntitlement(session.user.id);
      } else {
        setProfile(null);
        setTier('free');
      }
      setLoading(false);
    });

    // 3. Handle Stripe Payment Return Redirect (?payment=success)
    // SECURITY FIX (JEV Gatekeeper): Never trust URL query parameters to mutate database tier.
    // Instead, verify entitlement strictly from the server-side Gatekeeper / Stripe Webhook state.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' && !isNativeIOS()) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const check = await verifyServerEntitlement();
          await loadUserProfile(session.user.id);
          if (check.verified && (check.tier === 'pro' || check.tier === 'lifetime')) {
            setTier(check.tier);
            try {
              if (typeof window.confetti === 'function') {
                window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
              }
            } catch (e) {}
            setTimeout(() => {
              alert(`🎉 Payment Verified! Welcome to StepOne Career ${check.tier === 'lifetime' ? 'Pioneer Lifetime' : 'Pro'}! All premium features are now unlocked.`);
            }, 500);
          } else {
            setTimeout(() => {
              alert('Payment received! Your account tier will automatically update as soon as Stripe webhook verification completes.');
            }, 500);
          }
        }
      });

      // Clean up URL query parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    if (!supabase) {
      alert('Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert(error.message);
  };

  // App Store Guideline 2.1: Demo mode is a separate, explicitly labeled flow.
  // Credentials are never hardcoded in the bundle; must be supplied via build env when review demo is enabled.
  const isDemoCredentials = (e, p) => {
    const allowDemo = import.meta.env.VITE_ENABLE_REVIEW_DEMO === 'true';
    const expectedEmail = (import.meta.env.VITE_REVIEW_DEMO_EMAIL || '').trim().toLowerCase();
    const expectedPass = import.meta.env.VITE_REVIEW_DEMO_PASSWORD || '';
    if (!allowDemo || !expectedEmail || !expectedPass) return false;
    const cleanEmail = (e || '').trim().toLowerCase();
    return cleanEmail === expectedEmail && p === expectedPass;
  };

  const loginAsDemoReviewer = () => {
    const demoEmail = (import.meta.env.VITE_REVIEW_DEMO_EMAIL || 'reviewer@example.com').trim();
    const demoUser = {
      id: 'demo_reviewer_local',
      email: demoEmail,
      user_metadata: { full_name: 'App Reviewer', school: 'Review Session' },
      isDemo: true
    };
    setUser(demoUser);
    setTier('pro');
    setShowAuthModal(false);
    return { data: { user: demoUser }, error: null };
  };

  const loginWithEmail = async (email, password) => {
    if (isDemoCredentials(email, password)) {
      return loginAsDemoReviewer();
    }
    if (!supabase) {
      return { error: { message: 'Sign-in is temporarily unavailable. Please try again later.' } };
    }
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        return { error: res.error };
      }
      return res;
    } catch (err) {
      return { error: { message: err?.message || 'Network error. Please check your connection and try again.' } };
    }
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabase) {
      return { error: { message: 'Sign-up is temporarily unavailable. Please try again later.' } };
    }
    try {
      const res = await supabase.auth.signUp({ email, password });
      if (res.error) {
        return { error: res.error };
      }
      return res;
    } catch (err) {
      return { error: { message: err?.message || 'Network error. Please check your connection and try again.' } };
    }
  };

  const logout = async () => {
    if (supabase && session) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setTier('free');
  };

  // App Store & Privacy Compliance: Full Account & Personal Data Deletion
  // Deletes the Supabase Auth account + all cloud data via a security-definer RPC,
  // verifies results, then clears local state. Errors are surfaced, never swallowed.
  const deleteAccount = async () => {
    if (!user) {
      return { error: { message: 'No active user session' } };
    }
    try {
      if (supabase && session && !user?.isDemo) {
        // 1. Server-side verified deletion (cascades to profiles, usage, applications, subscriptions)
        const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account');
        if (rpcError) {
          return { error: rpcError };
        }
        if (rpcData && rpcData.success === false) {
          return { error: { message: rpcData.error || 'Account deletion failed on the server.' } };
        }

        // 2. Sign out (server-side deletion already invalidated the account)
        await supabase.auth.signOut();
      }

      // 3. Clear all local data only after cloud deletion confirmed (or for demo/local accounts)
      localStorage.removeItem('stepone_profile');
      localStorage.removeItem('stepone_tracker_apps');
      localStorage.removeItem('stepone_completed');
      localStorage.removeItem('stepone_applications');

      Object.keys(localStorage)
        .filter((key) => key.startsWith('stepone_usage_'))
        .forEach((key) => localStorage.removeItem(key));

      setUser(null);
      setSession(null);
      setProfile(null);
      setTier('free');
      return { success: true };
    } catch (err) {
      console.error('Error deleting account:', err);
      return { error: err };
    }
  };

  // Synchronizes verified StoreKit IAP purchase via JEV Gatekeeper (never writes profiles.tier directly from client)
  const upgradeToPro = async (planType = 'pro', iapPurchase = null) => {
    const normalizedPlan = planType === 'lifetime' ? 'lifetime' : 'pro';
    if (isNativeIOS() && iapPurchase) {
      if (supabase && session && !user?.isDemo) {
        const syncRes = await syncIapEntitlementViaGatekeeper({
          planType: normalizedPlan,
          purchase: iapPurchase
        });
        if (syncRes.success) {
          setTier(syncRes.tier);
        }
        await loadUserProfile(user.id);
      } else {
        setTier(normalizedPlan);
      }
      setShowPaywallModal(false);
      return;
    }

    // For web users, re-verify entitlement from server-side JEV Gatekeeper
    if (supabase && session && !user?.isDemo) {
      const check = await verifyServerEntitlement();
      if (check.verified) {
        setTier(check.tier);
      }
      await loadUserProfile(user.id);
    }
    setShowPaywallModal(false);
  };

  // Pro logic:
  // - Demo/reviewer session: local full-feature demo (badge shows "REVIEW DEMO", not a purchase claim)
  // - Everyone else: the tier actually held by the account (web Stripe or Apple IAP — both stored server-side)
  const isPro = user?.isDemo ? true : (tier === 'pro' || tier === 'lifetime');
  const isCloudUser = Boolean(supabase && session && user && !user.isDemo && !user.isLocal);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tier,
        isPro,
        isCloudUser,
        isIOS: isNativeIOS(),
        isLoggedIn: Boolean(user),
        loading,
        showAuthModal,
        setShowAuthModal,
        showPaywallModal,
        setShowPaywallModal,
        paywallReason,
        triggerPaywall,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        logout,
        deleteAccount,
        upgradeToPro,
        isSupabaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

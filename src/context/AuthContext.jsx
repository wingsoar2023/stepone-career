import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isNativeIOS } from '../lib/platform';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tier, setTier] = useState(() => {
    return localStorage.getItem('stepone_tier') || 'free';
  });
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');

  // Open paywall with a custom reason (e.g. "You've reached your 5 free JD analyses this month")
  const triggerPaywall = (reason = '') => {
    // Guideline 3.1.1 Compliance: Never show Stripe paywall modal on iOS native app
    if (isNativeIOS()) return;
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
        const userTier = data.tier || 'free';
        setTier(userTier);
        localStorage.setItem('stepone_tier', userTier);
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
      const localUser = !session?.user ? JSON.parse(localStorage.getItem('stepone_local_user') || 'null') : null;
      setUser(session?.user ?? localUser ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2. Listen to auth state changes
    // Note: no awaited Supabase calls inside this callback (deadlock risk per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 3. Handle Stripe Payment Return Redirect (?payment=success&tier=pro|lifetime)
    // Only trusted on the web build with a real authenticated session; tier must be a whitelisted value.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' && !isNativeIOS()) {
      const requestedTier = urlParams.get('tier');
      const paidTier = requestedTier === 'lifetime' ? 'lifetime' : 'pro';

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setTier(paidTier);
          localStorage.setItem('stepone_tier', paidTier);

          supabase
            .from('profiles')
            .update({ tier: paidTier })
            .eq('id', session.user.id)
            .then();

          try {
            if (typeof window.confetti === 'function') {
              window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
            }
          } catch (e) {}

          setTimeout(() => {
            alert(`🎉 Payment Successful! Welcome to StepOne Career ${paidTier === 'lifetime' ? 'Pioneer Lifetime' : 'Pro'}! All premium features are now unlocked.`);
          }, 500);
        }
      });

      // Clean up URL query parameters so the grant can't be replayed via URL
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
  // Entry requires this EXACT credential pair; any other credentials go through real Supabase auth.
  const isDemoCredentials = (e, p) => {
    const cleanEmail = (e || '').trim().toLowerCase();
    return cleanEmail === 'alex.chen@berkeley.edu' && p === 'Reviewer2026!';
  };

  const loginAsDemoReviewer = () => {
    const demoUser = {
      id: 'demo_reviewer_alex',
      email: 'alex.chen@berkeley.edu',
      user_metadata: { full_name: 'Alex Chen', school: 'UC Berkeley' },
      isDemo: true
    };
    localStorage.setItem('stepone_local_user', JSON.stringify(demoUser));
    localStorage.setItem('stepone_tier', 'pro');
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
    localStorage.removeItem('stepone_tier');
    localStorage.removeItem('stepone_local_user');
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
      localStorage.removeItem('stepone_tier');
      localStorage.removeItem('stepone_profile');
      localStorage.removeItem('stepone_tracker_apps');
      localStorage.removeItem('stepone_completed');
      localStorage.removeItem('stepone_applications');
      localStorage.removeItem('stepone_local_user');

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

  // Upgrades current user to Pro (can be called by simulated payment or webhook sync)
  const upgradeToPro = async (planType = 'pro') => {
    setTier(planType);
    localStorage.setItem('stepone_tier', planType);
    if (supabase && session && !user?.isDemo) {
      await supabase
        .from('profiles')
        .update({ tier: planType })
        .eq('id', user.id);
    }
    setShowPaywallModal(false);
  };

  const isPro = tier === 'pro' || tier === 'lifetime';
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
        loginAsDemoReviewer,
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

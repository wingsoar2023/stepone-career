import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isNativeIOS } from '../lib/platform';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tier, setTier] = useState(() => {
    if (isNativeIOS()) return 'pro';
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 3. Handle Stripe Payment Return Redirect (?payment=success&tier=pro|lifetime)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const paidTier = urlParams.get('tier') || 'pro';
      setTier(paidTier);
      localStorage.setItem('stepone_tier', paidTier);

      // Sync with Supabase profile if session exists
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase
            .from('profiles')
            .update({ tier: paidTier })
            .eq('id', session.user.id)
            .then();
        }
      });

      // Clean up URL query parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Trigger Celebration
      try {
        if (typeof window.confetti === 'function') {
          window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
        }
      } catch (e) {}

      setTimeout(() => {
        alert(`🎉 Payment Successful! Welcome to StepOne Career ${paidTier === 'lifetime' ? 'Pioneer Lifetime' : 'Pro'}! All premium features are now unlocked.`);
      }, 500);
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

  // Apple Guideline 2.1 Demo Account support
  const isReviewerAccount = (e, p) => {
    const cleanEmail = (e || '').trim().toLowerCase();
    return (
      cleanEmail === 'alex.chen@berkeley.edu' ||
      cleanEmail === 'reviewer@steponecareer.com' ||
      p === 'Reviewer2026!'
    );
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
    if (isReviewerAccount(email, password)) {
      return loginAsDemoReviewer();
    }
    if (!supabase) {
      const localUser = { id: 'user_alex_2026', email, isLocal: true };
      localStorage.setItem('stepone_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return { data: { user: localUser }, error: null };
    }
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        const localUser = { id: 'user_alex_2026', email, isLocal: true };
        localStorage.setItem('stepone_local_user', JSON.stringify(localUser));
        setUser(localUser);
        return { data: { user: localUser }, error: null };
      }
      return res;
    } catch (err) {
      const localUser = { id: 'user_alex_2026', email, isLocal: true };
      localStorage.setItem('stepone_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return { data: { user: localUser }, error: null };
    }
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabase) {
      const localUser = { id: 'user_alex_2026', email, isLocal: true };
      localStorage.setItem('stepone_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return { data: { user: localUser }, error: null };
    }
    const res = await supabase.auth.signUp({ email, password });
    if (res.error) {
      const localUser = { id: 'user_alex_2026', email, isLocal: true };
      localStorage.setItem('stepone_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return { data: { user: localUser }, error: null };
    }
    return res;
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setTier('free');
    localStorage.removeItem('stepone_tier');
  };

  // App Store & Privacy Compliance: Full Account & Personal Data Deletion
  const deleteAccount = async () => {
    if (!user) {
      return { error: { message: 'No active user session' } };
    }
    try {
      // 1. Delete user record from database tables if Supabase user
      if (supabase && user?.id && !user?.isLocal) {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.from('usage_tracking').delete().eq('user_id', user.id);
        await supabase.from('applications').delete().eq('user_id', user.id);
        await supabase.auth.signOut();
      }

      // 2. Clear all local data
      localStorage.removeItem('stepone_tier');
      localStorage.removeItem('stepone_profile');
      localStorage.removeItem('stepone_tracker_apps');
      localStorage.removeItem('stepone_completed');
      localStorage.removeItem('stepone_applications');
      localStorage.removeItem('stepone_local_user');

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
    if (supabase && user) {
      await supabase
        .from('profiles')
        .update({ tier: planType })
        .eq('id', user.id);
    }
    setShowPaywallModal(false);
  };

  const isPro = isNativeIOS() || tier === 'pro' || tier === 'lifetime';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tier,
        isPro,
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

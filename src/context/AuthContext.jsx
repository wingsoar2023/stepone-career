import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

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
      setUser(session?.user ?? null);
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

  const loginWithEmail = async (email, password) => {
    if (!supabase) {
      alert('Supabase is not configured yet.');
      return { error: { message: 'Supabase unconfigured' } };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabase) {
      alert('Supabase is not configured yet.');
      return { error: { message: 'Supabase unconfigured' } };
    }
    return await supabase.auth.signUp({ email, password });
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

  const isPro = tier === 'pro' || tier === 'lifetime';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tier,
        isPro,
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

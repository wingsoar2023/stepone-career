import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const QuotaContext = createContext({});

const FREE_LIMITS = {
  jdAnalyses: 5,
  starCards: 3,
  speechCoach: 3,
  applications: 10,
  networkingMsg: 3,
  mentorQuestions: 10,
  headshot: 1,
  pdfExport: 0 // Pro only
};

const ACTION_DESCRIPTIONS = {
  jdAnalyses: '5 free JD match analyses per month',
  starCards: '3 free STAR interview cards generations',
  speechCoach: '3 free 60s speech pitch coaching sessions',
  applications: '10 active job applications in Tracker',
  networkingMsg: '3 free LinkedIn & Email networking messages',
  mentorQuestions: '10 free AI Mentor questions per month',
  headshot: '1 free professional LinkedIn headshot',
  pdfExport: 'ATS PDF Resume & Cover Letter Export (Pro Feature)'
};

export function QuotaProvider({ children }) {
  const { user, isPro, triggerPaywall } = useAuth();
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. '2026-08'
  const storageKey = `stepone_usage_${currentMonthKey}`;

  const [usage, setUsage] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Sync with Supabase if logged in
  useEffect(() => {
    if (!supabase || !user) return;

    const loadCloudUsage = async () => {
      try {
        const { data } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('user_id', user.id)
          .eq('billing_month', currentMonthKey)
          .single();

        if (data) {
          const merged = {
            jdAnalyses: data.jd_analyses_count || 0,
            starCards: data.star_cards_count || 0,
            speechCoach: data.speech_pitch_count || 0,
            networkingMsg: data.networking_msg_count || 0,
            mentorQuestions: data.mentor_questions_count || 0,
            headshot: data.headshot_count || 0,
          };
          setUsage(merged);
          localStorage.setItem(storageKey, JSON.stringify(merged));
        }
      } catch (err) {
        console.warn('Could not load cloud usage tracking:', err);
      }
    };

    loadCloudUsage();
  }, [user, currentMonthKey]);

  const getUsageCount = (actionKey) => {
    return usage[actionKey] || 0;
  };

  const getQuota = (actionKey) => {
    // Pro Tier: 300 / mo or infinite
    // Lifetime Tier: 150 / mo (Fair Use Policy protection)
    const { tier } = useAuth();
    const isLifetime = tier === 'lifetime';

    if (isPro) {
      const proLimit = isLifetime ? 150 : 300;
      const current = getUsageCount(actionKey);
      const remaining = Math.max(0, proLimit - current);
      return {
        current,
        limit: proLimit,
        remaining,
        isLimitReached: remaining === 0,
        isPro: true,
        isLifetime
      };
    }

    const limit = FREE_LIMITS[actionKey] ?? 3;
    const current = getUsageCount(actionKey);
    const remaining = Math.max(0, limit - current);

    return {
      current,
      limit,
      remaining,
      isLimitReached: remaining === 0,
      isPro: false,
      isLifetime: false
    };
  };

  // Consume 1 credit of the action. Returns true if allowed, false if blocked.
  const consumeQuota = async (actionKey) => {
    // 1. If user is authenticated on Supabase, enforce atomic server-side RPC quota check
    if (supabase && user) {
      try {
        const { data, error } = await supabase.rpc('consume_user_quota', { p_action: actionKey });
        if (!error && data) {
          if (!data.allowed) {
            if (data.tier === 'lifetime') {
              alert("You've reached the monthly Fair Use Policy ceiling of 150 requests. Your quota resets on the 1st of next month.");
            } else {
              const desc = ACTION_DESCRIPTIONS[actionKey] || 'Free tier quota';
              triggerPaywall(`You have reached your limit of ${desc}. Upgrade to Pro for unlimited access.`);
            }
            return false;
          }
          // Update local mirror state
          const newCount = data.current;
          const updated = { ...usage, [actionKey]: newCount };
          setUsage(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return true;
        }
      } catch (err) {
        console.warn('RPC quota check fallback to local:', err);
      }
    }

    // 2. Guest / Offline mode fallback
    const { isLimitReached, isLifetime } = getQuota(actionKey);

    if (isLimitReached) {
      if (isLifetime) {
        alert("You've reached the monthly Fair Use Policy ceiling of 150 requests. Your quota resets on the 1st of next month.");
        return false;
      }
      const desc = ACTION_DESCRIPTIONS[actionKey] || 'Free tier quota';
      triggerPaywall(`You have reached your limit of ${desc}. Upgrade to Pro for unlimited access.`);
      return false;
    }

    // Increment local usage
    const newCount = (usage[actionKey] || 0) + 1;
    const updated = { ...usage, [actionKey]: newCount };
    setUsage(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    return true;
  };

  return (
    <QuotaContext.Provider
      value={{
        FREE_LIMITS,
        getQuota,
        consumeQuota,
        getUsageCount
      }}
    >
      {children}
    </QuotaContext.Provider>
  );
}

export function useQuota() {
  return useContext(QuotaContext);
}

// JEV Gatekeeper Client (JWT + Entitlement & Verification Gatekeeper)
// All privileged tier mutations, payment verifications, and cloud AI requests
// must pass through the server-side JEV Gatekeeper Edge Function rather than
// trusting client URL parameters or direct database table writes.

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Verifies the authenticated user's real server-side entitlement tier.
 * Never trusts URL parameters (?payment=success) to write to the database.
 */
export async function verifyServerEntitlement() {
  if (!isSupabaseConfigured || !supabase) {
    return { verified: false, tier: 'free', error: 'Supabase not configured' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { verified: false, tier: 'free', error: 'Unauthenticated' };
    }

    // 1. Attempt verification via JEV Gatekeeper Edge Function
    const { data: fnData, error: fnError } = await supabase.functions.invoke('jev-gatekeeper', {
      body: { action: 'verify_entitlement' }
    });

    if (!fnError && fnData?.verified && fnData?.tier) {
      return { verified: true, tier: fnData.tier, source: 'jev-gatekeeper' };
    }

    // 2. Read-only fallback from RLS-protected profiles table (tier column is server-locked)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', session.user.id)
      .single();

    if (profileErr || !profile) {
      return { verified: false, tier: 'free', error: profileErr?.message || 'Profile not found' };
    }

    return {
      verified: true,
      tier: profile.tier || 'free',
      source: 'profiles-readonly'
    };
  } catch (err) {
    return { verified: false, tier: 'free', error: String(err?.message || err) };
  }
}

/**
 * Synchronizes a verified Apple StoreKit (IAP) purchase through the server-side
 * JEV Gatekeeper. Direct client updates to profiles.tier are blocked by RLS & trigger.
 */
export async function syncIapEntitlementViaGatekeeper({ planType, purchase }) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const transactionId = purchase?.transactionId || purchase?.id || null;
  const productId = purchase?.productIdentifier || purchase?.identifier || null;
  const receipt = purchase?.receipt || purchase?.jwsRepresentation || null;

  try {
    const { data, error } = await supabase.functions.invoke('jev-gatekeeper', {
      body: {
        action: 'sync_iap_entitlement',
        planType: planType === 'lifetime' ? 'lifetime' : 'pro',
        transactionId,
        productId,
        receipt
      }
    });

    if (error || !data?.success) {
      return {
        success: false,
        error: error?.message || data?.error || 'Gatekeeper rejected IAP verification'
      };
    }

    return {
      success: true,
      tier: data.tier || (planType === 'lifetime' ? 'lifetime' : 'pro')
    };
  } catch (err) {
    return { success: false, error: String(err?.message || err) };
  }
}

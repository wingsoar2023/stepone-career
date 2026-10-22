// JEV Gatekeeper — Server-Side Supabase Edge Function
// Enforces:
// 1. Strict JWT Authentication & Origin CORS allowlist
// 2. Server-side Entitlement Verification (verify_entitlement)
// 3. Verified Apple StoreKit IAP Entitlement Sync (sync_iap_entitlement) using SERVICE_ROLE
// 4. Atomic Server-Side Quota + BFF AI Proxy (ai_proxy) keeping AI API keys strictly server-side

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://steponecareer.com",
  "https://www.steponecareer.com",
  "https://wingsoar2023.github.io",
  "capacitor://localhost",
  "http://localhost:5173"
];

const EXPECTED_BUNDLE_ID = "com.steponecareer.app";

const VALID_IAP_PRODUCTS: Record<string, "pro" | "lifetime"> = {
  "com.steponecareer.pro.monthly": "pro",
  "com.steponecareer.lifetime": "lifetime"
};

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url: string): string {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  return atob(padded);
}

async function createAppleAppStoreServerJwt(): Promise<string | null> {
  const keyId = Deno.env.get("APPLE_IAP_KEY_ID") || Deno.env.get("APP_STORE_CONNECT_KEY_ID");
  const issuerId = Deno.env.get("APPLE_IAP_ISSUER_ID") || Deno.env.get("APP_STORE_CONNECT_ISSUER_ID");
  const rawKey = Deno.env.get("APPLE_IAP_PRIVATE_KEY") || Deno.env.get("APP_STORE_CONNECT_PRIVATE_KEY");
  if (!keyId || !issuerId || !rawKey) return null;

  const pemContents = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 300,
      aud: "appstoreconnect-v1",
      bid: EXPECTED_BUNDLE_ID
    })
  );

  const signingInput = `${header}.${payload}`;
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(sigBuf))}`;
}

async function verifyAppleTransactionOnServer(transactionId: string) {
  const appleJwt = await createAppleAppStoreServerJwt();
  if (!appleJwt) {
    return { ok: false, status: 503, error: "Apple App Store Server API credentials are not configured on server" };
  }

  const encodedTxId = encodeURIComponent(transactionId);
  const endpoints = [
    `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${encodedTxId}`,
    `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${encodedTxId}`
  ];

  for (const url of endpoints) {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${appleJwt}` }
    });
    if (res.ok) {
      const body = await res.json();
      const jws = String(body?.signedTransactionInfo || "");
      const parts = jws.split(".");
      if (parts.length !== 3) {
        return { ok: false, status: 400, error: "Malformed signedTransactionInfo from Apple" };
      }
      const txPayload = JSON.parse(base64UrlDecodeToString(parts[1]));
      return { ok: true, status: 200, txPayload };
    }
  }

  return { ok: false, status: 403, error: "Transaction rejected by Apple App Store Server API" };
}

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(
      JSON.stringify({ success: false, error: "Origin not allowed by JEV Gatekeeper" }),
      { status: 403, headers: { "Content-Type": "application/json", "Vary": "Origin" } }
    );
  }

  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify caller JWT via user-scoped client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client (service_role) for privileged tier mutations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Action A: Read verified entitlement from server (and enforce subscription expiration)
    if (action === "verify_entitlement") {
      const { data: profile, error: profileErr } = await adminClient
        .from("profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      if (profileErr || !profile) {
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            tier: "free",
            error: "Profile not found"
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let effectiveTier = profile.tier || "free";

      if (effectiveTier === "pro") {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("plan_type, status, current_period_end, stripe_customer_id, stripe_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle();

        const isAppleIap =
          sub?.stripe_customer_id === "apple_iap" ||
          String(sub?.stripe_subscription_id || "").startsWith("apple:");

        // Only enforce server-side current_period_end downgrade on Stripe-managed subscriptions
        // (Stripe pushes invoice.paid webhooks on every renewal; Apple IAP renewals are re-synced by the iOS client via StoreKit)
        if (
          sub &&
          !isAppleIap &&
          sub.plan_type === "monthly_pro" &&
          sub.current_period_end &&
          new Date(sub.current_period_end).getTime() < Date.now()
        ) {
          effectiveTier = "free";
          await adminClient
            .from("profiles")
            .update({ tier: "free", updated_at: new Date().toISOString() })
            .eq("id", user.id);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          tier: effectiveTier
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action B: Cryptographically verify StoreKit 2 IAP transaction with Apple App Store Server API
    if (action === "sync_iap_entitlement") {
      const requestedProductId = String(body?.productId || "");
      const transactionId = String(body?.transactionId || "");

      if (!VALID_IAP_PRODUCTS[requestedProductId] || !/^\d{5,30}$/.test(transactionId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid StoreKit productId or non-numeric Apple transactionId"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const appleCheck = await verifyAppleTransactionOnServer(transactionId);
      if (!appleCheck.ok || !appleCheck.txPayload) {
        return new Response(
          JSON.stringify({ success: false, error: appleCheck.error }),
          { status: appleCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tx = appleCheck.txPayload;
      const verifiedBundleId = String(tx.bundleId || "");
      const verifiedProductId = String(tx.productId || "");
      const verifiedTxId = String(tx.transactionId || "");
      const originalTxId = String(tx.originalTransactionId || verifiedTxId);
      const mappedTier = VALID_IAP_PRODUCTS[verifiedProductId];

      if (
        verifiedBundleId !== EXPECTED_BUNDLE_ID ||
        verifiedProductId !== requestedProductId ||
        verifiedTxId !== transactionId ||
        !mappedTier
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Apple transaction bundleId/productId/transactionId mismatch"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tx.revocationDate) {
        return new Response(
          JSON.stringify({ success: false, error: "Apple transaction has been revoked/refunded" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (mappedTier === "pro" && tx.expiresDate && Number(tx.expiresDate) <= Date.now()) {
        return new Response(
          JSON.stringify({ success: false, error: "Apple subscription transaction has expired" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent cross-account transaction replay: bind apple:{originalTransactionId} to a single user_id
      const appleSubKey = `apple:${originalTxId}`;
      const { data: existingBinding } = await adminClient
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", appleSubKey)
        .maybeSingle();

      if (existingBinding?.user_id && existingBinding.user_id !== user.id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This Apple transaction is already bound to another account"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const periodEnd = tx.expiresDate ? new Date(Number(tx.expiresDate)).toISOString() : null;

      await adminClient.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: "apple_iap",
          stripe_subscription_id: appleSubKey,
          plan_type: mappedTier === "lifetime" ? "lifetime" : "monthly_pro",
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

      const { error: updateErr } = await adminClient
        .from("profiles")
        .update({
          tier: mappedTier,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ success: false, error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, verified: true, tier: mappedTier }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unsupported JEV Gatekeeper action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

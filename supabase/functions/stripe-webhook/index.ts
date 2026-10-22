// Stripe Webhook Receiver (Part of the JEV Gatekeeper Architecture)
// Verifies Stripe-Signature using STRIPE_WEBHOOK_SECRET and updates
// public.subscriptions + public.profiles.tier using SUPABASE_SERVICE_ROLE_KEY.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing Stripe-Signature or webhook secret", { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, {
      status: 400
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only grant entitlement when payment is confirmed paid
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ received: true, pending_payment: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const userId = session.client_reference_id;
      const isSubscription = session.mode === "subscription";
      const newTier = isSubscription ? "pro" : "lifetime";
      const planType = isSubscription ? "monthly_pro" : "lifetime";

      let currentPeriodEnd: string | null = null;
      if (isSubscription && session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          if (sub?.current_period_end) {
            currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
          }
        } catch (_e) {}
      }

      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({ tier: newTier, updated_at: new Date().toISOString() })
          .eq("id", userId);

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: String(session.customer || ""),
              stripe_subscription_id: String(session.subscription || session.id || ""),
              plan_type: planType,
              status: "active",
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString()
            },
            { onConflict: "user_id" }
          );
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = String(invoice.subscription || "");
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const { data: subRow } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, plan_type")
          .eq("stripe_subscription_id", subId)
          .single();

        if (subRow?.user_id && subRow.plan_type !== "lifetime") {
          await supabaseAdmin
            .from("profiles")
            .update({ tier: "pro", updated_at: new Date().toISOString() })
            .eq("id", subRow.user_id);

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              current_period_end: periodEnd,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", subRow.user_id);
        }
      }
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated" ||
      event.type === "invoice.payment_failed"
    ) {
      const obj = event.data.object as { id?: string; subscription?: string; status?: string; current_period_end?: number };
      const subId = event.type === "invoice.payment_failed" ? String(obj.subscription || "") : String(obj.id || "");
      if (subId) {
        const { data: subRow } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, plan_type")
          .eq("stripe_subscription_id", subId)
          .single();

        if (subRow?.user_id && subRow.plan_type !== "lifetime") {
          const isDeactivated =
            event.type === "customer.subscription.deleted" ||
            event.type === "invoice.payment_failed" ||
            (obj.status && !["active", "trialing"].includes(obj.status));

          if (isDeactivated) {
            await supabaseAdmin
              .from("profiles")
              .update({ tier: "free", updated_at: new Date().toISOString() })
              .eq("id", subRow.user_id);

            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: obj.status === "past_due" ? "past_due" : "canceled",
                updated_at: new Date().toISOString()
              })
              .eq("user_id", subRow.user_id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

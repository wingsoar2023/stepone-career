import { isNativeIOS } from './platform';
// STATIC import on purpose: dynamic import() of the plugin chunk never resolves inside
// the Capacitor iOS WebView, which made every purchase call hang silently.
import { NativePurchases } from '@capgo/native-purchases';

// Apple In-App Purchase via StoreKit, using @capgo/native-purchases (direct StoreKit,
// no third-party server in the purchase path).
const PRODUCT_IDS = {
  monthly: 'com.steponecareer.pro.monthly',
  lifetime: 'com.steponecareer.lifetime'
};

const PRODUCT_TYPE = {
  [PRODUCT_IDS.monthly]: 'subs',
  [PRODUCT_IDS.lifetime]: 'inapp'
};

// Bumped on every IAP-related build so the paywall can show which binary is running.
export const IAP_BUILD_TAG = 'b19';

// Module-level execution log. The paywall re-reads this on every heartbeat render, so it
// shows progress even if a React state update were somehow dropped.
export const iapLog = [];
export const logStep = (text) => {
  try {
    iapLog.push(text);
    if (iapLog.length > 40) iapLog.shift();
  } catch (e) {}
};

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        logStep(`TIMEOUT:${label}`);
        reject(new Error(label + ' timed out'));
      }, ms)
    )
  ]);

async function getPlugin() {
  if (!isNativeIOS()) return null;
  return NativePurchases || null;
}

export const isIapAvailable = () => Boolean(isNativeIOS());

// Returns the App Store products (same shape the paywall expects).
export async function getIapOfferings() {
  logStep('offerings:start');
  try {
    const NP = await getPlugin();
    logStep('offerings:plugin=' + (NP ? 'ok' : 'null'));
    if (!NP) return [];
    const { products } = await withTimeout(
      NP.getProducts({ productIdentifiers: [PRODUCT_IDS.monthly, PRODUCT_IDS.lifetime] }),
      12000,
      'getProducts'
    );
    logStep('offerings:got=' + (products || []).length);
    return (products || []).map((p) => ({
      id: p.identifier,
      productId: p.identifier,
      title: p.title,
      description: p.description,
      priceString: p.priceString,
      price: p.price,
      period: p.identifier === PRODUCT_IDS.monthly ? 'MONTHLY' : 'LIFETIME'
    }));
  } catch (err) {
    logStep('offerings:ERR=' + String(err?.message || err).slice(0, 40));
    console.warn('App Store products unavailable:', err);
    return [];
  }
}

export function pickPackage(products, plan) {
  return (
    products.find((p) =>
      plan === 'lifetime' ? p.period === 'LIFETIME' : p.period === 'MONTHLY'
    ) || null
  );
}

export async function purchaseIapPackage(pkg) {
  const NP = await getPlugin();
  if (!NP) {
    return { success: false, error: { message: 'Purchases are not available in this app build.' } };
  }
  const productId = typeof pkg === 'string' ? pkg : pkg?.productId;
  if (!productId) {
    return { success: false, error: { message: 'Unknown product.' } };
  }
  try {
    const transaction = await withTimeout(NP.purchaseProduct({
      productIdentifier: productId,
      productType: PRODUCT_TYPE[productId] || 'inapp'
    }), 120000, 'purchase');
    return { success: Boolean(transaction?.transactionId || transaction), purchase: transaction };
  } catch (err) {
    const message = String(err?.message || err || '');
    if (/cancel/i.test(message)) {
      return { success: false, cancelled: true, error: null };
    }
    return { success: false, error: { message: message || 'Purchase could not be completed.' } };
  }
}

async function hasProPurchase() {
  try {
    const NP = await getPlugin();
    if (!NP) return false;
    const { purchases } = await withTimeout(
      NP.getPurchases({ onlyCurrentEntitlements: true }),
      12000,
      'getPurchases'
    );
    return (purchases || []).some((p) => {
      const id = p?.productIdentifier || p?.identifier;
      return id === PRODUCT_IDS.monthly || id === PRODUCT_IDS.lifetime;
    });
  } catch (err) {
    console.warn('Entitlement check failed:', err);
    return false;
  }
}

export const checkProEntitlement = hasProPurchase;

export async function restoreIapPurchases() {
  try {
    const NP = await getPlugin();
    if (!NP) {
      return { success: false, error: { message: 'Not available on this platform.' } };
    }
    await withTimeout(NP.restorePurchases(), 60000, 'restorePurchases');
    return { success: await hasProPurchase() };
  } catch (err) {
    return { success: false, error: { message: String(err?.message || err) } };
  }
}

// Diagnostics: reports progress step by step via onStep so the paywall can show partial
// results even if a later step never settles (that is exactly the failure we are chasing).
export async function diagnoseIap(onStep = () => {}) {
  const push = (text) => {
    logStep(text);
    onStep(text);
  };

  push(`ios=${isNativeIOS()}`);

  // What native plugins did Capacitor actually register?
  try {
    const cap = globalThis.Capacitor;
    const registered = cap?.Plugins ? Object.keys(cap.Plugins) : [];
    push(`plugins=[${registered.join(',')}]`);
  } catch (e) {
    push('plugins=?');
  }

  // Does the JS<->native bridge round-trip at all? (static import of a first-party plugin)
  try {
    const { Preferences } = await import('@capacitor/preferences');
    push('prefs-import=ok');
    await Preferences.set({ key: 'iapdiag', value: 'ok' });
    const got = await Preferences.get({ key: 'iapdiag' });
    push(`bridge=${got?.value === 'ok' ? 'ok' : 'bad'}`);
  } catch (e) {
    push('bridge=FAIL:' + String(e?.message || e).slice(0, 70));
  }

  try {
    const NP = await getPlugin();
    if (!NP) {
      push('plugin=null');
      return;
    }
    push('plugin=ok');

    // Trivial native round-trip: proves the plugin's method dispatch works at all.
    try {
      const v = await withTimeout(NP.getPluginVersion(), 6000, 'getPluginVersion');
      push(`ver=${v?.version ?? '?'}`);
    } catch (e) {
      push('ver=FAIL:' + String(e?.message || e).slice(0, 50));
    }

    try {
      const supported = await withTimeout(NP.isBillingSupported(), 8000, 'isBillingSupported');
      push(`billing=${supported?.isBillingSupported}`);
    } catch (e) {
      push('billing=FAIL:' + String(e?.message || e).slice(0, 50));
    }

    try {
      const { products } = await withTimeout(
        NP.getProducts({ productIdentifiers: [PRODUCT_IDS.monthly, PRODUCT_IDS.lifetime] }),
        12000,
        'getProducts'
      );
      push(`products=${(products || []).length}`);
    } catch (e) {
      push('products=FAIL:' + String(e?.message || e).slice(0, 50));
    }
  } catch (err) {
    push('FAIL: ' + String(err?.message || err).slice(0, 70));
  }
}

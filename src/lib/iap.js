import { isNativeIOS } from './platform';
import { supabase } from './supabaseClient';

// RevenueCat PUBLIC SDK key (Apple). Public SDK keys are designed to be embedded in client
// apps — security comes from the App Store plus RevenueCat's server-side secret key.
// The env var (when provided) takes precedence so other environments can override it.
const RC_PUBLIC_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || 'appl_sVnojduOQCixTrdnADTOsBLGVDo';

const PRODUCT_IDS = {
  monthly: 'com.steponecareer.pro.monthly',
  lifetime: 'com.steponecareer.lifetime'
};

// Memoised SDK promise: guarantees configure() runs exactly once even when several
// callers (entitlement check + paywall) race at startup.
let sdkPromise = null;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms))
  ]);

async function getSdk() {
  if (!isNativeIOS()) return null;
  // Guard: never configure the SDK with an empty key (would throw / crash on launch).
  if (!RC_PUBLIC_KEY) return null;
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const { Purchases } = await withTimeout(import('@revenuecat/purchases-capacitor'), 10000, 'plugin import');
      await withTimeout(Purchases.configure({ apiKey: RC_PUBLIC_KEY }), 10000, 'configure');
      return Purchases;
    })().catch((err) => {
      sdkPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return sdkPromise;
}

// Temporary diagnostics shown inside the paywall so failures are never silent.
export async function diagnoseIap() {
  const steps = [];
  try {
    steps.push(`ios=${isNativeIOS()}`);
    steps.push(`key=${RC_PUBLIC_KEY ? 'set' : 'MISSING'}`);
    const Purchases = await getSdk();
    if (!Purchases) {
      steps.push('sdk=null');
      return steps.join(' | ');
    }
    steps.push('sdk=ok');
    const offerings = await withTimeout(Purchases.getOfferings(), 10000, 'getOfferings');
    const pkgs = offerings?.current?.availablePackages || [];
    steps.push(`offerings=${pkgs.length}`);
    return steps.join(' | ');
  } catch (err) {
    steps.push('FAIL: ' + (err?.message || String(err)));
    return steps.join(' | ');
  }
}

export const isIapAvailable = () => Boolean(isNativeIOS() && RC_PUBLIC_KEY);

// Pick the RevenueCat package that matches a UI plan ('monthly' | 'lifetime').
// Matches by App Store product ID first, then falls back to the package period.
export function pickPackage(packages, plan) {
  return packages.find((p) =>
    plan === 'lifetime'
      ? p.productId?.includes('lifetime') || p.period === 'LIFETIME'
      : p.productId === PRODUCT_IDS.monthly || p.period === 'MONTHLY'
  ) || null;
}

export async function getIapOfferings() {
  const Purchases = await getSdk();
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return [];
    return (current.availablePackages || [])
      // Only packages that actually have a linked App Store product are usable
      .filter((p) => Boolean(p?.product?.identifier))
      .map((p) => ({
        id: p.identifier,
        // The RevenueCat SDK requires the original package object for purchasePackage()
        raw: p,
        productId: p.product.identifier,
        title: p.product.title,
        description: p.product.description,
        priceString: p.product.priceString,
        price: p.product.price,
        period: p.packageType
      }));
  } catch (err) {
    console.warn('IAP offerings unavailable:', err);
    return [];
  }
}

export async function purchaseIapPackage(pkg) {
  const Purchases = await getSdk();
  if (!Purchases) {
    return { success: false, error: { message: 'Purchases are not available in this app build.' } };
  }
  try {
    // NOTE: the SDK expects the full package object here, not the identifier string.
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, purchase: customerInfo };
  } catch (err) {
    if (String(err?.code).includes('userCancelled') || err?.userCancelled) {
      return { success: false, cancelled: true, error: null };
    }
    return { success: false, error: err };
  }
}

export async function restoreIapPurchases() {
  const Purchases = await getSdk();
  if (!Purchases) {
    return { success: false, error: { message: 'Not available on this platform.' } };
  }
  try {
    const result = await Purchases.restorePurchases();
    const entitlement = result?.all?.pro;
    return { success: Boolean(entitlement && entitlement.isActive) };
  } catch (err) {
    return { success: false, error: err };
  }
}

export async function checkProEntitlement() {
  const Purchases = await getSdk();
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return Boolean(customerInfo?.entitlements?.active?.pro?.isActive);
  } catch (err) {
    console.warn('Entitlement check failed:', err);
    return false;
  }
}

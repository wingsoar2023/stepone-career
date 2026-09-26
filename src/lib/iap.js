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

let initialized = false;

async function getSdk() {
  if (!isNativeIOS()) return null;
  // Guard: never configure the SDK with an empty key (would throw / crash on launch).
  if (!RC_PUBLIC_KEY) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    await Purchases.configure({ apiKey: RC_PUBLIC_KEY });
    initialized = true;
  }
  return Purchases;
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

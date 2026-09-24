import { isNativeIOS } from './platform';
import { supabase } from './supabaseClient';

const RC_PUBLIC_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || '';

const PRODUCT_IDS = {
  monthly: 'com.steponecareer.pro.monthly',
  lifetime: 'com.steponecareer.lifetime'
};

let initialized = false;

async function getSdk() {
  if (!isNativeIOS()) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    await Purchases.configure({ apiKey: RC_PUBLIC_KEY });
    initialized = true;
  }
  return Purchases;
}

export const isIapAvailable = () => Boolean(isNativeIOS() && RC_PUBLIC_KEY);

export async function getIapOfferings() {
  const Purchases = await getSdk();
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return [];
    return (current.availablePackages || [])
      .filter((p) => p?.product?.identifier !== null)
      .map((p) => ({
        id: p.identifier,
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

export async function purchaseIapPackage(packageIdentifier) {
  const Purchases = await getSdk();
  if (!Purchases) {
    return { success: false, error: { message: 'Purchases are not available in this app build.' } };
  }
  try {
    const { purchaseResult } = await Purchases.purchasePackage({ aPackage: packageIdentifier });
    return { success: Boolean(purchaseResult), purchase: purchaseResult };
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

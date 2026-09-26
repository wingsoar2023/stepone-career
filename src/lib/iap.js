import { isNativeIOS } from './platform';

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

let pluginPromise = null;

async function getPlugin() {
  if (!isNativeIOS()) return null;
  if (!pluginPromise) {
    pluginPromise = import('@capgo/native-purchases')
      .then((mod) => mod.NativePurchases)
      .catch((err) => {
        pluginPromise = null;
        throw err;
      });
  }
  return pluginPromise;
}

export const isIapAvailable = () => Boolean(isNativeIOS());

// Returns the App Store products (same shape the paywall expects).
export async function getIapOfferings() {
  const NP = await getPlugin();
  if (!NP) return [];
  try {
    const { products } = await NP.getProducts({
      productIdentifiers: [PRODUCT_IDS.monthly, PRODUCT_IDS.lifetime]
    });
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
    const transaction = await NP.purchaseProduct({
      productIdentifier: productId,
      productType: PRODUCT_TYPE[productId] || 'inapp'
    });
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
  const NP = await getPlugin();
  if (!NP) return false;
  try {
    const { purchases } = await NP.getPurchases({ onlyCurrentEntitlements: true });
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
  const NP = await getPlugin();
  if (!NP) {
    return { success: false, error: { message: 'Not available on this platform.' } };
  }
  try {
    await NP.restorePurchases();
    return { success: await hasProPurchase() };
  } catch (err) {
    return { success: false, error: { message: String(err?.message || err) } };
  }
}

// Diagnostics shown inside the paywall so failures are never silent.
export async function diagnoseIap() {
  const steps = [];
  try {
    steps.push(`ios=${isNativeIOS()}`);
    const NP = await getPlugin();
    if (!NP) {
      steps.push('plugin=null');
      return steps.join(' | ');
    }
    steps.push('plugin=ok');
    const supported = await NP.isBillingSupported().catch(() => null);
    if (supported) steps.push(`billing=${supported.isBillingSupported}`);
    const { products } = await NP.getProducts({
      productIdentifiers: [PRODUCT_IDS.monthly, PRODUCT_IDS.lifetime]
    });
    steps.push(`products=${(products || []).length}`);
    return steps.join(' | ');
  } catch (err) {
    steps.push('FAIL: ' + String(err?.message || err));
    return steps.join(' | ');
  }
}

import { Platform } from 'react-native';

import type { Product, Purchase, PurchaseError } from 'expo-iap';

/**
 * Lazy native-module access.
 *
 * Top-level `import { x } from 'expo-iap'` triggers
 * `requireNativeModule('ExpoIap')` at module load — and that throws
 * synchronously when the native side is missing (Expo Go, web, or a
 * dev-client build that omitted the module). The throw blows up *any*
 * route that imports lib/iap.ts, even ones that don't actually want
 * to buy anything (e.g. the Plans screen rendering the pass UI, or
 * Profile mounting an iap-touching hook).
 *
 * Switching to `require()` inside a try/catch keeps the failure
 * catchable at module init time. The result: lib/iap.ts always
 * imports cleanly; runtime functions degrade gracefully when the
 * native module isn't available. The Plans screen still mounts,
 * surfaces an "in-app purchases unavailable" state, and the buy
 * buttons are disabled rather than crashing.
 *
 * Type-only imports stay on the static `import type {}` form above —
 * they're erased at runtime so they don't reach the native loader.
 */
type ExpoIapModule = typeof import('expo-iap');
let mod: ExpoIapModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-iap') as ExpoIapModule;
} catch (err) {
  console.warn(
    '[iap] expo-iap native module not present — in-app purchases disabled. ' +
      'This is expected on Expo Go / web / dev-client builds without the native side.',
    err,
  );
}

/**
 * Whether expo-iap's native side is loaded. UI can read this to show a
 * "purchases unavailable in this build" state instead of letting users
 * tap a buy button that will reject.
 */
export const iapAvailable = mod !== null;

export type PassProductId = 'com.insuite.invite.pass7d' | 'com.insuite.invite.pass14d' | 'com.insuite.invite.pass30d';

export const PASS_PRODUCT_IDS: PassProductId[] = [
  'com.insuite.invite.pass7d',
  'com.insuite.invite.pass14d',
  'com.insuite.invite.pass30d',
];

export const PASS_DURATION_DAYS: Record<PassProductId, number> = {
  'com.insuite.invite.pass7d': 7,
  'com.insuite.invite.pass14d': 14,
  'com.insuite.invite.pass30d': 30,
};

export const PASS_TYPE_FOR_DB: Record<PassProductId, 'pass_7' | 'pass_14' | 'pass_30'> = {
  'com.insuite.invite.pass7d': 'pass_7',
  'com.insuite.invite.pass14d': 'pass_14',
  'com.insuite.invite.pass30d': 'pass_30',
};

let initialized = false;

/**
 * Open the IAP connection. Idempotent — safe to call from any screen.
 * Returns true if iOS + native module loaded + connection ready, false
 * otherwise (Android, sim without StoreKit, Expo Go, etc.).
 */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!mod) return false;
  if (initialized) return true;
  try {
    await mod.initConnection();
    initialized = true;
    return true;
  } catch (err) {
    console.warn('[iap] initConnection failed', err);
    return false;
  }
}

export async function shutdownIAP(): Promise<void> {
  if (!initialized || !mod) return;
  try {
    await mod.endConnection();
  } catch {
    // ignore
  }
  initialized = false;
}

/**
 * Fetch the App Store products for our 3 pass tiers. Returns whatever the
 * store can resolve — if a product isn't yet approved, it'll be missing.
 */
export async function fetchPassProducts(): Promise<Product[]> {
  const ok = await initIAP();
  if (!ok || !mod) return [];
  try {
    const products = await mod.requestProducts({ skus: PASS_PRODUCT_IDS, type: 'inapp' });
    if (__DEV__) {
      console.log('[iap] requestProducts returned', products.length, 'products');
    }
    return products as Product[];
  } catch (err) {
    console.warn('[iap] requestProducts failed', err);
    return [];
  }
}

/**
 * Begin a purchase. The actual outcome arrives via the listeners registered
 * in `subscribePurchaseUpdates` — this just kicks off the StoreKit flow.
 */
export async function buyPass(productId: PassProductId): Promise<void> {
  const ok = await initIAP();
  if (!ok || !mod) throw new Error('IAP not available on this device.');
  await mod.requestPurchase({
    request: { ios: { sku: productId } },
    type: 'inapp',
  });
}

export interface PurchaseHandlers {
  onPurchase: (purchase: Purchase) => Promise<void> | void;
  onError: (err: PurchaseError) => void;
}

/**
 * Apple App Store Guideline 3.1.1 requires a working Restore Purchases
 * affordance even for consumable IAPs. For our consumable passes, "restore"
 * means: re-deliver any StoreKit transaction that was paid for but never
 * got finished on our side (e.g. the app crashed between purchase and
 * `finishTransaction`, or `insertPass` threw on the server side mid-flow).
 *
 * `alsoPublishToEventListener: true` re-fires those purchases through the
 * existing `purchaseUpdatedListener` registered by `subscribePurchaseUpdates`,
 * so the Plans page's onPurchase handler processes them with no extra wiring.
 *
 * Returns how many purchases were found (0 = nothing to restore — show the
 * user that explicitly so the button doesn't feel broken).
 */
export async function restorePasses(): Promise<{ restored: number }> {
  const ok = await initIAP();
  if (!ok || !mod) return { restored: 0 };
  try {
    const purchases = await mod.getAvailablePurchases({
      alsoPublishToEventListener: true,
    });
    return { restored: purchases.length };
  } catch (err) {
    console.warn('[iap] restore failed', err);
    throw err;
  }
}

/**
 * Subscribe to StoreKit events (called from a useEffect on the Plans page).
 * Returns an unsubscribe function. When the native module isn't present,
 * returns a no-op unsubscribe so callers don't need an extra guard.
 */
export function subscribePurchaseUpdates(handlers: PurchaseHandlers): () => void {
  if (!mod) return () => {};
  const m = mod;
  const purchaseSub = m.purchaseUpdatedListener(async (purchase) => {
    try {
      await handlers.onPurchase(purchase);
      // Always finish the transaction so it doesn't get re-delivered next launch.
      await m.finishTransaction({ purchase, isConsumable: true });
    } catch (err) {
      console.warn('[iap] handler failed; not finishing tx', err);
    }
  });
  const errorSub = m.purchaseErrorListener(handlers.onError);
  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
}

import {
  endConnection,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestProducts,
  requestPurchase,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'expo-iap';
import { Platform } from 'react-native';

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
 * Returns true if iOS + connection ready, false otherwise (Android, sim, etc.).
 */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (initialized) return true;
  try {
    await initConnection();
    initialized = true;
    return true;
  } catch (err) {
    console.warn('[iap] initConnection failed', err);
    return false;
  }
}

export async function shutdownIAP(): Promise<void> {
  if (!initialized) return;
  try {
    await endConnection();
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
  if (!ok) return [];
  try {
    const products = await requestProducts({ skus: PASS_PRODUCT_IDS, type: 'inapp' });
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
  if (!ok) throw new Error('IAP not available on this device.');
  await requestPurchase({
    request: { ios: { sku: productId } },
    type: 'inapp',
  });
}

export interface PurchaseHandlers {
  onPurchase: (purchase: Purchase) => Promise<void> | void;
  onError: (err: PurchaseError) => void;
}

/**
 * Subscribe to StoreKit events (called from a useEffect on the Plans page).
 * Returns an unsubscribe function.
 */
export function subscribePurchaseUpdates(handlers: PurchaseHandlers): () => void {
  const purchaseSub = purchaseUpdatedListener(async (purchase) => {
    try {
      await handlers.onPurchase(purchase);
      // Always finish the transaction so it doesn't get re-delivered next launch.
      await finishTransaction({ purchase, isConsumable: true });
    } catch (err) {
      console.warn('[iap] handler failed; not finishing tx', err);
    }
  });
  const errorSub = purchaseErrorListener(handlers.onError);
  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
}

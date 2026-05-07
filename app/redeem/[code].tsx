import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Deep-link landing for `insuite2://redeem/JAMES7` (the URL we put in shared
 * messages). Passes the code through to the regular redeem screen, which
 * handles auth state and submit. Keeping this as a thin bridge so the app
 * scheme + the in-app redeem flow stay decoupled.
 *
 * If the user is signed out when the link opens, the redirect still lands
 * them on /plans/redeem; the parent auth gate redirects to /welcome and the
 * code in the URL is lost. That's a known edge case for v1 — once we have
 * universal links + a saved-code post-signin handler, we can preserve it.
 */
export default function RedeemDeepLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const safe = (code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return <Redirect href={`/plans/redeem?code=${safe}`} />;
}

import { firebaseAuth } from './firebase';
import { getIdToken, signOut } from 'firebase/auth';

/**
 * Validates that a string looks like a real Firebase JWT token
 * (three base64 segments separated by dots, e.g. xxxxx.yyyyy.zzzzz)
 * and NOT a Mercado Pago token (which starts with TEST- or APP-)
 */
function isFirebaseJWT(token: string): boolean {
  if (!token) return false;
  // MP tokens start with TEST- or APP-
  if (token.startsWith('TEST-') || token.startsWith('APP-')) return false;
  // Firebase JWTs have exactly 3 dot-separated base64 parts
  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * Clears ALL Firebase auth state from IndexedDB and localStorage
 * so corrupted sessions can't persist.
 */
async function clearFirebaseAuthCache(): Promise<void> {
  try {
    // Clear localStorage Firebase keys
    const keysToRemove = Object.keys(localStorage).filter(
      (k) => k.startsWith('firebase:') || k.includes('firebaseLocalStorage')
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Clear IndexedDB Firebase databases
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) {
      if (db.name && (db.name.startsWith('firebase') || db.name.includes('firebaseLocalStorage'))) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (_) {
    // Ignore errors; best-effort cleanup
  }
}

export async function createMercadoPagoPreference(eventId: string): Promise<{
  preferenceId: string;
  initPoint?: string;
  purchaseId: string;
}> {
  const user = firebaseAuth?.currentUser;
  if (!user) {
    throw new Error('Necesitás iniciar sesión para comprar. Por favor, ingresá tu cuenta.');
  }

  let idToken: string;
  try {
    // Force a fresh token from the Firebase servers (not from cache)
    idToken = await getIdToken(user, /* forceRefresh */ true);
  } catch (err: any) {
    throw new Error('No se pudo verificar tu sesión. Por favor, cerrá sesión y volvé a ingresar.');
  }

  // Validate the token is a real Firebase JWT and not a corrupted MP token
  if (!isFirebaseJWT(idToken)) {
    console.error('[payments] Corrupted auth token detected. Signing out user.');
    // Clear the corrupted cache BEFORE signing out
    await clearFirebaseAuthCache();
    // Force sign out so the user has to log in fresh
    try { await signOut(firebaseAuth!); } catch (_) {}
    throw new Error(
      'Tu sesión expiró o está corrupta. Se cerró la sesión automáticamente. ' +
      'Por favor, iniciá sesión de nuevo para continuar.'
    );
  }

  const response = await fetch(
    'https://us-central1-sporttech-7f561.cloudfunctions.net/createMercadoPagoPreference',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ data: { eventId } }),
    }
  );

  if (!response.ok) {
    let message = `Error del servidor (${response.status}). Intenta de nuevo.`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
      else if (body?.message) message = body.message;
    } catch (_) {}
    throw new Error(message);
  }

  const json = await response.json();
  // Firebase callable wraps the result in { result: ... }
  const data = json.result ?? json;

  if (!data?.preferenceId || !data?.initPoint) {
    throw new Error('La respuesta del servidor no tiene el link de pago. Intenta de nuevo.');
  }

  return {
    preferenceId: data.preferenceId,
    initPoint: data.initPoint,
    purchaseId: data.purchaseId,
  };
}

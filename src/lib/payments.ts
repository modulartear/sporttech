import { firebaseAuth } from './firebase';
import { getIdToken } from 'firebase/auth';

// Direct HTTP call to Firebase Cloud Function — avoids Firebase SDK httpsCallable 
// header issues when the user's cached Firebase token has illegal characters.
export async function createMercadoPagoPreference(eventId: string): Promise<{
  preferenceId: string;
  initPoint?: string;
  purchaseId: string;
}> {
  const user = firebaseAuth?.currentUser;
  if (!user) {
    throw new Error('User is not authenticated. Please log in and try again.');
  }

  // Get a fresh Firebase ID token (forces refresh if needed)
  const idToken = await getIdToken(user, /* forceRefresh */ true);

  const payload = {
    data: { eventId },
  };

  const response = await fetch(
    'https://us-central1-sporttech-7f561.cloudfunctions.net/createMercadoPagoPreference',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let message = `Error del servidor: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
      else if (body?.message) message = body.message;
    } catch (_) {}
    throw new Error(message);
  }

  const json = await response.json();
  // Firebase callable response wraps result in { result: ... }
  const data = json.result ?? json;

  return {
    preferenceId: data.preferenceId,
    initPoint: data.initPoint,
    purchaseId: data.purchaseId,
  };
}

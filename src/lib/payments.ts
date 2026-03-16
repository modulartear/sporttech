import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './firebase';

export async function createMercadoPagoPreference(eventId: string) {
  const callable = httpsCallable<{ eventId: string }, { preferenceId: string; initPoint?: string; purchaseId: string }>(
    firebaseFunctions,
    'createMercadoPagoPreference',
  );

  const result = await callable({ eventId });
  return result.data;
}


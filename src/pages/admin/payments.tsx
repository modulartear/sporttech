import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

type Purchase = {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'approved' | 'rejected' | 'refunded';
  proof_url?: string;
  created_at: any;
  userEmail?: string;
  eventTitle?: string;
};

export function AdminPaymentsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(firestore, 'purchases'),
        where('payment_status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Purchase[];

      // Fetch all users to get their emails reliably
      let usersMap = new Map<string, string>();
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { firebaseFunctions } = await import('../../lib/firebase');
        const callable = httpsCallable<any, { users: any[] }>(firebaseFunctions, 'adminListUsers');
        const result = await callable();
        result.data.users.forEach((u: any) => usersMap.set(u.uid, u.email));
      } catch (e) {
        console.error('Error fetching users map:', e);
      }

      // Hydrate with user email and event title
      const hydrated = await Promise.all(rows.map(async (row) => {
        let userEmail = usersMap.get(row.user_id) || 'Usuario';
        let eventTitle = 'Evento';
        
        // Fallback to user_profiles if not in auth list (though unlikely for active users)
        if (userEmail === 'Usuario') {
          try {
            const userSnap = await getDoc(doc(firestore, 'user_profiles', row.user_id));
            if (userSnap.exists()) {
              userEmail = (userSnap.data() as any).email || row.user_id;
            }
          } catch (e) {}
        }

        try {
          const eventSnap = await getDoc(doc(firestore, 'events', row.event_id));
          if (eventSnap.exists()) {
            eventTitle = (eventSnap.data() as any).title;
          }
        } catch (e) {}

        return { ...row, userEmail, eventTitle };
      }));

      // Sort by created_at desc manually
      hydrated.sort((a, b) => {
        const da = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
        const db = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
        return db - da;
      });

      setPurchases(hydrated);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Error cargando los pagos');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePaymentStatus = async (purchaseId: string, status: 'approved' | 'rejected') => {
    if (!confirm(`¿Estás seguro de marcar este pago como ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'}?`)) return;

    try {
      const ref = doc(firestore, 'purchases', purchaseId);
      await updateDoc(ref, {
        payment_status: status,
        updated_at: new Date()
      });

      // If approved, we should theoretically create the access_token, but the backend does this for webhook. 
      // For manual approvals, assuming the event_details checks `payment_status` == 'approved', it's enough.
      toast.success(`Pago marcado como ${status}`);
      setPurchases(current => current.filter(p => p.id !== purchaseId));
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Error actualizando pago');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 mt-4">Cargando pagos pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Pagos Pendientes</h1>
        <p className="text-slate-400">Revisa y aprueba o rechaza los pagos que requieren confirmación manual (ej: transferencias).</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/50 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Usuario / Email</th>
              <th className="px-6 py-4 font-medium">Evento</th>
              <th className="px-6 py-4 font-medium">Monto</th>
              <th className="px-6 py-4 font-medium">Método</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No hay pagos pendientes
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4">{purchase.userEmail}</td>
                  <td className="px-6 py-4 font-medium text-white">{purchase.eventTitle}</td>
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-bold">{purchase.currency} {purchase.amount}</span>
                  </td>
                  <td className="px-6 py-4 uppercase text-xs tracking-wider">{purchase.payment_method}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-lg border border-yellow-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      Pendiente
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {purchase.payment_method === 'transfer' && purchase.proof_url && (
                        <a 
                          href={purchase.proof_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-600/20 transition"
                        >
                          Ver Comprobante
                        </a>
                      )}
                      <button
                        onClick={() => updatePaymentStatus(purchase.id, 'approved')}
                        className="p-2 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition"
                        title="Aprobar Pago"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updatePaymentStatus(purchase.id, 'rejected')}
                        className="p-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition"
                        title="Rechazar Pago"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

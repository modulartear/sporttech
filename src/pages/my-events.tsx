import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDoc, getDocs, orderBy, query, where, doc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../hooks/use-auth';
import { Calendar, Play, ArrowLeft, Ticket, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.png';

type Purchase = {
  id: string;
  user_id: string;
  event_id: string;
  payment_status: 'pending' | 'approved' | 'rejected' | 'refunded';
  created_at?: string;
  event: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    event_date: string;
  };
};

export function MyEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyEvents();
    }
  }, [user]);

  const fetchMyEvents = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(firestore, 'purchases'),
        where('user_id', '==', user?.uid),
        orderBy('created_at', 'desc'),
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

      const hydrated = await Promise.all(
        rows.map(async (p) => {
          const eventSnap = await getDoc(doc(firestore, 'events', p.event_id));
          const ev = eventSnap.exists() ? (eventSnap.data() as any) : null;
          return {
            id: p.id,
            user_id: p.user_id,
            event_id: p.event_id,
            payment_status: p.payment_status,
            created_at: p.created_at,
            event: {
              id: p.event_id,
              title: ev?.title ?? 'Evento',
              thumbnail_url: ev?.thumbnail_url ?? null,
              event_date: ev?.event_date ?? new Date().toISOString(),
            },
          } satisfies Purchase;
        }),
      );

      setPurchases(hydrated);
    } catch (error) {
      console.error('Error fetching my events:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition" />
            <img src={logo} alt="Sporttech Logo" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-lg">
            <Ticket className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-bold text-pink-400">{t('common.myTickets')}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white mb-8">{t('common.acquiredEvents')}</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent"></div>
            </div>
          ) : purchases.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {purchases.map((purchase) => (
                <div 
                  key={purchase.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-pink-500/30 transition flex flex-col md:flex-row"
                >
                  <div className="w-full md:w-64 h-40 bg-slate-800 shrink-0">
                    {purchase.event.thumbnail_url ? (
                      <img 
                        src={purchase.event.thumbnail_url} 
                        alt={purchase.event.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Play className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white line-clamp-1">{purchase.event.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          purchase.payment_status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          purchase.payment_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {purchase.payment_status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(purchase.event.event_date).toLocaleDateString(locale, { dateStyle: 'medium' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(purchase.event.event_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} hs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div className="text-xs text-slate-500 font-medium">
                        ID: #{purchase.id.slice(0, 8)}
                      </div>
                      
                      {purchase.payment_status === 'approved' ? (
                        <button
                          onClick={() => navigate(`/watch/${purchase.event_id}`)}
                          className="px-6 py-2 btn-gradient text-white text-sm font-bold rounded-xl transition flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          {t('common.viewStream')}
                        </button>
                      ) : purchase.payment_status === 'pending' ? (
                        <div className="text-sm font-bold text-yellow-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {t('common.waitingConfirmation')}
                        </div>
                      ) : (
                        <Link 
                          to={`/event/${purchase.event_id}`}
                          className="text-sm font-bold text-pink-400 hover:underline flex items-center gap-2"
                        >
                          {t('common.tryAgain')} <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ticket className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('common.noTicketsYet')}</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                {t('common.noTicketsYetDesc')}
              </p>
              <Link to="/" className="px-8 py-3 btn-gradient text-white font-bold rounded-2xl transition inline-block">
                {t('hero.explore')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { createMercadoPagoPreference } from '../lib/payments';
import { useAuth } from '../hooks/use-auth';
import { Calendar, Clock, Play, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type Event = {
  id: string;
  title: string;
  description?: string | null;
  youtube_video_id: string;
  event_date: string;
  event_type: 'live' | 'premiere' | 'recorded';
  price: number;
  currency: 'ARS' | 'USD' | 'BRL';
  thumbnail_url?: string | null;
  status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
};

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [event, setEvent] = useState<Event | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id, user]);

  const fetchEventData = async () => {
    setIsLoading(true);
    try {
      const eventRef = doc(firestore, 'events', id!);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) throw new Error('Event not found');
      const eventData = { id: eventSnap.id, ...(eventSnap.data() as any) } as Event;
      setEvent(eventData);

      // Check access if logged in
      if (user) {
        const purchaseId = `${user.uid}_${id}`;
        const purchaseRef = doc(firestore, 'purchases', purchaseId);
        const purchaseSnap = await getDoc(purchaseRef);
        const paymentStatus = purchaseSnap.exists() ? (purchaseSnap.data() as any).payment_status : null;
        setHasAccess(paymentStatus === 'approved');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyTicket = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const { initPoint } = await createMercadoPagoPreference(id!);
      if (initPoint) {
        window.location.href = initPoint;
      }
    } catch (error: any) {
      console.error('Error processing purchase:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">{t('common.eventNotFound')}</h1>
        <Link to="/" className="text-pink-400 hover:underline">{t('common.backToHome')}</Link>
      </div>
    );
  }

  const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="relative">
        {/* Banner / Poster Background */}
        <div className="h-[40vh] w-full relative overflow-hidden">
          {event.thumbnail_url ? (
            <img 
              src={event.thumbnail_url} 
              alt={event.title} 
              className="w-full h-full object-cover opacity-40 blur-sm"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 opacity-20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="container mx-auto px-4 -mt-32 relative z-10 pb-20">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{t('common.back')}</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {event.status === 'live' && (
                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      {t('common.live')}
                    </span>
                  )}
                  <span className="bg-pink-500/10 text-pink-400 text-xs font-bold px-3 py-1 rounded-full border border-pink-500/20">
                    {event.event_type.toUpperCase()}
                  </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                  {event.title}
                </h1>
              </div>

              <div className="flex flex-wrap gap-6 text-slate-300 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <Calendar className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider text-left">{t('common.date')}</p>
                    <p className="font-semibold">{new Date(event.event_date).toLocaleDateString(locale, { dateStyle: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-l border-slate-800 lg:pl-6">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <Clock className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider text-left">{t('common.time')}</p>
                    <p className="font-semibold">{new Date(event.event_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-xl font-bold text-white mb-4">{t('common.aboutEvent')}</h3>
                <p className="text-slate-400 leading-relaxed text-lg">
                  {event.description || t('common.noDescription')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                  <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">{t('common.secureStream')}</h4>
                    <p className="text-sm text-slate-500">{t('common.secureStreamDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                  <Zap className="w-6 h-6 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">{t('common.instantAccess')}</h4>
                    <p className="text-sm text-slate-500">{t('common.instantAccessDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Card */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 sticky top-24 shadow-2xl shadow-pink-500/5">
                <div className="text-center mb-8">
                  <p className="text-slate-500 font-bold tracking-widest uppercase text-xs mb-2">{t('common.ticketPrice')}</p>
                  <div className="flex items-center justify-center gap-1 text-5xl font-black text-white">
                    <span className="text-2xl text-slate-500 font-normal mr-1">{event.currency}</span>
                    {new Intl.NumberFormat(locale).format(Number(event.price))}
                  </div>
                </div>

                <div className="space-y-4">
                  {hasAccess ? (
                    <button
                      onClick={() => navigate(`/watch/${event.id}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      {t('common.accessStream')}
                    </button>
                  ) : (
                    <button
                      onClick={handleBuyTicket}
                      disabled={isProcessing || event.status === 'ended' || event.status === 'cancelled'}
                      className="w-full btn-gradient disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-pink-500/20"
                    >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-6 h-6 fill-current" />
                          {event.status === 'ended' ? t('common.eventEnded') : t('common.buyTicket').toUpperCase()}
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-800">
                  <p className="text-xs text-slate-500 text-center uppercase tracking-widest font-bold mb-4">{t('common.paymentMethods')}</p>
                  <div className="flex justify-center items-center gap-4 grayscale opacity-50">
                    <div className="bg-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold text-white">VISA</div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold text-white">MASTERCARD</div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-md text-[10px] font-bold text-white">AMEX</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { createMercadoPagoPreference } from '../lib/payments';
import { useAuth } from '../hooks/use-auth';
import { Calendar, Clock, Play, ArrowLeft, ShieldCheck, Zap, X, CreditCard } from 'lucide-react';
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
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showTransferDetails, setShowTransferDetails] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
      fetchPlatformSettings();
    }
  }, [id, user]);

  const fetchPlatformSettings = async () => {
    try {
      const snap = await getDoc(doc(firestore, 'settings', 'platform'));
      if (snap.exists()) {
        setPlatformSettings(snap.data());
      }
    } catch(e) {}
  };

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

  const initiatePayment = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowPaymentSelector(true);
  };

  const handleBuyTicketMercadoPago = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsProcessing(true);
    setShowPaymentSelector(false);
    try {
      const result = await createMercadoPagoPreference(id!);
      const initPoint = result?.initPoint;
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        toast.error('No se pudo obtener el link de pago. Intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error processing purchase:', error);
      const msg: string = error?.message ?? 'Ocurrió un error al procesar el pago.';
      // If session is corrupted, redirect to login immediately
      if (msg.toLowerCase().includes('cerrá sesión') || msg.toLowerCase().includes('iniciá sesión') || msg.toLowerCase().includes('cerraste') || msg.toLowerCase().includes('corrupta')) {
        toast.error(msg);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyTicketAstroPay = () => {
    // Placeholder for AstroPay integration
    toast.error('AstroPay no está disponible en este momento');
  };

  const openTransferDetails = () => {
    setShowPaymentSelector(false);
    setShowTransferDetails(true);
  };

  const handleConfirmTransfer = async () => {
    setIsProcessing(true);
    try {
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      const purchaseId = `${user!.uid}_${id}`;
      await setDoc(doc(firestore, 'purchases', purchaseId), {
        user_id: user!.uid,
        event_id: id,
        amount: Number(event?.price),
        currency: event?.currency,
        payment_method: 'transfer',
        payment_status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }, { merge: true });
      
      setShowTransferDetails(false);
      navigate('/payment/pending?status=pending');
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la transferencia');
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

                <div className="space-y-4 min-h-[120px] flex flex-col items-center justify-center">
                  {hasAccess ? (
                    <button
                      key="access-button"
                      onClick={() => navigate(`/watch/${event.id}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      {t('common.accessStream')}
                    </button>
                  ) : (
                    <div className="w-full space-y-4" key="purchase-container">
                      <button
                        key="buy-button"
                        onClick={handleBuyTicketMercadoPago}
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
                      
                      {!isProcessing && event.status !== 'ended' && (
                        <button
                          key="other-methods"
                          onClick={() => setShowPaymentSelector(true)}
                          className="w-full text-slate-500 hover:text-pink-400 text-xs font-bold uppercase tracking-widest transition-colors py-2"
                        >
                          Ver otros métodos de pago
                        </button>
                      )}
                    </div>
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

      {/* Payment Method Selector Modal */}
      {showPaymentSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Selecciona tu método de pago</h3>
              <button onClick={() => setShowPaymentSelector(false)} className="text-slate-500 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={handleBuyTicketMercadoPago}
                className="w-full flex items-center justify-between p-4 bg-sky-600/10 border border-sky-500/20 hover:border-sky-500 hover:bg-sky-600/20 rounded-2xl transition group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Mercado Pago</h4>
                    <p className="text-skin-500 text-slate-400 text-sm">Tarjetas, saldo y más</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-sky-500 rotate-180" />
              </button>

              <button
                onClick={handleBuyTicketAstroPay}
                className="w-full flex items-center justify-between p-4 bg-red-600/10 border border-red-500/20 hover:border-red-500 hover:bg-red-600/20 rounded-2xl transition group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">AstroPay</h4>
                    <p className="text-slate-400 text-sm">Pago seguro y rápido</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-red-500 rotate-180" />
              </button>

              {platformSettings?.transfer_enabled && (
                <button
                  onClick={openTransferDetails}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 hover:border-pink-500/50 hover:bg-slate-800 rounded-2xl transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform group-hover:text-pink-400">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">Transferencia</h4>
                      <p className="text-slate-400 text-sm">Alias / CBU directo</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-pink-500 rotate-180 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Details Modal */}
      {showTransferDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-8 relative">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h3 className="text-xl font-bold text-white">Datos de Transferencia</h3>
              <button onClick={() => setShowTransferDetails(false)} className="text-slate-500 hover:text-white transition bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                <p className="text-slate-400 text-sm mb-1">Total a transferir</p>
                <p className="text-3xl font-black text-white">{event.currency} {new Intl.NumberFormat(locale).format(Number(event.price))}</p>
              </div>

              <div className="space-y-4">
                {platformSettings?.transfer_bank && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Banco / Billetera</p>
                    <div className="bg-slate-800 p-3 rounded-lg text-white font-medium border border-slate-700">
                      {platformSettings.transfer_bank}
                    </div>
                  </div>
                )}
                {platformSettings?.transfer_alias && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Alias</p>
                    <div className="bg-slate-800 p-3 rounded-lg text-white font-medium border border-slate-700 text-lg flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(platformSettings.transfer_alias); toast.success('Alias copiado') }}>
                      <span>{platformSettings.transfer_alias}</span>
                      <span className="text-xs text-pink-400 opacity-0 group-hover:opacity-100 transition">Copiar</span>
                    </div>
                  </div>
                )}
                {platformSettings?.transfer_cbu && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">CBU / CVU</p>
                    <div className="bg-slate-800 p-3 rounded-lg text-white font-medium border border-slate-700 font-mono text-sm tracking-widest flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(platformSettings.transfer_cbu); toast.success('CBU copiado') }}>
                      <span>{platformSettings.transfer_cbu}</span>
                      <span className="text-xs text-pink-400 opacity-0 group-hover:opacity-100 transition">Copiar</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                <p className="text-sm text-blue-200">
                  <strong className="text-blue-400 block mb-1">Instrucciones:</strong>
                  Realiza la transferencia desde tu banco o billetera virtual por el monto exacto. Luego, haz clic en "Ya Transferí" para registrar tu pago. Tu ticket se liberará una vez validemos la acreditación.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowTransferDetails(false); setShowPaymentSelector(true); }}
                  className="w-1/3 py-4 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition"
                  disabled={isProcessing}
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={isProcessing}
                  className="w-2/3 py-4 rounded-xl font-bold text-white btn-gradient disabled:opacity-50 transition shadow-lg shadow-pink-500/20 flex justify-center items-center"
                >
                  {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Ya Transferí'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

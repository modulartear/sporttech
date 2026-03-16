import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { createMercadoPagoPreference } from '../lib/payments';
import { useAuth } from '../hooks/use-auth';
import { Calendar, Clock, DollarSign, Play, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/language-switcher';
import logo from '../assets/logo.png';

type EventDoc = {
  id: string;
  title: string;
  description?: string | null;
  youtube_video_id: string;
  youtube_embed_token?: string;
  event_date: string;
  event_type: 'live' | 'premiere' | 'recorded';
  price: number;
  currency: 'ARS' | 'USD' | 'BRL';
  thumbnail_url?: string | null;
  status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
};

export function HomePage() {
  const { isAuthenticated, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [upcomingEvents, setUpcomingEvents] = useState<EventDoc[]>([]);
  const [pastEvents, setPastEvents] = useState<EventDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Admins can see drafts, others only published/live/ended
      const statusFilter = profile?.role === 'admin' 
        ? ['draft', 'published', 'live', 'ended'] 
        : ['published', 'live', 'ended'];

      const q = query(
        collection(firestore, 'events'),
        where('status', 'in', statusFilter),
        orderBy('event_date', 'asc'),
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EventDoc[];

      const now = new Date();
      // Sorting: live first, then upcoming, then past
      const live = data.filter(e => e.status === 'live');
      const others = data.filter(e => e.status !== 'live');
      const upcoming = others.filter(e => new Date(e.event_date) >= now);
      const past = others.filter(e => new Date(e.event_date) < now);

      setUpcomingEvents([...live, ...upcoming]);
      setPastEvents(past);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';
    return new Date(date).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number, currency: string) => {
    const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleBuyTicket = async (eventId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const { initPoint } = await createMercadoPagoPreference(eventId);

      if (initPoint) {
        window.location.href = initPoint;
      }
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      alert(t('common.error'));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 premium-gradient bg-grid">
      <header className="border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo} alt="Sporttech Logo" className="h-10 w-auto" />
            </Link>

            <nav className="flex items-center gap-4">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <>
                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-bold uppercase tracking-tighter">{t('common.admin')}</span>
                    </Link>
                  )}
                  <Link
                    to="/my-events"
                    className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-tighter">{t('common.myEvents')}</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-bold text-sm uppercase tracking-tighter"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('common.exit')}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl transition font-bold text-sm uppercase tracking-tighter"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t('common.signIn')}</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-bold text-sm uppercase tracking-tighter"
                  >
                    <User className="w-4 h-4" />
                    <span>{t('common.register')}</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            {t('home.title')}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
        </section>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4">{t('home.loadingEvents')}</p>
          </div>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8">{t('home.upcoming')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      formatPrice={formatPrice}
                      onBuyTicket={handleBuyTicket}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastEvents.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold text-white mb-8">{t('home.past')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      formatPrice={formatPrice}
                      isPast
                      onBuyTicket={handleBuyTicket}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {upcomingEvents.length === 0 && pastEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">{t('home.noEvents')}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface EventCardProps {
  event: EventDoc;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  formatPrice: (price: number, currency: string) => string;
  isPast?: boolean;
  onBuyTicket: (eventId: string) => void;
  t: any;
}

function EventCard({ event, formatDate, formatTime, formatPrice, isPast = false, onBuyTicket, t }: EventCardProps) {
  return (
    <Link
      to={`/event/${event.id}`}
      className="group bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-pink-500/50 transition"
    >
      <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Play className="w-16 h-16 text-slate-600" />
          </div>
        )}
        {event.status === 'live' && (
          <div className="absolute top-4 left-4">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {t('common.live')}
            </span>
          </div>
        )}
        {event.status === 'draft' && (
          <div className="absolute top-4 left-4">
            <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              {t('common.draft')}
            </span>
          </div>
        )}
        {isPast && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold">{t('common.finished')}</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition line-clamp-2">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-slate-400 text-sm mb-4 line-clamp-2">{event.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span>{formatTime(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-pink-400 font-semibold">
            <DollarSign className="w-4 h-4" />
            <span>{formatPrice(event.price, event.currency)}</span>
          </div>
        </div>

        {!isPast && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBuyTicket(event.id);
            }}
            className="mt-4 w-full inline-flex justify-center btn-gradient text-white font-medium py-2 px-4 rounded-xl transition"
          >
            {t('common.buyTicket')}
          </button>
        )}
      </div>
    </Link>
  );
}


import { Link } from 'react-router-dom';
import { Calendar, Clock, DollarSign, Play } from 'lucide-react';

export type EventDoc = {
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

interface EventCardProps {
  event: EventDoc;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  formatPrice: (price: number, currency: string) => string;
  isPast?: boolean;
  onBuyTicket: (eventId: string) => void;
  t: any;
}

export function EventCard({ event, formatDate, formatTime, formatPrice, isPast = false, onBuyTicket, t }: EventCardProps) {
  return (
    <Link
      to={`/event/${event.id}`}
      className="group bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-pink-500/50 transition"
    >
      <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Play className="w-16 h-16 text-slate-600 transition-transform group-hover:scale-110 duration-500" />
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

        <div className="space-y-2 text-sm md:text-base">
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-pink-500" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-pink-500" />
            <span>{formatTime(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-pink-400 font-bold mt-2 pt-2 border-t border-slate-700/50">
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
            className="mt-6 w-full inline-flex justify-center btn-gradient text-white font-black italic tracking-tighter uppercase py-3 px-4 rounded-xl transition"
          >
            {t('common.buyTicket')}
          </button>
        )}
      </div>
    </Link>
  );
}

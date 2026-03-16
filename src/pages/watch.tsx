import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../hooks/use-auth';
import { ArrowLeft, ShieldAlert, Lock, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Event = {
  id: string;
  title: string;
  description?: string | null;
  youtube_video_id: string;
  event_date: string;
  status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
};

export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<'no_access' | 'unauthorized' | 'not_found' | null>(null);

  useEffect(() => {
    if (id && user) {
      checkAccessAndFetchEvent();
    } else if (!user) {
      setErrorType('unauthorized');
      setIsLoading(false);
    }
  }, [id, user]);

  const checkAccessAndFetchEvent = async () => {
    setIsLoading(true);
    try {
      // 1. Check if user has an approved purchase (deterministic purchase id)
      const purchaseId = `${user?.uid}_${id}`;
      const purchaseSnap = await getDoc(doc(firestore, 'purchases', purchaseId));
      const paymentStatus = purchaseSnap.exists() ? (purchaseSnap.data() as any).payment_status : null;

      if (paymentStatus !== 'approved') {
        setErrorType('no_access');
        setIsLoading(false);
        return;
      }

      // 2. Fetch event details
      const eventSnap = await getDoc(doc(firestore, 'events', id!));
      if (!eventSnap.exists()) {
        setErrorType('not_found');
        setIsLoading(false);
        return;
      }

      setEvent({ id: eventSnap.id, ...(eventSnap.data() as any) } as Event);

    } catch (error) {
      console.error('Error verifying stream access:', error);
      toast.error('Ocurrió un error al verificar tu acceso');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-6"></div>
        <p className="text-slate-400 animate-pulse font-medium">Validando token de acceso seguro...</p>
      </div>
    );
  }

  if (errorType) {
    const errorConfigs = {
      no_access: {
        icon: <Lock className="w-16 h-16 text-yellow-500 mb-6" />,
        title: "Acceso Denegado",
        desc: "No tienes una suscripción activa para este evento.",
        btn: "Comprar entrada",
        path: `/event/${id}`
      },
      unauthorized: {
        icon: <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />,
        title: "Sesión Requerida",
        desc: "Debes iniciar sesión para acceder a la transmisión.",
        btn: "Ir al login",
        path: "/login"
      },
      not_found: {
        icon: <ShieldAlert className="w-16 h-16 text-slate-500 mb-6" />,
        title: "Evento no encontrado",
        desc: "El evento que intentas ver no existe.",
        btn: "Volver al inicio",
        path: "/"
      }
    };

    const config = errorConfigs[errorType];

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-center">
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-10 rounded-3xl backdrop-blur-xl">
          {config.icon}
          <h1 className="text-2xl font-black text-white mb-2">{config.title}</h1>
          <p className="text-slate-400 mb-8">{config.desc}</p>
          <Link 
            to={config.path} 
            className="w-full inline-block py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-500/20"
          >
            {config.btn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent fixed top-0 w-full z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition group"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base line-clamp-1">{event?.title}</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              <span className="text-[10px] uppercase font-black tracking-widest text-red-500">Live Secure Stream</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-md">
           <Eye className="w-4 h-4 text-green-500" />
           <span className="text-[10px] font-bold text-green-500">VALIDATED</span>
        </div>
      </nav>

      {/* Main Content: Video Player */}
      <main className="flex-1 flex items-center justify-center relative bg-slate-950">
        <div className="w-full aspect-video max-w-6xl shadow-2xl shadow-blue-500/10 relative group">
          <iframe
            src={`https://www.youtube.com/embed/${event?.youtube_video_id}?autoplay=1&modestbranding=1&rel=0`}
            title={event?.title}
            className="w-full h-full rounded-2xl md:border md:border-slate-800 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        
        {/* Protection Overlay (Invisible) */}
        <div className="absolute inset-0 z-[1] pointer-events-none" />
      </main>

      {/* Footer Info */}
      <footer className="p-6 bg-slate-950 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
             <h3 className="text-xl font-bold mb-1">{event?.title}</h3>
             <p className="text-sm text-slate-500 line-clamp-2 md:line-clamp-none max-w-2xl">
               {event?.description}
             </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-blue-500" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Stream ID</p>
                <p className="text-xs font-mono text-slate-300">SECURE-{id?.slice(0, 8)}</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

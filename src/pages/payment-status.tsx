import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status'); // approved, rejected, pending
  
  // Back URLs from MP usually contain parameters like collection_status, status, etc.
  const isApproved = status === 'approved' || searchParams.get('collection_status') === 'approved';
  const isPending = status === 'pending' || searchParams.get('collection_status') === 'in_process';
  const isRejected = !isApproved && !isPending;

  useEffect(() => {
    if (isApproved) {
      toast.success('¡Pago confirmado! Tu entrada ha sido activada.');
    } else if (isPending) {
      toast.info('Estamos procesando tu pago. Te avisaremos pronto.');
    } else {
      toast.error('No se pudo completar el pago.');
    }
  }, [isApproved, isPending]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          {isApproved ? (
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          ) : isPending ? (
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-black text-white mb-4">
          {isApproved ? '¡Pago Exitoso!' : isPending ? 'Pago en Proceso' : isRejected ? 'Pago Fallido' : 'Pago Fallido'}
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          {isApproved 
            ? 'Tu entrada ha sido confirmada con éxito. Ya puedes acceder al evento desde tu panel de usuario.'
            : isPending
            ? 'Estamos confirmando los fondos con tu banco. Generalmente esto toma unos minutos.'
            : 'No hemos podido procesar tu pago. Por favor intenta con otro método o contacta a soporte.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/my-events')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 group"
          >
            <span>Ver Mis Eventos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          {!isApproved && (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl transition"
            >
              Volver al Inicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

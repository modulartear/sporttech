import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const status = searchParams.get('status'); // approved, rejected, pending
  
  // Back URLs from MP usually contain parameters like collection_status, status, etc.
  const isApproved = status === 'approved' || searchParams.get('collection_status') === 'approved';
  const isPending = status === 'pending' || searchParams.get('collection_status') === 'in_process';
  const isRejected = !isApproved && !isPending;

  useEffect(() => {
    if (isApproved) {
      toast.success(t('payment.status.toastSuccess'));
    } else if (isPending) {
      toast.info(t('payment.status.toastPending'));
    } else {
      toast.error(t('payment.status.toastFailed'));
    }
  }, [isApproved, isPending, t]);

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
          {isApproved ? t('payment.status.successTitle') : isPending ? t('payment.status.pendingTitle') : t('payment.status.failedTitle')}
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          {isApproved 
            ? t('payment.status.successDesc')
            : isPending
            ? t('payment.status.pendingDesc')
            : t('payment.status.failedDesc')}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/my-events')}
            className="w-full btn-gradient text-white font-bold py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 group"
          >
            <span>{t('payment.status.viewEvents')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          {!isApproved && (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl transition"
            >
              {t('payment.status.backToHome')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

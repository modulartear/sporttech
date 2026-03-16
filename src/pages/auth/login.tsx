import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/use-auth';
import { LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('auth.login.success'));
        navigate('/');
      }
    } catch (error) {
      toast.error(t('auth.login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] bg-grid px-4">
      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-rose-700/20 blur-[80px] rounded-full" />
        
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-800 p-10 relative z-10">
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img src={logo} alt="Sporttech Logo" className="h-16 w-auto" />
            </Link>
            <p className="text-zinc-500 font-medium mt-4">{t('auth.login.title')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                {t('auth.login.emailLabel')}
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                placeholder={t('auth.login.emailPlaceholder')}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-pink-500 font-medium ml-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                {t('auth.login.passwordLabel')}
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-mono"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-pink-500 font-medium ml-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-zinc-400 hover:text-pink-500 transition-colors font-medium"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gradient py-4 rounded-2xl flex items-center justify-center gap-3 text-base uppercase font-black italic tracking-tighter"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('auth.login.authenticating')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{t('auth.login.submit')}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-zinc-500 font-medium">
              {t('auth.login.newUser')}{' '}
              <Link to="/register" className="text-pink-500 hover:text-pink-400 font-black italic uppercase transition-colors">
                {t('auth.login.registerLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

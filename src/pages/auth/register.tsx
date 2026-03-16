import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/use-auth';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Registro exitoso. Bienvenido!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] bg-grid px-4 py-20">
      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-rose-700/10 blur-[80px] rounded-full" />
        
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-800 p-10 relative z-10">
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-700 rounded-2xl mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <UserPlus className="w-10 h-10 text-white" />
            </Link>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white mb-2">Sport<span className="text-pink-500">tech</span></h1>
            <p className="text-zinc-500 font-medium">Únete a la nueva era del deporte</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                Full Name
              </label>
              <input
                {...register('fullName')}
                type="text"
                id="fullName"
                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                placeholder="Nombre Completo"
              />
              {errors.fullName && (
                <p className="mt-2 text-sm text-pink-500 font-medium ml-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                placeholder="atleta@sporttech.com"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-pink-500 font-medium ml-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                Secret Password
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                id="confirmPassword"
                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-mono"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-pink-500 font-medium ml-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gradient py-4 rounded-2xl flex items-center justify-center gap-3 text-base uppercase font-black italic tracking-tighter"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Crear mi cuenta</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-zinc-500 font-medium">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-pink-500 hover:text-pink-400 font-black italic uppercase transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

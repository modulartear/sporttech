import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firebaseFunctions, firestore } from '../../lib/firebase';
import { toast } from 'sonner';
import { ShieldCheck, UserCog, Mail, Calendar, Key } from 'lucide-react';

type Mode = 'email' | 'uid';

interface UserProfile {
  id: string;
  email?: string;
  role?: string;
  created_at?: any;
}

export function AdminUsersPage() {
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const callable = httpsCallable<any, { users: any[] }>(firebaseFunctions, 'adminListUsers');
      const result = await callable();
      
      const rows = result.data.users.map((u: any) => ({
        id: u.uid,
        email: u.email,
        created_at: { toMillis: () => new Date(u.creationTime).getTime() },
        role: 'user', // Just default for now or we could lookup roles
      })) as UserProfile[];
      
      setUsers(rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error cargando los usuarios (asegúrate de que las rules permitan esto)');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const promoteToAdmin = async () => {
    setIsLoading(true);
    try {
      const callable = httpsCallable<{ email?: string; uid?: string }, { ok: boolean; uid: string }>(
        firebaseFunctions,
        'setAdminClaim',
      );

      const payload = mode === 'email' ? { email: email.trim() } : { uid: uid.trim() };

      if (mode === 'email' && !payload.email) {
        toast.error('Ingresa un email');
        return;
      }
      if (mode === 'uid' && !payload.uid) {
        toast.error('Ingresa un UID');
        return;
      }

      const result = await callable(payload);
      toast.success(`Listo: ${result.data.uid} ahora es admin. Debe cerrar sesión y volver a entrar.`);

      setEmail('');
      setUid('');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? 'No se pudo promover el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Usuarios</h1>
        <p className="text-slate-400">Administra privilegios (custom claims) para el panel.</p>
      </div>

      <div className="max-w-2xl bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Promover a admin</h2>
            <p className="text-sm text-slate-400">
              Esto llama a la Function `setAdminClaim` y setea `admin: true` + `user_profiles.role = admin`.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'email' ? 'bg-blue-600 text-white' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Por email
          </button>
          <button
            type="button"
            onClick={() => setMode('uid')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'uid' ? 'bg-blue-600 text-white' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Por UID
          </button>
        </div>

        {mode === 'email' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">UID</label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="UID de Firebase Auth"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          type="button"
          onClick={promoteToAdmin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-lg transition"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>{isLoading ? 'Promoviendo...' : 'Hacer admin'}</span>
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Nota: el usuario promovido debe <span className="text-slate-200 font-semibold">cerrar sesión y volver a iniciar</span> para que se
          refresque el token y se apliquen las reglas.
        </p>
      </div>

      <div className="mt-12 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Usuarios Registrados</h2>
          <p className="text-slate-400">Listado de todos los usuarios registrados en la plataforma.</p>
        </div>
        <div className="bg-slate-800/50 text-slate-300 font-bold px-4 py-2 rounded-lg border border-slate-700/50">
          {users.length} Registros
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
        {isLoadingUsers ? (
          <div className="flex items-center justify-center h-48">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">UID</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {user.email || 'Sin email'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                          <Key className="w-3.5 h-3.5" />
                          {user.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 uppercase tracking-widest">
                            <ShieldCheck className="w-3.5 h-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 text-slate-400 text-xs font-bold rounded-lg border border-slate-500/20 uppercase tracking-widest">
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {user.created_at ? new Date(user.created_at.toMillis()).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


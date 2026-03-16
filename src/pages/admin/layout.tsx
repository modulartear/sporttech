import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, DollarSign, Users, BarChart3, ArrowLeft } from 'lucide-react';

export function AdminLayout() {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Eventos', href: '/admin/events', icon: Calendar },
    { name: 'Pagos Pendientes', href: '/admin/payments', icon: DollarSign },
    { name: 'Reembolsos', href: '/admin/refunds', icon: DollarSign },
    { name: 'Usuarios', href: '/admin/users', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 fixed left-0 top-0">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold">Admin Panel</h1>
                <p className="text-xs text-slate-400">StreamEvents</p>
              </div>
            </Link>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition mt-8"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Volver al Sitio</span>
            </Link>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  pendingPayments: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [usersCount, eventsCount, approvedSnap, pendingCount] = await Promise.all([
        getCountFromServer(collection(firestore, 'user_profiles')),
        getCountFromServer(collection(firestore, 'events')),
        getDocs(query(collection(firestore, 'purchases'), where('payment_status', '==', 'approved'))),
        getCountFromServer(query(collection(firestore, 'purchases'), where('payment_status', '==', 'pending'))),
      ]);

      const totalRevenue = approvedSnap.docs.reduce((sum, d) => sum + Number((d.data() as any).amount ?? 0), 0);

      setStats({
        totalUsers: usersCount.data().count,
        totalEvents: eventsCount.data().count,
        totalRevenue,
        pendingPayments: pendingCount.data().count,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      title: 'Total Eventos',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'bg-green-600',
    },
    {
      title: 'Ingresos Totales',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-600',
    },
    {
      title: 'Pagos Pendientes',
      value: stats.pendingPayments,
      icon: TrendingUp,
      color: 'bg-red-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 mt-4">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Resumen general de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Plus, CreditCard as Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Event = {
  id: string;
  title: string;
  event_date: string;
  event_type: 'live' | 'premiere' | 'recorded';
  price: number;
  currency: 'ARS' | 'USD' | 'BRL';
  status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
};

export function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'live' | 'ended' | 'cancelled'>('all');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const base = collection(firestore, 'events');
      const q =
        filter === 'all'
          ? query(base, orderBy('event_date', 'desc'))
          : query(base, where('status', '==', filter), orderBy('event_date', 'desc'));

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    try {
      await deleteDoc(doc(firestore, 'events', id));

      toast.success('Evento eliminado exitosamente');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar evento');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Event['status']) => {
    const colors = {
      draft: 'bg-gray-600',
      published: 'bg-blue-600',
      live: 'bg-red-600',
      ended: 'bg-slate-600',
      cancelled: 'bg-yellow-600',
    };

    const labels = {
      draft: 'Borrador',
      published: 'Publicado',
      live: 'En Vivo',
      ended: 'Finalizado',
      cancelled: 'Cancelado',
    };

    return (
      <span className={`${colors[status]} text-white text-xs font-medium px-2.5 py-0.5 rounded`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Eventos</h1>
          <p className="text-slate-400">Gestiona todos los eventos de la plataforma</p>
        </div>
        <Link
          to="/admin/events/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Evento</span>
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        {['all', 'draft', 'published', 'live', 'ended', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as typeof filter)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4">Cargando eventos...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <p className="text-slate-400 text-lg">No hay eventos para mostrar</p>
          <Link
            to="/admin/events/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition mt-4"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Primer Evento</span>
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-900/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{event.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{formatDate(event.event_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300 capitalize">{event.event_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {event.currency} ${event.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(event.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/event/${event.id}`}
                          className="text-blue-400 hover:text-blue-300 transition"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/events/${event.id}/edit`}
                          className="text-green-400 hover:text-green-300 transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

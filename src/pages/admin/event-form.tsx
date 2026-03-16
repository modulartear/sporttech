import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { firestore, firebaseStorage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../hooks/use-auth';
import { ArrowLeft, Loader2, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const eventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  youtube_video_id: z.string().min(1, 'El ID de YouTube es requerido'),
  event_date: z.string().min(1, 'La fecha es requerida'),
  event_type: z.enum(['live', 'premiere', 'recorded']),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  currencies: z.array(z.enum(['ARS', 'USD', 'BRL'])).min(1, 'Selecciona al menos una moneda'),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'live', 'ended', 'cancelled']),
  max_attendees: z.number().min(1, 'Debe ser al menos 1').optional().or(z.literal(0)),
  access_window_hours: z.number().min(0).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!id);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event_type: 'live',
      currencies: ['ARS'],
      status: 'draft',
      price: 0,
      access_window_hours: 0,
    },
  });

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    setIsFetching(true);
    try {
      const snap = await getDoc(doc(firestore, 'events', eventId));
      if (!snap.exists()) throw new Error('Event not found');
      const data = snap.data() as any;

      reset({
        title: data.title,
        description: data.description || '',
        youtube_video_id: data.youtube_video_id,
        event_date: new Date(data.event_date).toISOString().slice(0, 16),
        event_type: data.event_type,
        price: data.price,
        currencies: data.currencies || [data.currency] || ['ARS'],
        thumbnail_url: data.thumbnail_url || '',
        status: data.status,
        max_attendees: data.max_attendees || 0,
        access_window_hours: data.access_window_hours,
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Error al cargar evento');
      navigate('/admin/events');
    } finally {
      setIsFetching(false);
    }
  };

  const thumbnailUrl = watch('thumbnail_url');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(firebaseStorage, `event_thumbnails/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setValue('thumbnail_url', url);
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen. Verifica los permisos de Storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setIsLoading(true);
    try {
      const eventData = {
        ...data,
        currency: data.currencies[0] || 'ARS', // Primary currency for backward compatibility
        event_date: new Date(data.event_date).toISOString(),
        max_attendees: data.max_attendees || null,
        thumbnail_url: data.thumbnail_url || null,
        created_by: user?.uid ?? null,
        updated_at: serverTimestamp(),
      };

      if (id) {
        await setDoc(
          doc(firestore, 'events', id),
          eventData,
          { merge: true },
        );
        toast.success('Evento actualizado exitosamente');
      } else {
        await addDoc(collection(firestore, 'events'), {
          ...eventData,
          created_at: serverTimestamp(),
        });
        toast.success('Evento creado exitosamente');
      }

      navigate('/admin/events');
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Error al guardar evento');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/events')}
        className="flex items-center gap-2 text-slate-300 hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Eventos</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {id ? 'Editar Evento' : 'Nuevo Evento'}
        </h1>
        <p className="text-slate-400">
          {id ? 'Modifica la información del evento' : 'Completa los datos para crear un nuevo evento'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Título *</label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del evento"
            />
            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe el evento..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ID de YouTube *
            </label>
            <input
              {...register('youtube_video_id')}
              type="text"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="dQw4w9WgXcQ"
            />
            {errors.youtube_video_id && (
              <p className="mt-1 text-sm text-red-400">{errors.youtube_video_id.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              El ID del video de YouTube (no la URL completa)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha y Hora *
              </label>
              <input
                {...register('event_date')}
                type="datetime-local"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.event_date && (
                <p className="mt-1 text-sm text-red-400">{errors.event_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo *</label>
              <select
                {...register('event_type')}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="live">En Vivo</option>
                <option value="premiere">Estreno</option>
                <option value="recorded">Grabado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Precio *</label>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Monedas Permitidas *</label>
              <div className="flex flex-wrap gap-4 p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
                {['ARS', 'USD', 'BRL'].map((curr) => (
                  <label key={curr} className="flex items-center gap-2 text-white cursor-pointer group">
                    <input
                      type="checkbox"
                      value={curr}
                      {...register('currencies')}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-pink-500 focus:ring-pink-500 focus:ring-offset-slate-900"
                    />
                    <span className="group-hover:text-pink-400 transition-colors">{curr}</span>
                  </label>
                ))}
              </div>
              {errors.currencies && <p className="mt-1 text-sm text-red-400">{errors.currencies.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">Miniatura del Evento</label>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview Area */}
              <div className="w-full md:w-64 h-40 bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl overflow-hidden flex items-center justify-center group relative">
                {thumbnailUrl ? (
                  <>
                    <img 
                      src={thumbnailUrl} 
                      alt="Miniatura" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold uppercase">Vista previa</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Sin imagen seleccionada</p>
                  </div>
                )}
              </div>

              {/* Upload Actions */}
              <div className="flex-1 space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="thumbnail-upload"
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className={`flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    <span className="font-bold text-sm uppercase italic tracking-tighter">
                      {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                    </span>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 text-xs">URL</span>
                  </div>
                  <input
                    {...register('thumbnail_url')}
                    type="url"
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://o pega una URL externa aquí..."
                  />
                </div>
                <p className="text-xs text-slate-500 italic">
                  * Recomendado: 1280x720px (16:9)
                </p>
                {errors.thumbnail_url && (
                  <p className="mt-1 text-sm text-red-400">{errors.thumbnail_url.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Estado *</label>
              <select
                {...register('status')}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="live">En Vivo</option>
                <option value="ended">Finalizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Máx. Asistentes
              </label>
              <input
                {...register('max_attendees', { valueAsNumber: true })}
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 = Sin límite"
              />
              {errors.max_attendees && (
                <p className="mt-1 text-sm text-red-400">{errors.max_attendees.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ventana de Acceso (horas)
            </label>
            <input
              {...register('access_window_hours', { valueAsNumber: true })}
              type="number"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0 = Solo durante transmisión"
            />
            {errors.access_window_hours && (
              <p className="mt-1 text-sm text-red-400">{errors.access_window_hours.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              0 = Solo durante la transmisión en vivo
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{id ? 'Actualizar' : 'Crear'} Evento</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

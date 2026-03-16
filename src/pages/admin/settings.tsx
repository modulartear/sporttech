import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Save, Loader2, Building } from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [settings, setSettings] = useState({
    transfer_enabled: false,
    transfer_alias: '',
    transfer_cbu: '',
    transfer_bank: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(firestore, 'settings', 'platform'));
      if (snap.exists()) {
        setSettings({
          transfer_enabled: snap.data().transfer_enabled || false,
          transfer_alias: snap.data().transfer_alias || '',
          transfer_cbu: snap.data().transfer_cbu || '',
          transfer_bank: snap.data().transfer_bank || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setDoc(doc(firestore, 'settings', 'platform'), settings, { merge: true });
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
        <p className="text-slate-400">Administra los métodos de pago y otras opciones de la plataforma.</p>
      </div>

      <div className="max-w-3xl bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Datos para Transferencias</h2>
            <p className="text-sm text-slate-400">
              Las personas podrán elegir pagar mediante transferencia y enviarte el comprobante.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <input
              type="checkbox"
              id="transfer_enabled"
              checked={settings.transfer_enabled}
              onChange={(e) => setSettings({ ...settings, transfer_enabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-pink-500 focus:ring-pink-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="transfer_enabled" className="text-white font-medium cursor-pointer">
              Habilitar pagos por Transferencia Bancaria
            </label>
          </div>

          {settings.transfer_enabled && (
            <div className="grid md:grid-cols-2 gap-6 pl-4 border-l-2 border-slate-700/50">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Banco</label>
                <input
                  value={settings.transfer_bank}
                  onChange={(e) => setSettings({ ...settings, transfer_bank: e.target.value })}
                  placeholder="Ej: Banco Galicia / Mercado Pago"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Alias</label>
                <input
                  value={settings.transfer_alias}
                  onChange={(e) => setSettings({ ...settings, transfer_alias: e.target.value })}
                  placeholder="mi.alias.mp"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">CBU / CVU</label>
                <input
                  value={settings.transfer_cbu}
                  onChange={(e) => setSettings({ ...settings, transfer_cbu: e.target.value })}
                  placeholder="000000312312312312"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-medium px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

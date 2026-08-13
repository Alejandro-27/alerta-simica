import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { endpoints } from '../lib/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { COLOMBIA_DEPARTMENTS } from '@shared';
import { Spinner } from '../components/LoadingScreen';

const MUNICIPALITIES_BY_DEPARTMENT: Record<string, string[]> = {
  'Bogotá D.C.': ['Bogotá'],
  'Cundinamarca': ['Bogotá', 'Soacha', 'Zipaquirá', 'Facatativá', 'Girardot', 'Chía', 'Cajicá', 'Fusagasugá', 'Mosquera', 'Madrid'],
  'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro', 'Apartadó', 'Turbo', 'Sonsón', 'Amagá', 'Jericó'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Buga', 'Cartago', 'Jamundí', 'El Cerrito', 'Dagua', 'Ansermanuevo'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'Zapatoca', 'San Gil', 'Socorro'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Miraflores', 'Moniquirá'],
  'Caldas': ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio', 'Neira'],
  'Quindío': ['Armenia', 'Calarcá', 'Salento', 'Filandia', 'Montenegro', 'Quimbaya'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Quinchía'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Líbano', 'Chaparral', 'Honda'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'El Calvario', 'San Martín'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'Barbacoas'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Timbío'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'Aracataca'],
  'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Tierralta'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'San Juan del Cesar'],
  'Cesar': ['Valledupar', 'Aguachica', 'Codazzi', 'La Paz'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Los Patios'],
  'Arauca': ['Arauca', 'Saravena', 'Tame'],
  'Casanare': ['Yopal', 'Aguazul', 'Villanueva'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués'],
  'Chocó': ['Quibdó', 'Istmina', 'Acandí', 'Bahía Solano', 'Nuquí'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán'],
  'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito'],
  'Amazonas': ['Leticia'],
  'Guainía': ['Inírida'],
  'Guaviare': ['San José del Guaviare'],
  'Vaupés': ['Mitú'],
  'Vichada': ['Puerto Carreño'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
};

export default function SettingsLocation() {
  const { user, refreshUser } = useAuth();
  const geo = useGeolocation();
  const [manual, setManual] = useState({
    country: 'Colombia',
    department: user?.locationManual?.department ?? '',
    municipality: user?.locationManual?.municipality ?? '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const gpsSet = Boolean(user?.location?.latitude);
  const manualSet = Boolean(user?.locationManual?.latitude && user?.locationManual?.longitude);

  const useMyLocation = async () => {
    setError(null);
    setMessage(null);
    const loc = await geo.request();
    if (!loc) {
      setError(geo.error ?? 'No se pudo obtener la ubicación.');
      return;
    }
    setBusy(true);
    try {
      await endpoints.updateLocation({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy });
      await refreshUser();
      setMessage('Ubicación guardada. Se usa solo para calcular alertas cercanas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ubicación.');
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await endpoints.updateManualLocation(manual);
      await refreshUser();
      const place = manual.municipality || manual.department || 'tu ubicación';
      setMessage(`Ubicación guardada. Las distancias se calculan desde ${place}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  const removeLocation = async () => {
    setBusy(true);
    try {
      await endpoints.deleteLocation();
      await refreshUser();
      setMessage('Ubicación eliminada. Recibirás solo alertas nacionales.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    } finally {
      setBusy(false);
    }
  };

  const manualCoords =
    user?.locationManual?.latitude != null && user?.locationManual?.longitude != null
      ? `${user.locationManual.latitude.toFixed(3)}, ${user.locationManual.longitude.toFixed(3)}`
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-body">Mi ubicación</h1>
      <p className="mt-1 text-sm text-body-muted">
        Tu ubicación es <strong>opcional</strong> y se usa únicamente para calcular distancias y alertas cerca de ti. Solo se guarda la última ubicación.
      </p>

      <div className="card mt-6">
        <h2 className="font-bold text-body">Usar mi ubicación</h2>
        <p className="mt-1 text-sm text-body-muted">
          El navegador te pedirá permiso. Si lo rechazas, puedes escribir tu municipio manualmente.
        </p>
        <button onClick={() => void useMyLocation()} disabled={busy || geo.loading} className="btn-primary mt-3">
          {(busy || geo.loading) && <Spinner />}
          {gpsSet ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
        </button>
        {geo.loading && <p className="mt-2 text-sm text-body-muted">Obteniendo ubicación…</p>}
        {gpsSet && (
          <p className="mt-3 text-sm text-body-muted">
            Ubicación guardada: {user!.location!.latitude.toFixed(4)}, {user!.location!.longitude.toFixed(4)}
            {user?.location?.accuracy ? ` · precisión ±${Math.round(user.location.accuracy)} m` : ''} ·{' '}
            {new Date(user!.location!.updatedAt).toLocaleString('es-CO')}
          </p>
        )}
      </div>

      <form className="card mt-6 space-y-4" onSubmit={saveManual}>
        <h2 className="font-bold text-body">Ingresar ubicación manualmente</h2>
        <p className="-mt-2 text-xs text-body-muted">
          Si tu municipio está en la lista, las distancias se calculan desde él; si no, desde el centro del departamento.
        </p>
        <div>
          <label htmlFor="country" className="label">País</label>
          <input id="country" className="input" value={manual.country} onChange={(e) => setManual((m) => ({ ...m, country: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="department" className="label">Departamento</label>
          <select
            id="department"
            className="input"
            value={manual.department}
            onChange={(e) => setManual((m) => ({ ...m, department: e.target.value, municipality: '' }))}
          >
            <option value="">Selecciona…</option>
            {COLOMBIA_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="municipality" className="label">Municipio</label>
          <input
            id="municipality"
            list="municipalities"
            className="input"
            value={manual.municipality}
            onChange={(e) => setManual((m) => ({ ...m, municipality: e.target.value }))}
            placeholder="Ej. Bogotá, Medellín, Cali…"
          />
          <datalist id="municipalities">
            {(MUNICIPALITIES_BY_DEPARTMENT[manual.department] ?? []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        {manualSet && manualCoords && (
          <p className="text-xs text-body-muted">
            Coordenadas de referencia: {manualCoords}
            {user?.locationManual?.municipality ? ` (${user.locationManual.municipality})` : ''}
          </p>
        )}
        {error && <p className="text-sm text-sev-critical" role="alert">{error}</p>}
        {message && <p className="text-sm text-sev-low" role="status">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy && <Spinner />} Guardar ubicación
          </button>
          {(gpsSet || manualSet) && (
            <button type="button" className="btn-secondary" onClick={() => void removeLocation()}>
              Eliminar mi ubicación
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-body-faint">
        Tu ubicación se guarda cifrada en la base de datos y solo se usa para calcular distancias a eventos sísmicos. Puedes eliminarla cuando quieras.
      </p>
    </div>
  );
}

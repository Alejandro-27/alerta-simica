import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-black text-seismic-600">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-white">Página no encontrada</h1>
      <p className="mt-2 text-sm text-slate-400">
        La página que buscas no existe o fue movida.
      </p>
      <Link to="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}

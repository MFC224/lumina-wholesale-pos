import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-black text-[#081C6C]">Página no encontrada</h2>
        <p className="text-sm text-slate-600">
          La ruta que intentas consultar no existe o ha sido reubicada.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[#081C6C] text-white font-bold text-sm rounded-xl hover:bg-[#061550] transition shadow-xs"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}

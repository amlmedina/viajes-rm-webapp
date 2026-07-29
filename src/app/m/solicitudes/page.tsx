'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileSolicitudes() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  
  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="p-4 space-y-6">
      <header className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Nueva Solicitud</h1>
        <p className="text-slate-400 font-bold text-xs">Paso {step} de 3</p>
      </header>

      {/* Stepper Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-pink-500' : 'bg-slate-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-black text-slate-700">¿Qué necesitas?</h2>
          <div className="grid grid-cols-2 gap-4">
            <TipoButton icon="✈️" label="Vuelo" active={tipo === 'Vuelo'} onClick={() => setTipo('Vuelo')} />
            <TipoButton icon="🏨" label="Hotel" active={tipo === 'Hotel'} onClick={() => setTipo('Hotel')} />
            <TipoButton icon="✈️+🏨" label="Ambos" active={tipo === 'Ambos'} onClick={() => setTipo('Ambos')} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-black text-slate-700">Detalles del Viaje</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Origen" value={origen} onChange={e => setOrigen(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500" />
            <input type="text" placeholder="Destino" value={destino} onChange={e => setDestino(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500" />
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-lg font-black text-slate-700">Pasajeros</h2>
          <p className="text-sm font-bold text-slate-400">Selecciona quién viaja.</p>
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-center text-slate-500 font-bold text-sm">
            [Lista de Pasajeros de la Empresa]
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4 mt-8 border-t border-slate-100">
        {step > 1 && (
          <button onClick={handlePrev} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 font-black p-4 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-xs">
            Atrás
          </button>
        )}
        <button 
          onClick={step === 3 ? () => router.push('/m/dashboard') : handleNext} 
          disabled={step === 1 && !tipo}
          className="flex-1 bg-slate-900 text-white font-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs disabled:opacity-50"
        >
          {step === 3 ? 'Enviar' : 'Siguiente'}
        </button>
      </div>

    </div>
  );
}

function TipoButton({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all active:scale-95 ${
        active 
          ? 'border-pink-500 bg-pink-50 text-pink-700' 
          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
      }`}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="font-black tracking-wide">{label}</span>
    </button>
  );
}

'use client';
import { useState } from 'react';

interface Props {
  idTicket: string;
  pasajerosCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyOption = (pax: number) => ({
  id: Date.now() + Math.random(),
  aerolinea: '',
  origen: '',
  destino: '',
  fecha: '',
  salida: '',
  llegada: '',
  vuelo: '',
  pnr: '',
  comentario: '',
  costo: 0,
  fee: pax * 300, // Fee standard $300 por pax
  aplicaIva: true
});

export default function CargarCotizacionesModal({ idTicket, pasajerosCount, onClose, onSuccess }: Props) {
  const [opciones, setOpciones] = useState([emptyOption(pasajerosCount)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => setOpciones([...opciones, emptyOption(pasajerosCount)]);
  const removeOption = (idx: number) => setOpciones(opciones.filter((_, i) => i !== idx));

  const updateOpt = (idx: number, field: string, val: any) => {
    setOpciones(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  };

  const handleSubmit = async () => {
    if (opciones.some(o => !o.costo || !o.aerolinea)) {
      setError('Costo y Aerolínea son obligatorios.');
      return;
    }
    setLoading(true);

    const payload = opciones.map(o => {
      const sub = Number(o.costo) + Number(o.fee);
      const total = o.aplicaIva ? sub * 1.16 : sub;
      
      const htmlDesc = `
        <div class="space-y-1">
          <p><b>Aerolinea:</b> ${o.aerolinea}</p>
          <p><b>Ruta:</b> ${o.origen.toUpperCase()} -> ${o.destino.toUpperCase()}</p>
          <p><b>Fecha:</b> ${o.fecha} | <b>Horario:</b> ${o.salida || 'TBA'} - ${o.llegada || 'TBA'}</p>
          <p><b>Vuelo:</b> ${(o.vuelo || 'Pendiente').toUpperCase()} | <b>PNR:</b> <span class="font-mono text-indipris font-black">${(o.pnr || 'Pendiente').toUpperCase()}</span></p>
          ${o.comentario ? `<p class="mt-2 text-[10px] text-slate-500 italic border-t border-slate-100 pt-2">${o.comentario}</p>` : ''}
        </div>
      `.trim();

      return {
        desc: htmlDesc,
        costo: o.costo,
        fee: o.fee,
        total: total
      };
    });

    try {
      const authRaw = typeof window !== 'undefined' ? localStorage.getItem('indipris_session_secure') : null;
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAllOptions',
          auth: { u: auth?.name, h: auth?.hash },
          idTicket,
          opciones: payload
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onSuccess();
      } else {
        setError(data.message || 'Error al guardar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-[2rem] md:rounded-[2rem] overflow-hidden border-t-8 border-indipris" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden shrink-0"></div>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">Cargar Cotizaciones</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 font-bold text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 no-scrollbar">
          {opciones.map((o, idx) => (
            <div key={o.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
              <span className="absolute -top-3 left-4 bg-slate-800 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">Opción {idx + 1}</span>
              {opciones.length > 1 && (
                <button onClick={() => removeOption(idx)} className="absolute top-2 right-2 text-red-500 font-bold text-xs bg-red-50 w-6 h-6 rounded-full flex items-center justify-center">x</button>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Aerolínea</label>
                  <input type="text" value={o.aerolinea} onChange={e => updateOpt(idx, 'aerolinea', e.target.value)} placeholder="Ej. VIVA, AMX" className="w-full border-b-2 border-slate-200 py-1 font-bold outline-none text-sm focus:border-indipris" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Ruta (Origen -{'>'} Destino)</label>
                  <div className="flex gap-2 items-center">
                    <input type="text" value={o.origen} onChange={e => updateOpt(idx, 'origen', e.target.value)} placeholder="MEX" className="w-full border-b-2 border-slate-200 py-1 font-bold outline-none text-sm text-center" />
                    <span>→</span>
                    <input type="text" value={o.destino} onChange={e => updateOpt(idx, 'destino', e.target.value)} placeholder="CUN" className="w-full border-b-2 border-slate-200 py-1 font-bold outline-none text-sm text-center" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Fecha</label>
                  <input type="date" value={o.fecha} onChange={e => updateOpt(idx, 'fecha', e.target.value)} className="w-full border-b-2 border-slate-200 py-1 font-bold outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Vuelo / PNR</label>
                  <div className="flex gap-2">
                    <input type="text" value={o.vuelo} onChange={e => updateOpt(idx, 'vuelo', e.target.value)} placeholder="VB 123" className="w-full border-b-2 border-slate-200 py-1 font-bold outline-none text-sm" />
                    <input type="text" value={o.pnr} onChange={e => updateOpt(idx, 'pnr', e.target.value)} placeholder="X7B9M2" className="w-full border-b-2 border-slate-200 py-1 font-black text-pink-600 outline-none text-sm uppercase" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Costo Base</label>
                  <input type="number" value={o.costo} onChange={e => updateOpt(idx, 'costo', e.target.value)} className="w-full border-b-2 border-slate-200 py-1 font-black text-slate-700 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Fee Total ({pasajerosCount} pax)</label>
                  <input type="number" value={o.fee} onChange={e => updateOpt(idx, 'fee', e.target.value)} className="w-full border-b-2 border-slate-200 py-1 font-bold text-slate-600 outline-none text-sm" />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" checked={o.aplicaIva} onChange={e => updateOpt(idx, 'aplicaIva', e.target.checked)} className="w-4 h-4 accent-pink-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">+16% IVA</span>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Comentarios</label>
                <textarea rows={2} value={o.comentario} onChange={e => updateOpt(idx, 'comentario', e.target.value)} className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-slate-600 outline-none focus:border-indipris resize-none" placeholder="Opcional..." />
              </div>
              
              <div className="mt-3 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Total Venta:</p>
                <p className="text-xl font-black text-indipris">${( (Number(o.costo)+Number(o.fee)) * (o.aplicaIva ? 1.16 : 1) ).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          ))}
          <button onClick={addOption} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:bg-white hover:border-indipris hover:text-indipris transition">+ Añadir otra opción</button>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-2 py-3 bg-indipris text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-200 hover:brightness-110 transition disabled:opacity-50">
            {loading ? 'Guardando...' : '✓ Enviar Cotización al Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

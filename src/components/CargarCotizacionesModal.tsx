'use client';
import { useState, useEffect } from 'react';

export const CATEGORIZED_AIRLINES = [
  // 🇲🇽 MÉXICO (Prioridad 1)
  { code: 'AM', name: 'Aeroméxico', region: 'México' },
  { code: 'Y4', name: 'Volaris', region: 'México' },
  { code: 'VB', name: 'VivaAerobus', region: 'México' },
  { code: 'ZV', name: 'Aerus', region: 'México' },
  { code: 'YQ', name: 'TAR Aerolíneas', region: 'México' },
  { code: 'UJ', name: 'Magnicharters', region: 'México' },
  { code: 'MX', name: 'Mexicana de Aviación', region: 'México' },

  // 🇺🇸 USA & NORTEAMÉRICA (Prioridad 2)
  { code: 'AA', name: 'American Airlines', region: 'USA' },
  { code: 'UA', name: 'United Airlines', region: 'USA' },
  { code: 'DL', name: 'Delta Air Lines', region: 'USA' },
  { code: 'WN', name: 'Southwest Airlines', region: 'USA' },
  { code: 'AS', name: 'Alaska Airlines', region: 'USA' },
  { code: 'B6', name: 'JetBlue Airways', region: 'USA' },
  { code: 'NK', name: 'Spirit Airlines', region: 'USA' },
  { code: 'F9', name: 'Frontier Airlines', region: 'USA' },
  { code: 'AC', name: 'Air Canada', region: 'USA' },
  { code: 'WS', name: 'WestJet', region: 'USA' },

  // 🇪🇺 EUROPA & INTERNACIONAL (Prioridad 3)
  { code: 'IB', name: 'Iberia', region: 'Europa' },
  { code: 'UX', name: 'Air Europa', region: 'Europa' },
  { code: 'AF', name: 'Air France', region: 'Europa' },
  { code: 'KL', name: 'KLM Royal Dutch', region: 'Europa' },
  { code: 'LH', name: 'Lufthansa', region: 'Europa' },
  { code: 'BA', name: 'British Airways', region: 'Europa' },
  { code: 'TP', name: 'TAP Air Portugal', region: 'Europa' },
  { code: 'LX', name: 'SWISS', region: 'Europa' },
  { code: 'TK', name: 'Turkish Airlines', region: 'Europa' },
  { code: 'EK', name: 'Emirates', region: 'Internacional' },
  { code: 'QR', name: 'Qatar Airways', region: 'Internacional' },
  { code: 'AV', name: 'Avianca', region: 'Latinoamérica' },
  { code: 'CM', name: 'Copa Airlines', region: 'Latinoamérica' },
  { code: 'LA', name: 'LATAM Airlines', region: 'Latinoamérica' }
];

export function getCustomAirlines(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('indipris_custom_airlines');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function rememberAirline(airline: string): void {
  if (!airline || typeof window === 'undefined') return;
  const clean = airline.trim();
  if (!clean || clean.length < 2) return;
  try {
    const current = getCustomAirlines();
    const inCatalog = CATEGORIZED_AIRLINES.some(
      a => a.name.toLowerCase() === clean.toLowerCase() || a.code.toLowerCase() === clean.toLowerCase()
    );
    if (!inCatalog && !current.some(c => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [clean, ...current];
      localStorage.setItem('indipris_custom_airlines', JSON.stringify(updated));
    }
  } catch {}
}

interface Props {
  idTicket: string;
  pasajerosCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyOption = (pax: number, index = 1) => ({
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
  costoProveedor: 0,
  fee: pax * 300,
  aplicaIva: true
});

export default function CargarCotizacionesModal({ idTicket, pasajerosCount, onClose, onSuccess }: Props) {
  const [opciones, setOpciones] = useState([emptyOption(pasajerosCount, 1)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customAirlines, setCustomAirlines] = useState<string[]>([]);

  useEffect(() => {
    setCustomAirlines(getCustomAirlines());
  }, []);

  const addOption = () => setOpciones([...opciones, emptyOption(pasajerosCount, opciones.length + 1)]);
  const removeOption = (idx: number) => setOpciones(opciones.filter((_, i) => i !== idx));

  const updateOpt = (idx: number, field: string, val: any) => {
    setOpciones(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
    if (field === 'aerolinea' && typeof val === 'string' && val.trim().length > 2) {
      rememberAirline(val);
      setCustomAirlines(getCustomAirlines());
    }
  };

  const handleAirlineSelect = (idx: number, airlineName: string) => {
    updateOpt(idx, 'aerolinea', airlineName);
  };

  const handleSubmit = async () => {
    if (opciones.some(o => !o.costo || !o.aerolinea)) {
      setError('Por favor indica Costo y Aerolínea en todas las opciones.');
      return;
    }
    setLoading(true);

    // Save any custom airlines entered
    opciones.forEach(o => {
      if (o.aerolinea) rememberAirline(o.aerolinea);
    });

    const payload = opciones.map(o => {
      const sub = Number(o.costo) + Number(o.fee);
      const total = o.aplicaIva ? sub * 1.16 : sub;
      
      const htmlDesc = `
        <div class="space-y-1">
          <p><b>Aerolinea:</b> ${o.aerolinea}</p>
          <p><b>Ruta:</b> ${o.origen.toUpperCase()} ➔ ${o.destino.toUpperCase()}</p>
          <p><b>Fecha:</b> ${o.fecha} | <b>Horario:</b> ${o.salida || 'Por definir'} - ${o.llegada || 'Por definir'}</p>
          <p><b>Vuelo:</b> ${(o.vuelo || 'Pendiente').toUpperCase()} | <b>PNR:</b> <span class="font-mono text-pink-600 font-black">${(o.pnr || 'Pendiente').toUpperCase()}</span></p>
          ${o.comentario ? `<p class="mt-2 text-[10px] text-slate-500 italic border-t border-slate-100 pt-2">${o.comentario}</p>` : ''}
        </div>
      `.trim();

      return {
        desc: htmlDesc,
        costo: Number(o.costo) || 0,
        fee: Number(o.fee) || 0,
        total: total,
        costoProveedor: Number(o.costoProveedor) || 0
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
        setError(data.message || 'Error al guardar cotización');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const topPills = ['Aeroméxico', 'Volaris', 'VivaAerobus', 'American Airlines', 'Iberia', 'United Airlines'];

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-sm" onClick={onClose}>
      {/* ── DATALIST GLOBAL DE AEROLÍNEAS ─────────────────────────────────── */}
      <datalist id="datalist-aerolineas-desktop">
        {customAirlines.length > 0 && (
          <>
            {customAirlines.map(c => (
              <option key={`custom-${c}`} value={c}>⭐ {c} (Guardada)</option>
            ))}
          </>
        )}
        {CATEGORIZED_AIRLINES.map(a => (
          <option key={`${a.code}-${a.name}`} value={a.name}>
            {a.region === 'México' ? '🇲🇽' : a.region === 'USA' ? '🇺🇸' : '🇪🇺'} {a.name} ({a.code}) · {a.region}
          </option>
        ))}
      </datalist>

      {/* ── CONTENEDOR MODAL FULL WIDE ────────────────────────────────────── */}
      <div 
        className="bg-white w-full max-w-6xl xl:max-w-7xl shadow-2xl flex flex-col h-[94vh] rounded-3xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Superior */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-pink-500/20 border border-pink-500/40 rounded-xl flex items-center justify-center text-pink-400 font-black text-lg">
              ✈️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Cargar Opciones de Cotización</h2>
                <span className="bg-pink-600/30 text-pink-400 border border-pink-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black">
                  {idTicket}
                </span>
                <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  👥 {pasajerosCount} Pasajero{pasajerosCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Ingresa y compara las opciones disponibles. Puedes agregar tantas alternativas como requiera el cliente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={addOption}
              className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-lg shadow-pink-900/30 flex items-center gap-1.5 uppercase tracking-wider"
            >
              <span>+ Añadir Opción</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white font-bold text-xl h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-2.5 text-xs font-bold text-center shrink-0">
            ⚠️ {error}
          </div>
        )}

        {/* ── CUERPO DEL MODAL (GRID MULTI-COLUMNA EN PANTALLA ANCHA) ─────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/70">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opciones.map((o, idx) => {
              const subtotal = Number(o.costo || 0) + Number(o.fee || 0);
              const totalCalculado = o.aplicaIva ? subtotal * 1.16 : subtotal;

              return (
                <div 
                  key={o.id} 
                  className="bg-white rounded-3xl border-2 border-slate-200/80 hover:border-pink-300 transition-all shadow-sm hover:shadow-md flex flex-col overflow-hidden relative"
                >
                  {/* Barra superior de la tarjeta */}
                  <div className="bg-slate-100/80 px-5 py-3 border-b border-slate-200/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Opción {idx + 1}
                      </span>
                      {o.aerolinea && (
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
                          {o.aerolinea}
                        </span>
                      )}
                    </div>
                    {opciones.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeOption(idx)} 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold px-2 py-1 rounded-lg transition"
                      >
                        ✕ Eliminar
                      </button>
                    )}
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    {/* Campo Aerolínea con Autocompletado y Pills rápidas */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                          Aerolínea <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">
                          México • USA • Europa
                        </span>
                      </div>
                      <input 
                        type="text" 
                        list="datalist-aerolineas-desktop"
                        value={o.aerolinea} 
                        onChange={e => updateOpt(idx, 'aerolinea', e.target.value)} 
                        onBlur={e => e.target.value && rememberAirline(e.target.value)}
                        placeholder="Escribe o selecciona (ej. Aeroméxico, Volaris...)" 
                        className="w-full bg-indigo-50/40 border-2 border-indigo-200 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-black text-sm text-slate-800 outline-none transition" 
                        required
                      />

                      {/* Accesos rápidos a las aerolíneas más comunes */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {topPills.map(ap => (
                          <button
                            key={ap}
                            type="button"
                            onClick={() => handleAirlineSelect(idx, ap)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition ${
                              o.aerolinea.toLowerCase() === ap.toLowerCase() 
                                ? 'bg-indigo-600 text-white border-indigo-600 font-black' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                          >
                            {ap}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ruta (Origen ➔ Destino) */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Ruta de Vuelo
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={o.origen} 
                            onChange={e => updateOpt(idx, 'origen', e.target.value.toUpperCase())} 
                            placeholder="ORIGEN (MEX)" 
                            className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 uppercase outline-none text-center"
                          />
                          <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">De:</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={o.destino} 
                            onChange={e => updateOpt(idx, 'destino', e.target.value.toUpperCase())} 
                            placeholder="DESTINO (CUN)" 
                            className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 uppercase outline-none text-center"
                          />
                          <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">A:</span>
                        </div>
                      </div>
                    </div>

                    {/* Fechas y Horarios */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fecha</label>
                        <input 
                          type="date" 
                          value={o.fecha} 
                          onChange={e => updateOpt(idx, 'fecha', e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Salida</label>
                        <input 
                          type="time" 
                          value={o.salida} 
                          onChange={e => updateOpt(idx, 'salida', e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Llegada</label>
                        <input 
                          type="time" 
                          value={o.llegada} 
                          onChange={e => updateOpt(idx, 'llegada', e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    {/* No. de Vuelo y PNR */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">No. Vuelo</label>
                        <input 
                          type="text" 
                          value={o.vuelo} 
                          onChange={e => updateOpt(idx, 'vuelo', e.target.value.toUpperCase())} 
                          placeholder="Ej. AM500" 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 uppercase outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-pink-600 uppercase block mb-1">PNR / Localizador</label>
                        <input 
                          type="text" 
                          value={o.pnr} 
                          onChange={e => updateOpt(idx, 'pnr', e.target.value.toUpperCase())} 
                          placeholder="Ej. X7B9M2" 
                          className="w-full bg-pink-50/50 border border-pink-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs font-black text-pink-700 font-mono uppercase outline-none"
                        />
                      </div>
                    </div>

                    {/* Comentarios para el cliente */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                        Comentarios / Inclusiones
                      </label>
                      <textarea 
                        rows={2} 
                        value={o.comentario} 
                        onChange={e => updateOpt(idx, 'comentario', e.target.value)} 
                        placeholder="Ej. Incluye 1 maleta documentada de 25kg, asiento turista..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 outline-none focus:border-pink-500 resize-none"
                      />
                    </div>

                    {/* Sección Financiera */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">
                            Costo Venta Base
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">$</span>
                            <input 
                              type="number" 
                              value={o.costo || ''} 
                              onChange={e => updateOpt(idx, 'costo', e.target.value)} 
                              placeholder="0.00" 
                              className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-pink-500" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">
                            Fee ({pasajerosCount} pax)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">$</span>
                            <input 
                              type="number" 
                              value={o.fee || ''} 
                              onChange={e => updateOpt(idx, 'fee', e.target.value)} 
                              placeholder="0.00" 
                              className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-pink-500" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={o.aplicaIva} 
                            onChange={e => updateOpt(idx, 'aplicaIva', e.target.checked)} 
                            className="w-4 h-4 accent-pink-600 rounded" 
                          />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">+16% IVA</span>
                        </label>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Opción</span>
                          <span className="text-base font-black text-pink-600">
                            ${totalCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER BAR WIDESCREEN ─────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500">
              Total de Opciones: <b className="text-slate-800">{opciones.length}</b>
            </span>
            <span className="text-slate-300">|</span>
            <button 
              type="button" 
              onClick={addOption} 
              className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1 uppercase tracking-wider"
            >
              + Añadir otra opción alternativa
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 md:flex-initial px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-wider transition"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex-2 md:flex-initial px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-200 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Guardando cotización...</span>
              ) : (
                <span>✓ Enviar Cotización al Cliente ({opciones.length})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

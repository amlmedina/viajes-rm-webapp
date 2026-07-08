'use client';
import { useState, useEffect } from 'react';

const TIPOS_SERVICIO = [
  { val: 'VUELO', label: '✈️ VUELO' },
  { val: 'HOTEL', label: '🏨 HOTEL' },
  { val: 'BUS',   label: '🚌 AUTOBÚS' },
  { val: 'Extra', label: '➕ OTRO' },
];

const TRAYECTOS = [
  { val: 'Redondo',      label: '🔁 Redondo' },
  { val: 'Sencillo',     label: '➡️ Sencillo' },
  { val: 'Multidestino', label: '🔀 Multidestino' },
  { val: 'ConEscala',    label: '✈️ Con Escala' },
];

const HORARIOS = [
  { val: 'Indiferente',              label: 'Indiferente' },
  { val: 'Manana (00:00 - 11:59)',   label: 'Mañana' },
  { val: 'Medio Dia (12:00 - 15:59)', label: 'Medio Día' },
  { val: 'Tarde (16:00 - 19:59)',    label: 'Tarde' },
  { val: 'Noche (20:00 - 23:59)',    label: 'Noche' },
];

const ASIENTOS = ['Indiferente', 'Ventana', 'Pasillo', 'Cama Alta', 'Cama Baja'];
const MALETAS = ['Solo Artículo Personal', 'Maleta de Mano', 'Maleta 23kg', 'Maleta 32kg', '2 Maletas 23kg'];

interface Props {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyService = () => ({
  id: 'SVC-' + Date.now() + Math.random().toString(36).substr(2, 5),
  tipo: 'VUELO',
  vueloTipo: 'Redondo',
  origen: '',
  destino: '',
  fechaIn: '',
  fechaOut: '',
  horaIda: 'Indiferente',
  horaRegreso: 'Indiferente',
  terminalSalida: '',
  terminalRegreso: '',
  escala: '',
  detalles: '',
  tramos: [
    { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' },
    { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' },
  ]
});

const emptyPassenger = () => ({
  id: Date.now() + Math.random(),
  nombre: '',
  nacimiento: '',
  asiento: 'Indiferente',
  maletas: 'Solo Artículo Personal',
  linkId: ''
});

export default function NuevaSolicitudModal({ user, onClose, onSuccess }: Props) {
  const [servicios, setServicios] = useState([emptyService()]);
  const [pasajeros, setPasajeros] = useState([emptyPassenger()]);
  const [evento, setEvento] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [catalogos, setCatalogos] = useState<{
    ciudades: string[];
    origenes: string[];
    destinos: string[];
    pasajeros: any[];
    eventos: string[];
  }>({ ciudades: [], origenes: [], destinos: [], pasajeros: [], eventos: [] });

  useEffect(() => {
    fetch('/api/catalogos')
      .then(r => r.json())
      .then(d => { if (d.data) setCatalogos(d.data); });
  }, []);

  const handlePaxNombre = (i: number, nombre: string) => {
    updatePassenger(i, 'nombre', nombre);
    const found = catalogos.pasajeros.find(
      p => p.nombre?.toLowerCase() === nombre.toLowerCase()
    );
    if (found) {
      setPasajeros(prev => prev.map((p, idx) =>
        idx === i ? {
          ...p,
          nombre,
          nacimiento: found.nacimiento || p.nacimiento,
          asiento: found.asientoCama || p.asiento,
          maletas: found.maletas || p.maletas,
          linkId: found.linkIdDrive || p.linkId,
        } : p
      ));
    }
  };

  const updateService = (i: number, field: string, value: any) =>
    setServicios(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const updateTramo = (sIdx: number, tIdx: number, field: string, value: string) => {
    setServicios(prev => prev.map((s, idx) => {
      if (idx !== sIdx) return s;
      const newTramos = s.tramos.map((t, tidx) => tidx === tIdx ? { ...t, [field]: value } : t);
      return { ...s, tramos: newTramos };
    }));
  };

  const addTramo = (sIdx: number) => {
    setServicios(prev => prev.map((s, idx) => idx === sIdx ? {
      ...s,
      tramos: [...s.tramos, { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' }]
    } : s));
  };

  const removeTramo = (sIdx: number, tIdx: number) => {
    setServicios(prev => prev.map((s, idx) => idx === sIdx ? {
      ...s,
      tramos: s.tramos.filter((_, tidx) => tidx !== tIdx)
    } : s));
  };

  const removeService = (i: number) => setServicios(prev => prev.filter((_, idx) => idx !== i));
  const addService = () => setServicios(prev => [...prev, emptyService()]);

  const updatePassenger = (i: number, field: string, value: any) =>
    setPasajeros(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  const removePassenger = (i: number) => setPasajeros(prev => prev.filter((_, idx) => idx !== i));
  const addPassenger = () => setPasajeros(prev => [...prev, emptyPassenger()]);

  const handleSubmit = async () => {
    // Basic validation
    if (servicios.some(s => !s.tipo)) { setError('Completa el tipo de servicio.'); return; }
    if (pasajeros.some(p => !p.nombre.trim())) { setError('Completa el nombre de todos los pasajeros.'); return; }

    setError('');
    setLoading(true);

    const serviciosProcesados: any[] = [];
    let faltanDatos = false;

    servicios.forEach(s => {
      if (s.tipo === 'VUELO') {
        if (s.vueloTipo === 'Redondo') {
          if (!s.origen || !s.destino || !s.fechaIn || !s.fechaOut) faltanDatos = true;
          let d = `Vuelo Redondo | Ida: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          d += ` | Regreso: ${s.horaRegreso}`;
          if (s.terminalRegreso) d += ` (Term: ${s.terminalRegreso})`;
          serviciosProcesados.push({ ...s, detalles: d });
        } else if (s.vueloTipo === 'Sencillo') {
          if (!s.origen || !s.destino || !s.fechaIn) faltanDatos = true;
          let d = `Vuelo Sencillo | Horario: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          serviciosProcesados.push({ ...s, fechaOut: '', detalles: d });
        } else if (s.vueloTipo === 'Multidestino') {
          s.tramos.forEach((t, i) => {
            if (!t.origen || !t.destino || !t.fecha) faltanDatos = true;
            let d = `Tramo ${i + 1} (Multidestino) | Horario: ${t.hora}`;
            if (t.terminalSalida) d += ` (Term: ${t.terminalSalida})`;
            serviciosProcesados.push({
              id: s.id + '-T' + (i + 1),
              tipo: 'VUELO',
              origen: t.origen,
              destino: t.destino,
              fechaIn: t.fecha,
              fechaOut: '',
              detalles: d
            });
          });
        } else if (s.vueloTipo === 'ConEscala') {
          if (!s.origen || !s.destino || !s.fechaIn) faltanDatos = true;
          let d = `Vuelo Con Escala | Ida: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          d += ` | Regreso: ${s.horaRegreso}`;
          if (s.terminalRegreso) d += ` (Term: ${s.terminalRegreso})`;
          if (s.escala) d += ` | Escala preferida: ${s.escala}`;
          serviciosProcesados.push({ ...s, detalles: d });
        }
      } else {
        if (!s.origen || !s.fechaIn) faltanDatos = true;
        serviciosProcesados.push({ ...s });
      }
    });

    if (faltanDatos) {
      setError('Faltan datos obligatorios en los servicios.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicios: serviciosProcesados,
          pasajeros,
          evento,
          notas,
          empresa: user?.empresa
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onSuccess();
      } else {
        setError(data.error || 'Error al crear la solicitud.');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" onClick={onClose}>
      <datalist id="dl-ciudades">
        {catalogos.ciudades.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="dl-origenes">
        {catalogos.origenes.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="dl-destinos">
        {catalogos.destinos.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="dl-pasajeros">
        {catalogos.pasajeros.map(p => <option key={p.nombre} value={p.nombre} />)}
      </datalist>
      <datalist id="dl-eventos">
        {catalogos.eventos.map(e => <option key={e} value={e} />)}
      </datalist>

      <div
        className="bg-white w-full max-w-3xl shadow-2xl flex flex-col h-[95vh] md:h-auto md:max-h-[95vh] rounded-t-[2rem] md:rounded-[2rem] overflow-hidden border-t-8 border-indipris"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden shrink-0"></div>

        <div className="px-6 pb-4 pt-3 md:p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Crear Ticket</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Completa los datos de la solicitud de viaje</p>
          </div>
          <button onClick={onClose}
            className="text-slate-300 hover:text-slate-600 font-bold text-2xl leading-none bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 bg-slate-50/30 no-scrollbar">

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
              <h3 className="text-[10px] font-black text-indipris uppercase tracking-[0.2em]">1. Servicios Requeridos</h3>
              <button onClick={addService}
                className="bg-pink-50 text-indipris px-3 py-1.5 rounded-full text-[9px] font-black hover:bg-pink-100 transition">
                + Añadir Servicio
              </button>
            </div>

            <div className="space-y-8">
              {servicios.map((s, sIdx) => (
                <div key={s.id} className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 relative">
                  <div className="absolute -top-3 left-4 md:left-6 bg-slate-800 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">
                    Servicio {sIdx + 1}
                  </div>
                  {servicios.length > 1 && (
                    <button onClick={() => removeService(sIdx)}
                      className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold shadow-lg flex items-center justify-center transition hover:scale-110">
                      x
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 mb-6 border-b border-slate-200 pb-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Servicio</label>
                      <select
                        value={s.tipo}
                        onChange={e => updateService(sIdx, 'tipo', e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-black text-indipris outline-none focus:border-indipris text-base"
                      >
                        {TIPOS_SERVICIO.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                      </select>
                    </div>

                    {s.tipo === 'VUELO' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trayecto</label>
                        <select
                          value={s.vueloTipo}
                          onChange={e => updateService(sIdx, 'vueloTipo', e.target.value)}
                          className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-black text-blue-600 outline-none focus:border-indipris text-base"
                        >
                          {TRAYECTOS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                    {s.tipo === 'VUELO' && s.vueloTipo !== 'Multidestino' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Origen</label>
                          <input type="text" list="dl-origenes" value={s.origen} onChange={e => updateService(sIdx, 'origen', e.target.value)} placeholder="Ej. Ciudad de México" className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Destino</label>
                          <input type="text" list="dl-destinos" value={s.destino} onChange={e => updateService(sIdx, 'destino', e.target.value)} placeholder="Ej. Cancún" className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.vueloTipo === 'Sencillo' ? 'Fecha' : 'Fecha Ida'}</label>
                          <input type="date" value={s.fechaIn} onChange={e => updateService(sIdx, 'fechaIn', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.vueloTipo === 'Sencillo' ? 'Horario' : 'Horario Ida'}</label>
                          <select value={s.horaIda} onChange={e => updateService(sIdx, 'horaIda', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-600">
                            {HORARIOS.map(h => <option key={h.val} value={h.val}>{h.label}</option>)}
                          </select>
                        </div>
                        {s.vueloTipo !== 'Sencillo' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase">Fecha Regreso</label>
                              <input type="date" value={s.fechaOut} onChange={e => updateService(sIdx, 'fechaOut', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase">Horario Regreso</label>
                              <select value={s.horaRegreso} onChange={e => updateService(sIdx, 'horaRegreso', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-600">
                                {HORARIOS.map(h => <option key={h.val} value={h.val}>{h.label}</option>)}
                              </select>
                            </div>
                          </>
                        )}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Terminal {s.vueloTipo !== 'Sencillo' ? '(Ida)' : ''}</label>
                          <input type="text" value={s.terminalSalida} onChange={e => updateService(sIdx, 'terminalSalida', e.target.value)} placeholder="Ej. T1, T2..." className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        {s.vueloTipo !== 'Sencillo' && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Terminal (Regreso)</label>
                            <input type="text" value={s.terminalRegreso} onChange={e => updateService(sIdx, 'terminalRegreso', e.target.value)} placeholder="Ej. T1, T2..." className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                          </div>
                        )}
                        {s.vueloTipo === 'ConEscala' && (
                          <div className="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <label className="text-[9px] font-black text-amber-700 uppercase">Escala / Conexión preferida (opcional)</label>
                            <input type="text" value={s.escala} onChange={e => updateService(sIdx, 'escala', e.target.value)} placeholder="Ej. Houston, Dallas, CDMX..." className="w-full border-b-2 border-amber-200 bg-transparent py-2 font-bold outline-none text-slate-700 focus:border-amber-500" />
                          </div>
                        )}
                      </>
                    ) : s.vueloTipo === 'Multidestino' ? (
                      <div className="col-span-full space-y-4">
                        {s.tramos.map((t, tIdx) => (
                          <div key={tIdx} className="p-4 border border-slate-200 rounded-xl relative bg-white grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                            <span className="absolute -top-2 left-4 bg-slate-200 text-slate-600 text-[8px] font-black px-2 py-1 rounded-full uppercase">Tramo {tIdx + 1}</span>
                            {s.tramos.length > 2 && (
                              <button onClick={() => removeTramo(sIdx, tIdx)} className="absolute top-2 right-2 text-red-500 font-bold text-xs bg-red-50 w-6 h-6 rounded-full flex justify-center items-center">x</button>
                            )}
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase">Origen</label>
                              <input type="text" list="dl-origenes" value={t.origen} onChange={e => updateTramo(sIdx, tIdx, 'origen', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-1 font-bold outline-none text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase">Destino</label>
                              <input type="text" list="dl-destinos" value={t.destino} onChange={e => updateTramo(sIdx, tIdx, 'destino', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-1 font-bold outline-none text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase">Fecha</label>
                              <input type="date" value={t.fecha} onChange={e => updateTramo(sIdx, tIdx, 'fecha', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-1 font-bold outline-none text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase">Horario</label>
                              <select value={t.hora} onChange={e => updateTramo(sIdx, tIdx, 'hora', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-1 font-bold outline-none text-xs">
                                {HORARIOS.map(h => <option key={h.val} value={h.val}>{h.label}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase">Terminal</label>
                              <input type="text" value={t.terminalSalida} onChange={e => updateTramo(sIdx, tIdx, 'terminalSalida', e.target.value)} placeholder="T1..." className="w-full border-b-2 border-slate-200 bg-transparent py-1 font-bold outline-none text-xs" />
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addTramo(sIdx)} className="text-[10px] font-black text-pink-600 bg-pink-50 px-4 py-2 rounded-full hover:bg-pink-100 transition shadow-sm w-full md:w-auto">+ AÑADIR OTRO TRAMO</button>
                      </div>
                    ) : (
                      <>
                        {/* HOTEL / BUS / EXTRA */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.tipo === 'HOTEL' ? 'Nombre Hotel (o Zona)' : 'Origen'}</label>
                          <input type="text" list={s.tipo === 'BUS' ? 'dl-origenes' : undefined} value={s.origen} onChange={e => updateService(sIdx, 'origen', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.tipo === 'HOTEL' ? 'Ciudad' : 'Destino'}</label>
                          <input type="text" list="dl-ciudades" value={s.destino} onChange={e => updateService(sIdx, 'destino', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.tipo === 'HOTEL' ? 'Check-In' : 'Fecha Ida'}</label>
                          <input type="date" value={s.fechaIn} onChange={e => updateService(sIdx, 'fechaIn', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">{s.tipo === 'HOTEL' ? 'Check-Out' : 'Fecha Regreso (opcional)'}</label>
                          <input type="date" value={s.fechaOut} onChange={e => updateService(sIdx, 'fechaOut', e.target.value)} className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold outline-none text-slate-700" />
                        </div>
                      </>
                    )}

                    <div className="col-span-full mt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Detalles Adicionales del Servicio</label>
                      <input
                        type="text"
                        value={s.detalles}
                        onChange={e => updateService(sIdx, 'detalles', e.target.value)}
                        placeholder="Requisitos específicos para este servicio..."
                        className="w-full border-b-2 border-slate-200 py-2 font-bold text-sm text-slate-700 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
              <h3 className="text-[10px] font-black text-indipris uppercase tracking-[0.2em]">2. Pasajeros / Huéspedes</h3>
              <button onClick={addPassenger}
                className="bg-pink-50 text-indipris px-3 py-1.5 rounded-full text-[9px] font-black hover:bg-pink-100 transition">
                + Añadir Pasajero
              </button>
            </div>
            <div className="space-y-4">
              {pasajeros.map((p, i) => (
                <div key={p.id} className="border-2 border-slate-100 rounded-2xl p-4 relative bg-slate-50">
                  <div className="absolute -top-3 left-4 md:left-6 bg-pink-600 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest">PASAJERO {i + 1}</div>
                  {pasajeros.length > 1 && (
                    <button onClick={() => removePassenger(i)}
                      className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold shadow-lg flex items-center justify-center transition hover:scale-110">x</button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                      <input
                        type="text"
                        list="dl-pasajeros"
                        value={p.nombre}
                        onChange={e => handlePaxNombre(i, e.target.value)}
                        placeholder="Ej. María Dolores Gómez Garduño"
                        className="w-full border-b-2 border-slate-300 bg-transparent py-2 outline-none font-black text-slate-800 text-base focus:border-indipris"
                      />
                      {catalogos.pasajeros.find(cp => cp.nombre?.toLowerCase() === p.nombre?.toLowerCase()) && (
                        <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Datos cargados del catálogo</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nacimiento</label>
                      <input type="date" value={p.nacimiento}
                        onChange={e => updatePassenger(i, 'nacimiento', e.target.value)}
                        className="w-full border-b-2 border-slate-300 bg-transparent py-2 outline-none font-black text-slate-800 text-base focus:border-indipris"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Preferencia Asiento</label>
                      <select value={p.asiento} onChange={e => updatePassenger(i, 'asiento', e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold text-slate-700 outline-none focus:border-indipris">
                        {ASIENTOS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Equipaje</label>
                      <select value={p.maletas} onChange={e => updatePassenger(i, 'maletas', e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-2 font-bold text-slate-700 outline-none focus:border-indipris">
                        {MALETAS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Link Identificación (Opcional)</label>
                    <input type="text" value={p.linkId}
                      onChange={e => updatePassenger(i, 'linkId', e.target.value)}
                      placeholder="Pega el link de Google Drive aquí..."
                      className="w-full border-b-2 border-slate-200 bg-transparent py-2 outline-none font-bold text-slate-700 text-xs focus:border-indipris"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-indipris uppercase tracking-[0.2em] mb-4">3. Evento</h3>
            <input
              type="text"
              list="dl-eventos"
              value={evento}
              onChange={e => setEvento(e.target.value)}
              placeholder="Ej. Congreso Anual 2025, Lanzamiento Q1..."
              className="w-full border-b-2 border-slate-200 py-3 font-bold text-sm text-slate-700 bg-transparent"
            />
          </section>

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-indipris uppercase tracking-[0.2em] mb-4">4. Notas Adicionales Generales</h3>
            <textarea
              value={notas} onChange={e => setNotas(e.target.value)}
              rows={3}
              placeholder="Instrucciones generales para el ticket..."
              className="w-full border-b-2 border-slate-200 p-3 font-bold text-sm text-slate-600 bg-slate-50 rounded-xl resize-none focus:border-indipris outline-none"
            />
          </section>
        </div>

        <div className="p-4 md:p-5 bg-white border-t border-slate-100 shrink-0">
          {error && <p className="text-red-500 text-xs font-bold text-center mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-indipris text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-200 hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Enviando...' : '✓ Enviar a Cotización'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Catálogo de ciudades (idéntico al de escritorio) ──────────────────────────
const CIUDADES = [
  // México
  'Ciudad de México (CDMX)','Guadalajara','Monterrey','Cancún','Tijuana','León','Puebla','Mérida',
  'San Luis Potosí','Querétaro','Chihuahua','Hermosillo','Acapulco','Veracruz','Culiacán',
  'Aguascalientes','Tampico','Oaxaca','Mazatlán','Puerto Vallarta','Los Cabos','La Paz','Durango',
  'Zacatecas','Morelia','Toluca','Colima','Tepic','Villahermosa','Tuxtla Gutiérrez','Chetumal',
  'Campeche','Manzanillo','Ixtapa / Zihuatanejo','Huatulco','Loreto','Saltillo','Torreón',
  'Ciudad Juárez','Matamoros','Nuevo Laredo','Reynosa','Ciudad Obregón','Los Mochis','Guaymas',
  'Bahías de Huatulco','Palenque','San Cristóbal de las Casas','Cozumel','Playa del Carmen',
  'Holbox','Tulum',
  // Estados Unidos
  'Nueva York (JFK)','Nueva York (EWR)','Los Ángeles','Chicago','Houston','Dallas','Miami',
  'Las Vegas','Orlando','San Francisco','Seattle','Boston','Washington D.C.','Atlanta','Denver',
  'Phoenix','San Diego','Minneapolis','Detroit','Newark','Philadelphia','Charlotte','Tampa',
  'Fort Lauderdale','Salt Lake City','Portland','Austin','San Antonio','Nashville','Honolulu','Anchorage'
];

const HORA_OPTIONS = [
  { value: 'Indiferente', label: 'Indiferente' },
  { value: 'Manana (00:00 - 11:59)', label: 'Mañana' },
  { value: 'Medio Dia (12:00 - 15:59)', label: 'Medio Día' },
  { value: 'Tarde (16:00 - 19:59)', label: 'Tarde' },
  { value: 'Noche (20:00 - 23:59)', label: 'Noche' },
];

const ASIENTO_OPTIONS = ['Indiferente', 'Ventana', 'Pasillo'];
const EQUIPAJE_OPTIONS = ['Solo Artículo Personal', '1 Maleta Mano (10kg)', '1 Documentada (25kg)'];
const CAMA_OPTIONS = ['Indiferente', '1 Cama King', '2 Camas Dobles'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(str: string) { return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

function newService() {
  return {
    id: 'SVC-' + Date.now() + Math.floor(Math.random() * 1000),
    tipo: 'VUELO' as 'VUELO' | 'HOTEL' | 'BUS',
    vueloTipo: 'Redondo' as 'Redondo' | 'Sencillo' | 'Multidestino' | 'ConEscala',
    origen: '', destino: '', fechaIn: '', fechaOut: '',
    horaIda: 'Indiferente', horaRegreso: 'Indiferente',
    terminalSalida: '', terminalRegreso: '', escala: '',
    tramos: [
      { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' },
      { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' },
    ],
  };
}

function newPassenger() {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    _nombre: '', _apellidos: '', nombre: '',
    nacimiento: '', viajeroFrecuente: '',
    asientoVuelo: 'Indiferente', equipaje: 'Solo Artículo Personal',
    camaHotel: 'Indiferente', linkID: '',
  };
}

// ── City Autocomplete Component ───────────────────────────────────────────────
function CityInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [query, setQuery] = useState(value);
  const [showList, setShowList] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = query.length >= 1
    ? CIUDADES.filter(c => norm(c).includes(norm(query))).slice(0, 6)
    : [];

  return (
    <div ref={ref} className="relative">
      <input
        type="text" value={query} placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 200)}
        className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500 transition-colors"
      />
      {showList && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
          {matches.map(c => (
            <button key={c} type="button"
              onMouseDown={() => { setQuery(c); onChange(c); setShowList(false); }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-pink-50 border-b border-slate-50 last:border-0"
            >{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Name Autocomplete Component ───────────────────────────────────────────────
function NameInput({ value, onChange, nombres, placeholder }: { value: string; onChange: (v: string) => void; nombres: string[]; placeholder: string }) {
  const [query, setQuery] = useState(value);
  const [showList, setShowList] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = query.length >= 2
    ? nombres.filter(n => norm(n).includes(norm(query))).slice(0, 5)
    : [];

  return (
    <div className="relative">
      <input
        type="text" value={query} placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 200)}
        className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl font-black text-sm outline-none focus:border-pink-500 transition-colors"
      />
      {showList && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
          {matches.map(n => (
            <button key={n} type="button"
              onMouseDown={() => { setQuery(n); onChange(n); setShowList(false); }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-pink-50 border-b border-slate-50 last:border-0"
            >{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MobileSolicitudes() {
  const router = useRouter();
  const [services, setServices] = useState([newService()]);
  const [passengers, setPassengers] = useState([newPassenger()]);
  const [evento, setEvento] = useState('');
  const [notas, setNotas] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Catálogos
  const [nombresCatalogo, setNombresCatalogo] = useState<string[]>([]);
  const [eventosCatalogo, setEventosCatalogo] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ id: string; nombre: string }[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('indipris_session_secure');
    if (!raw) { router.push('/m/login'); return; }
    const s = JSON.parse(raw);
    setSession(s);

    // Cargar catálogos
    fetch('/api/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getCatalogos', auth: { u: s.name, h: s.hash } })
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setNombresCatalogo((res.data.pasajeros || []).map((p: any) => p.nombre));
          setEventosCatalogo(res.data.eventos || []);
        }
      })
      .catch(() => {});

    fetch('/api/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getCompanies', auth: { u: s.name, h: s.hash } })
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setCompanies(res.data || []);
          // Pre-seleccionar empresa si solo tiene una
          if (s.empresa) {
            const ids = String(s.empresa).split(',').map((x: string) => x.trim());
            if (ids.length === 1) setEmpresaId(ids[0]);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  // ── Service helpers ─────────────────────────────────────────────────────────
  const updateService = useCallback((id: string, field: string, value: any) => {
    setServices(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if (field === 'tipo' && value !== 'VUELO') updated.vueloTipo = 'Redondo' as any;
      return updated;
    }));
  }, []);

  const updateTramo = useCallback((svcId: string, tramoIdx: number, field: string, value: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== svcId) return s;
      const tramos = [...s.tramos];
      tramos[tramoIdx] = { ...tramos[tramoIdx], [field]: value };
      return { ...s, tramos };
    }));
  }, []);

  const addTramo = useCallback((svcId: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== svcId) return s;
      return { ...s, tramos: [...s.tramos, { origen: '', destino: '', fecha: '', hora: 'Indiferente', terminalSalida: '' }] };
    }));
  }, []);

  const removeTramo = useCallback((svcId: string, idx: number) => {
    setServices(prev => prev.map(s => {
      if (s.id !== svcId || s.tramos.length <= 1) return s;
      return { ...s, tramos: s.tramos.filter((_, i) => i !== idx) };
    }));
  }, []);

  // ── Passenger helpers ───────────────────────────────────────────────────────
  const updatePassenger = useCallback((id: number, field: string, value: string) => {
    setPassengers(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (field === '_nombre' || field === '_apellidos') {
        updated.nombre = ((updated._nombre || '') + ' ' + (updated._apellidos || '')).trim();
      }
      return updated;
    }));
  }, []);

  const selectNombreCatalogo = useCallback((id: number, fullName: string) => {
    setPassengers(prev => prev.map(p => {
      if (p.id !== id) return p;
      const parts = fullName.trim().split(/\s+/);
      let _nombre = fullName, _apellidos = '';
      if (parts.length >= 3) {
        _nombre = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
        _apellidos = parts.slice(Math.ceil(parts.length / 2)).join(' ');
      } else if (parts.length === 2) {
        _nombre = parts[0];
        _apellidos = parts[1];
      }
      return { ...p, nombre: fullName.trim(), _nombre, _apellidos };
    }));
  }, []);

  // ── Computed ────────────────────────────────────────────────────────────────
  const hasVuelo = services.some(s => s.tipo === 'VUELO');
  const hasHotel = services.some(s => s.tipo === 'HOTEL');
  const userEmpresaIds = session?.empresa ? String(session.empresa).split(',').map((x: string) => x.trim()) : [];
  const showEmpresaSelector = userEmpresaIds.length > 1;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    // Procesar servicios (misma lógica que escritorio)
    const serviciosProcesados: any[] = [];
    let faltanDatos = false;

    services.forEach(s => {
      if (s.tipo === 'VUELO') {
        if (s.vueloTipo === 'Redondo') {
          if (!s.origen || !s.destino) faltanDatos = true;
          let d = `Vuelo Redondo | Ida: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          d += ` | Regreso: ${s.horaRegreso}`;
          if (s.terminalRegreso) d += ` (Term: ${s.terminalRegreso})`;
          serviciosProcesados.push({ ...s, detalles: d });
        } else if (s.vueloTipo === 'Sencillo') {
          if (!s.origen || !s.destino) faltanDatos = true;
          let d = `Vuelo Sencillo | Horario: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          serviciosProcesados.push({ ...s, fechaOut: '', detalles: d });
        } else if (s.vueloTipo === 'Multidestino') {
          s.tramos.forEach((t, i) => {
            if (!t.origen || !t.destino || !t.fecha) faltanDatos = true;
            let d = `Tramo ${i + 1} (Multidestino) | Horario: ${t.hora}`;
            if (t.terminalSalida) d += ` (Term: ${t.terminalSalida})`;
            serviciosProcesados.push({ id: s.id + '-T' + (i + 1), tipo: 'VUELO', origen: t.origen, destino: t.destino, fechaIn: t.fecha, fechaOut: '', detalles: d });
          });
        } else if (s.vueloTipo === 'ConEscala') {
          if (!s.origen || !s.destino) faltanDatos = true;
          let d = `Vuelo Con Escala | Ida: ${s.horaIda}`;
          if (s.terminalSalida) d += ` (Term: ${s.terminalSalida})`;
          d += ` | Regreso: ${s.horaRegreso}`;
          if (s.terminalRegreso) d += ` (Term: ${s.terminalRegreso})`;
          if (s.escala) d += ` | Escala preferida: ${s.escala}`;
          serviciosProcesados.push({ ...s, detalles: d });
        }
      } else {
        if (!s.origen || !s.destino) faltanDatos = true;
        serviciosProcesados.push({ ...s });
      }
    });

    if (!passengers[0]?.nombre) {
      setError('Agrega al menos un pasajero con nombre.');
      return;
    }
    if (faltanDatos) {
      setError('Faltan campos obligatorios (origen, destino o fechas).');
      return;
    }

    setLoading(true);

    const empresaIdFinal = showEmpresaSelector
      ? empresaId
      : (userEmpresaIds[0] || session?.empresa || '');

    const payload = {
      action: 'createRequest',
      auth: { u: session.name, h: session.hash },
      requester: {
        name: session.name,
        email: session.email,
        phone: session.phone,
        empresaId: empresaIdFinal,
        evento: evento.trim(),
        notes: notas,
      },
      empresa: empresaIdFinal,
      evento: evento.trim(),
      notas,
      servicios: serviciosProcesados,
      pasajeros: passengers.map(p => ({
        nombre: p.nombre,
        nacimiento: p.nacimiento,
        viajeroFrecuente: p.viajeroFrecuente,
        asiento: p.asientoVuelo,
        maletas: p.equipaje,
        linkId: p.linkID,
      })),
    };

    try {
      const res = await fetch('/api/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setSuccess(true);
      } else {
        setError(data.message || 'Error al crear la solicitud.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 gap-8">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl shadow-inner">✓</div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">¡Solicitud Enviada!</h2>
        <p className="text-slate-400 font-bold text-sm text-center">Tu solicitud ha sido creada exitosamente y el equipo Indipris fue notificado.</p>
        <button onClick={() => router.push('/m/dashboard')}
          className="w-full max-w-xs bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-transform"
        >Ir al Inicio</button>
      </div>
    );
  }

  // ── Main Form ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-6 pb-32">
      <header className="pb-4 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Nueva Solicitud</h1>
          <p className="text-slate-400 font-bold text-xs">Llena los datos de tu viaje</p>
        </div>
        <button onClick={() => router.push('/m/dashboard')}
          className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-2 rounded-xl"
        >← Volver</button>
      </header>

      {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center border border-red-200">{error}</div>}

      {/* ── Empresa Selector ──────────────────────────────────────────────── */}
      {showEmpresaSelector && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <label className="text-[9px] font-black text-pink-600 uppercase tracking-widest block mb-2">Solicitar a nombre de:</label>
          <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
          >
            <option value="">Selecciona empresa...</option>
            {userEmpresaIds.map(id => {
              const c = companies.find(c => c.id === id);
              return <option key={id} value={id}>{c ? c.nombre : id}</option>;
            })}
          </select>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. SERVICIOS                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
          <h2 className="text-[10px] font-black text-pink-600 uppercase tracking-widest">1. Servicios</h2>
          <button type="button" onClick={() => setServices([...services, newService()])}
            className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full text-[9px] font-black"
          >+ Servicio</button>
        </div>

        <div className="space-y-6">
          {services.map((s, sIdx) => (
            <div key={s.id} className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 relative">
              <span className="absolute -top-2.5 left-3 bg-slate-800 text-white px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest">SERVICIO {sIdx + 1}</span>
              {services.length > 1 && (
                <button type="button" onClick={() => setServices(services.filter(x => x.id !== s.id))}
                  className="absolute -top-2.5 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg flex items-center justify-center"
                >×</button>
              )}

              <div className="space-y-3 mt-3">
                {/* Tipo */}
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Tipo</label>
                  <select value={s.tipo} onChange={e => updateService(s.id, 'tipo', e.target.value)}
                    className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-pink-600 text-sm outline-none focus:border-pink-500"
                  >
                    <option value="VUELO">✈️ VUELO</option>
                    <option value="HOTEL">🏨 HOTEL</option>
                    <option value="BUS">🚌 AUTOBÚS</option>
                  </select>
                </div>

                {/* Vuelo Tipo */}
                {s.tipo === 'VUELO' && (
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Trayecto</label>
                    <select value={s.vueloTipo} onChange={e => updateService(s.id, 'vueloTipo', e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 text-sm outline-none focus:border-pink-500"
                    >
                      <option value="Redondo">🔁 Redondo</option>
                      <option value="Sencillo">➡️ Sencillo</option>
                      <option value="Multidestino">🔀 Multidestino</option>
                      <option value="ConEscala">✈️ Con Escala</option>
                    </select>
                  </div>
                )}

                {/* ── VUELO: Redondo / Sencillo / ConEscala ── */}
                {s.tipo === 'VUELO' && s.vueloTipo !== 'Multidestino' && (
                  <>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Origen</label>
                      <CityInput value={s.origen} onChange={v => updateService(s.id, 'origen', v)} placeholder="Ej. Ciudad de México" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Destino{s.vueloTipo === 'ConEscala' ? ' Final' : ''}</label>
                      <CityInput value={s.destino} onChange={v => updateService(s.id, 'destino', v)} placeholder="Ej. Cancún" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Fecha Ida</label>
                        <input type="date" value={s.fechaIn} onChange={e => updateService(s.id, 'fechaIn', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Horario Ida</label>
                        <select value={s.horaIda} onChange={e => updateService(s.id, 'horaIda', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                        >
                          {HORA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {(s.vueloTipo === 'Redondo' || s.vueloTipo === 'ConEscala') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Fecha Regreso</label>
                          <input type="date" value={s.fechaOut} onChange={e => updateService(s.id, 'fechaOut', e.target.value)}
                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Horario Regreso</label>
                          <select value={s.horaRegreso} onChange={e => updateService(s.id, 'horaRegreso', e.target.value)}
                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                          >
                            {HORA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Terminal Ida</label>
                        <input type="text" value={s.terminalSalida} onChange={e => updateService(s.id, 'terminalSalida', e.target.value)}
                          placeholder="T1, T2..."
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                      {(s.vueloTipo === 'Redondo' || s.vueloTipo === 'ConEscala') && (
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Terminal Regreso</label>
                          <input type="text" value={s.terminalRegreso} onChange={e => updateService(s.id, 'terminalRegreso', e.target.value)}
                            placeholder="T1, T2..."
                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                        </div>
                      )}
                    </div>
                    {s.vueloTipo === 'ConEscala' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <label className="text-[8px] font-black text-amber-700 uppercase mb-1 block">Escala / Conexión Preferida</label>
                        <input type="text" value={s.escala || ''} onChange={e => updateService(s.id, 'escala', e.target.value)}
                          placeholder="Ej. Houston, Dallas, CDMX..."
                          className="w-full border-b-2 border-amber-200 bg-transparent py-2 font-bold text-sm outline-none focus:border-amber-500" />
                        <p className="text-[8px] text-amber-600 font-bold mt-1">Indica si tienes preferencia de ciudad de conexión.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── VUELO: Multidestino ── */}
                {s.tipo === 'VUELO' && s.vueloTipo === 'Multidestino' && (
                  <div className="space-y-4">
                    {s.tramos.map((t, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 relative">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Tramo {i + 1}</span>
                        {s.tramos.length > 1 && (
                          <button type="button" onClick={() => removeTramo(s.id, i)}
                            className="absolute top-2 right-2 text-red-500 text-xs font-bold bg-red-50 w-5 h-5 rounded-full flex items-center justify-center"
                          >×</button>
                        )}
                        <div className="space-y-2 mt-2">
                          <CityInput value={t.origen} onChange={v => updateTramo(s.id, i, 'origen', v)} placeholder="Origen" />
                          <CityInput value={t.destino} onChange={v => updateTramo(s.id, i, 'destino', v)} placeholder="Destino" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={t.fecha} onChange={e => updateTramo(s.id, i, 'fecha', e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                            <select value={t.hora} onChange={e => updateTramo(s.id, i, 'hora', e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                            >
                              {HORA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addTramo(s.id)}
                      className="w-full text-[10px] font-black text-pink-600 bg-pink-50 px-4 py-2 rounded-full"
                    >+ Añadir Tramo</button>
                  </div>
                )}

                {/* ── HOTEL ── */}
                {s.tipo === 'HOTEL' && (
                  <>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Nombre Hotel (o Zona)</label>
                      <input type="text" value={s.origen} onChange={e => updateService(s.id, 'origen', e.target.value)}
                        placeholder="Ej. Hilton Centro..."
                        className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Ciudad</label>
                      <CityInput value={s.destino} onChange={v => updateService(s.id, 'destino', v)} placeholder="Ej. Cancún" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Check-In</label>
                        <input type="date" value={s.fechaIn} onChange={e => updateService(s.id, 'fechaIn', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Check-Out</label>
                        <input type="date" value={s.fechaOut} onChange={e => updateService(s.id, 'fechaOut', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                    </div>
                  </>
                )}

                {/* ── BUS ── */}
                {s.tipo === 'BUS' && (
                  <>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Origen</label>
                      <CityInput value={s.origen} onChange={v => updateService(s.id, 'origen', v)} placeholder="Ej. Ciudad de México" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Destino</label>
                      <CityInput value={s.destino} onChange={v => updateService(s.id, 'destino', v)} placeholder="Ej. Guadalajara" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Fecha Salida</label>
                        <input type="date" value={s.fechaIn} onChange={e => updateService(s.id, 'fechaIn', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Regreso (Opcional)</label>
                        <input type="date" value={s.fechaOut} onChange={e => updateService(s.id, 'fechaOut', e.target.value)}
                          className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. PASAJEROS                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
          <h2 className="text-[10px] font-black text-pink-600 uppercase tracking-widest">2. Pasajeros</h2>
        </div>

        <div className="space-y-6">
          {passengers.map((p, pIdx) => (
            <div key={p.id} className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 relative">
              <span className="absolute -top-2.5 left-3 bg-pink-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest">PASAJERO {pIdx + 1}</span>
              {passengers.length > 1 && (
                <button type="button" onClick={() => setPassengers(passengers.filter(x => x.id !== p.id))}
                  className="absolute -top-2.5 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg flex items-center justify-center"
                >×</button>
              )}

              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Nombre(s)</label>
                  <NameInput value={p._nombre} onChange={v => {
                    // Check if it's a full name selection from catalog
                    const isFullMatch = nombresCatalogo.some(n => norm(n) === norm(v));
                    if (isFullMatch) {
                      selectNombreCatalogo(p.id, v);
                    } else {
                      updatePassenger(p.id, '_nombre', v);
                    }
                  }} nombres={nombresCatalogo} placeholder="Ej. María Dolores" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Apellidos</label>
                  <NameInput value={p._apellidos} onChange={v => {
                    const isFullMatch = nombresCatalogo.some(n => norm(n) === norm(v));
                    if (isFullMatch) {
                      selectNombreCatalogo(p.id, v);
                    } else {
                      updatePassenger(p.id, '_apellidos', v);
                    }
                  }} nombres={nombresCatalogo} placeholder="Ej. Gómez Garduño" />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Fecha Nacimiento</label>
                  <input type="date" value={p.nacimiento} max={new Date().toISOString().split('T')[0]}
                    onChange={e => updatePassenger(p.id, 'nacimiento', e.target.value)}
                    className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                </div>

                {hasVuelo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Asiento</label>
                      <select value={p.asientoVuelo} onChange={e => updatePassenger(p.id, 'asientoVuelo', e.target.value)}
                        className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                      >
                        {ASIENTO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Equipaje</label>
                      <select value={p.equipaje} onChange={e => updatePassenger(p.id, 'equipaje', e.target.value)}
                        className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                      >
                        {EQUIPAJE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {hasHotel && (
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Cama Hotel</label>
                    <select value={p.camaHotel} onChange={e => updatePassenger(p.id, 'camaHotel', e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500"
                    >
                      {CAMA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Viajero Frecuente</label>
                  <input type="text" value={p.viajeroFrecuente} onChange={e => updatePassenger(p.id, 'viajeroFrecuente', e.target.value)}
                    placeholder="Ej. AM-12345678"
                    className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Identificación / Pasaporte (link)</label>
                  <input type="text" value={p.linkID} onChange={e => updatePassenger(p.id, 'linkID', e.target.value)}
                    placeholder="Pega el link aquí..."
                    className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setPassengers([...passengers, newPassenger()])}
          className="mt-4 w-full bg-pink-50 text-pink-600 px-4 py-3 rounded-xl text-[10px] font-black border-2 border-dashed border-pink-200 active:scale-95 transition-transform"
        >+ Añadir Pasajero</button>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. EVENTO                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-3">3. Evento</h2>
        <NameInput value={evento} onChange={setEvento} nombres={eventosCatalogo} placeholder="Ej. Congreso Anual 2025..." />
        <p className="text-[8px] text-slate-400 font-bold mt-1">Si es nuevo, se guardará automáticamente.</p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. NOTAS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-3">4. Notas Adicionales</h2>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
          placeholder="Ej: Requiero factura urgente..."
          className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-pink-500 resize-none"
        />
      </section>

      {/* ── Submit Button ────────────────────────────────────────────────── */}
      <button type="button" onClick={handleSubmit} disabled={loading}
        className="w-full bg-pink-500 text-white py-5 rounded-2xl font-black text-sm shadow-lg shadow-pink-200 active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {loading ? (
          <><span className="animate-spin text-lg">⏳</span> Enviando...</>
        ) : (
          'Enviar a Cotización'
        )}
      </button>
    </div>
  );
}

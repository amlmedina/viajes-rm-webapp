'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileDashboard() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Detalle del ticket seleccionado en el Bottom Sheet
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal para Cargar Cotizaciones
  const [showCargarModal, setShowCargarModal] = useState(false);
  const [opcionesForm, setOpcionesForm] = useState<any[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  // Modal para Marcar Comprado y Subir PNR / Orbix
  const [showComprarModal, setShowComprarModal] = useState(false);
  const [pnrForm, setPnrForm] = useState<any[]>([]);
  const [comprobanteUrl, setComprobanteUrl] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadDashboard = useCallback(async (userAuth: any) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getDashboard', auth: { u: userAuth.name, h: userAuth.hash } })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      } else {
        router.push('/m/login');
      }
    } catch {
      router.push('/m/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const authRaw = localStorage.getItem('indipris_session_secure');
    if (!authRaw) {
      router.push('/m/login');
      return;
    }
    const parsedAuth = JSON.parse(authRaw);
    setAuth(parsedAuth);
    loadDashboard(parsedAuth);
  }, [router, loadDashboard]);

  // Cargar detalles completos del ticket cuando se selecciona
  const handleSelectTicket = async (ticket: any[]) => {
    setSelectedTicket(ticket);
    setTicketDetails(null);
    setLoadingDetails(true);
    setSelectedOptionIds([]);

    if (!auth) return;

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getTicketDetails',
          auth: { u: auth.name, h: auth.hash },
          idTicket: ticket[0]
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setTicketDetails(json.data);
      }
    } catch (err) {
      console.error('Error cargando detalles del ticket:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Inicializar formulario de carga de opciones con datos del itinerario si existen
  const handleOpenCargarModal = () => {
    const paxCount = ticketDetails?.pasajeros?.length || 1;
    const firstSvc = ticketDetails?.servicios?.[0];

    const defaultOpt = {
      id: Date.now(),
      aerolinea: '',
      origen: firstSvc?.[2] ? String(firstSvc[2]).toUpperCase() : '',
      destino: firstSvc?.[3] ? String(firstSvc[3]).toUpperCase() : '',
      fecha: firstSvc?.[4] ? String(firstSvc[4]).slice(0, 10) : '',
      salida: '',
      llegada: '',
      vuelo: '',
      pnr: '',
      costo: '',
      fee: paxCount * 300,
      aplicaIva: true,
      comentario: '',
      idServicio: firstSvc?.[7] || ''
    };

    setOpcionesForm([defaultOpt]);
    setShowCargarModal(true);
  };

  const addOptionField = () => {
    const paxCount = ticketDetails?.pasajeros?.length || 1;
    const firstSvc = ticketDetails?.servicios?.[0];
    setOpcionesForm(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        aerolinea: '',
        origen: firstSvc?.[2] ? String(firstSvc[2]).toUpperCase() : '',
        destino: firstSvc?.[3] ? String(firstSvc[3]).toUpperCase() : '',
        fecha: firstSvc?.[4] ? String(firstSvc[4]).slice(0, 10) : '',
        salida: '',
        llegada: '',
        vuelo: '',
        pnr: '',
        costo: '',
        fee: paxCount * 300,
        aplicaIva: true,
        comentario: '',
        idServicio: firstSvc?.[7] || ''
      }
    ]);
  };

  const removeOptionField = (idx: number) => {
    setOpcionesForm(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOptionField = (idx: number, field: string, val: any) => {
    setOpcionesForm(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  };

  // Guardar opciones cargadas (Cotización)
  const handleSaveOptions = async () => {
    if (opcionesForm.some(o => !o.costo || !o.aerolinea.trim())) {
      showToast('Costo y Aerolínea son obligatorios en todas las opciones.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = opcionesForm.map(o => {
        const sub = (Number(o.costo) || 0) + (Number(o.fee) || 0);
        const total = o.aplicaIva ? sub * 1.16 : sub;

        const htmlDesc = `
          <div class="space-y-1">
            <p><b>Aerolinea:</b> ${o.aerolinea.trim()}</p>
            <p><b>Ruta:</b> ${o.origen.trim().toUpperCase()} -> ${o.destino.trim().toUpperCase()}</p>
            <p><b>Fecha:</b> ${o.fecha} | <b>Horario:</b> ${o.salida || 'TBA'} - ${o.llegada || 'TBA'}</p>
            <p><b>Vuelo:</b> ${(o.vuelo || 'Pendiente').toUpperCase()} | <b>PNR:</b> <span class="font-mono text-pink-600 font-black">${(o.pnr || 'Pendiente').toUpperCase()}</span></p>
            ${o.comentario ? `<p class="mt-2 text-[10px] text-slate-500 italic border-t border-slate-100 pt-2">${o.comentario}</p>` : ''}
          </div>
        `.trim();

        return {
          desc: htmlDesc,
          costo: Number(o.costo) || 0,
          fee: Number(o.fee) || 0,
          total: total,
          idServicio: o.idServicio || '',
          img: '',
          costoProveedor: 0
        };
      });

      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAllOptions',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0],
          opciones: payload
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        showToast('¡Cotización guardada exitosamente!');
        setShowCargarModal(false);
        // Refrescar ticket y dashboard
        await handleSelectTicket(selectedTicket);
        await loadDashboard(auth);
      } else {
        showToast(json.message || 'Error al guardar cotización.', 'error');
      }
    } catch {
      showToast('Error de conexión al guardar.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Autorizar opciones
  const handleAuthorize = async () => {
    if (selectedOptionIds.length === 0) {
      showToast('Por favor selecciona al menos una opción para autorizar.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authorizeOptions',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0],
          optionIds: selectedOptionIds
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        showToast('¡Opciones autorizadas correctamente!');
        await handleSelectTicket(selectedTicket);
        await loadDashboard(auth);
      } else {
        showToast(json.message || 'Error al autorizar.', 'error');
      }
    } catch {
      showToast('Error de conexión.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Rechazar opciones
  const handleReject = async () => {
    const motivo = prompt('Ingresa el motivo del rechazo (opcional):') || 'Opciones no convenientes';
    setActionLoading(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rejectOptions',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0],
          motivo
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        showToast('Opciones rechazadas. Se notificó al ejecutivo.');
        await handleSelectTicket(selectedTicket);
        await loadDashboard(auth);
      } else {
        showToast(json.message || 'Error al rechazar.', 'error');
      }
    } catch {
      showToast('Error de conexión.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Helpers para parsear y actualizar PNR / Vuelo en descripción ───────────
  const extractRuta = (desc: string) => {
    const m = desc.match(/<b>Ruta:<\/b>\s*([^<]+)/i);
    if (m) return m[1].trim();
    const mHotel = desc.match(/<b>Hotel:<\/b>\s*([^<]+)/i);
    if (mHotel) return mHotel[1].trim();
    return desc.replace(/<[^>]+>/g, ' ').slice(0, 50).trim();
  };

  const extractVuelo = (desc: string) => {
    const m = desc.match(/<b>Vuelo:<\/b>\s*([^|<]+)/i);
    const v = m ? m[1].trim() : '';
    return (v.toUpperCase() === 'PENDIENTE' || v === '') ? '' : v;
  };

  const extractPNR = (desc: string) => {
    const m = desc.match(/<b>PNR:<\/b>\s*(?:<[^>]+>)*\s*([^<]+)/i);
    if (m) {
      const val = m[1].trim();
      if (val.toUpperCase() !== 'PENDIENTE' && val !== '') return val;
    }
    const m2 = desc.match(/<span[^>]*font-mono[^>]*>([^<]*)<\/span>/i);
    if (m2) {
      const val = m2[1].trim();
      if (val.toUpperCase() !== 'PENDIENTE' && val !== '') return val;
    }
    return '';
  };

  const updateDescWithFlightAndPNR = (origDesc: string, vuelo: string, pnr: string) => {
    let nuevaDesc = origDesc;
    const fVuelo = vuelo?.trim() ? vuelo.trim().toUpperCase() : 'Pendiente';
    const fPnr = pnr?.trim() ? pnr.trim().toUpperCase() : 'PENDIENTE';

    if (/<b>Vuelo:<\/b>/i.test(nuevaDesc)) {
      nuevaDesc = nuevaDesc.replace(/(<b>Vuelo:<\/b>\s*)([^|<]+)/i, (_, pre) => `${pre}${fVuelo} `);
    } else {
      nuevaDesc += `<p><b>Vuelo:</b> ${fVuelo}</p>`;
    }

    if (/<span[^>]*font-mono[^>]*>/i.test(nuevaDesc)) {
      nuevaDesc = nuevaDesc.replace(
        /(<span[^>]*font-mono[^>]*>)([^<]*)(<\/span>)/i,
        (_, open, _old, close) => `${open}${fPnr}${close}`
      );
    } else if (/<b>PNR:<\/b>/i.test(nuevaDesc)) {
      nuevaDesc = nuevaDesc.replace(
        /(<b>PNR:<\/b>\s*)([^<]+)/i,
        (_, pre) => `${pre}<span class="font-mono text-pink-600 font-black">${fPnr}</span>`
      );
    } else {
      nuevaDesc += `<p><b>PNR:</b> <span class="font-mono text-pink-600 font-black">${fPnr}</span></p>`;
    }

    return nuevaDesc;
  };

  const handleOpenComprarModal = () => {
    const opciones = ticketDetails?.opciones || [];
    let targetOpts = opciones.filter((o: any) => o[6] === 'Autorizada');
    if (targetOpts.length === 0) {
      targetOpts = opciones.filter((o: any) => o[6] === 'Comprado' || (o[6] !== 'Eliminado' && o[6] !== 'Rechazada'));
    }

    const items = targetOpts.map((o: any) => {
      const desc = String(o[2] || '');
      return {
        idOpcion: o[1],
        origDesc: desc,
        ruta: extractRuta(desc),
        vuelo: extractVuelo(desc),
        pnr: extractPNR(desc),
        costo: o[3],
        total: o[5],
        estado: o[6]
      };
    });

    setPnrForm(items);
    setComprobanteUrl('');
    setShowComprarModal(true);
  };

  const updatePnrFormField = (idx: number, field: 'vuelo' | 'pnr', val: string) => {
    setPnrForm(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleConfirmarCompraYOrbix = async () => {
    if (!auth || !selectedTicket) return;
    setActionLoading(true);
    try {
      // 1. Guardar PNR y número de vuelo en descripción de opciones
      const ajustes = pnrForm.map(item => ({
        idOpcion: item.idOpcion,
        nuevaDesc: updateDescWithFlightAndPNR(item.origDesc, item.vuelo, item.pnr)
      }));

      if (ajustes.length > 0) {
        await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updatePNR',
            auth: { u: auth.name, h: auth.hash },
            idTicket: selectedTicket[0],
            ajustes
          })
        });
      }

      // 2. Marcar como Comprado
      const optionIds = pnrForm.map(i => i.idOpcion);
      const purchaseRes = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markPurchased',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0],
          comprobanteUrl: comprobanteUrl.trim(),
          optionIds
        })
      });
      const purchaseJson = await purchaseRes.json();
      if (purchaseJson.status !== 'success') {
        showToast(purchaseJson.message || 'Error al marcar como comprado.', 'error');
        setActionLoading(false);
        return;
      }

      // 3. Enviar a Orbix
      const orbixRes = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exportarALegacy',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0]
        })
      });
      const orbixJson = await orbixRes.json();

      setShowComprarModal(false);
      if (orbixJson.status === 'success') {
        showToast('✓ ¡Compra confirmada y exportada a Orbix con éxito!');
      } else {
        showToast(`✓ Comprado. Aviso Orbix: ${orbixJson.message || 'Error al exportar'}`, 'error');
      }

      await handleSelectTicket(selectedTicket);
      await loadDashboard(auth);
    } catch {
      showToast('Error de conexión al procesar compra.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectExportarOrbix = async () => {
    if (!auth || !selectedTicket) return;
    if (!confirm(`¿Deseas enviar/sincronizar el ticket ${selectedTicket[0]} con Orbix?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exportarALegacy',
          auth: { u: auth.name, h: auth.hash },
          idTicket: selectedTicket[0]
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        showToast('🚀 ¡Datos enviados a Orbix exitosamente!');
      } else {
        showToast(json.message || 'Error al exportar a Orbix.', 'error');
      }
    } catch {
      showToast('Error de conexión con Orbix.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full pt-32"><div className="animate-spin text-pink-500 text-4xl">❖</div></div>;
  }

  const solicitudes = data?.solicitudes || [];
  const canManageOptions = auth?.role === 'indipris' || auth?.role === 'super' || auth?.role === 'admin';
  const canAuthorizeOptions = auth?.role === 'admin' || auth?.role === 'super';

  return (
    <div className="p-4 space-y-6 relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[999] p-3 rounded-2xl shadow-xl text-xs font-bold text-center transition-all ${toastMsg.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toastMsg.text}
        </div>
      )}

      <header className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inicio</h1>
          <p className="text-slate-400 font-bold text-xs">Mis solicitudes recientes</p>
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center font-black text-slate-500 shadow-inner">
          {auth?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </header>

      <div className="flex flex-col gap-4 pb-20">
        {solicitudes.slice().reverse().slice(0, 15).map((sol: any, idx: number) => (
          <TicketCard key={idx} ticket={sol} onClick={() => handleSelectTicket(sol)} />
        ))}
        {solicitudes.length === 0 && (
          <p className="text-center text-slate-400 font-bold py-10">No hay viajes recientes.</p>
        )}
      </div>

      {/* Bottom Sheet Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 z-[60] transition-opacity duration-300 ${selectedTicket ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => { setSelectedTicket(null); setTicketDetails(null); }}
      >
        {/* Bottom Sheet Body */}
        <div 
          className={`absolute bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] shadow-2xl transition-transform duration-300 flex flex-col max-h-[88vh] ${selectedTicket ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grabber */}
          <div className="pt-3 pb-2 shrink-0">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
          </div>

          {/* Scrollable Content */}
          <div className="px-5 pb-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {selectedTicket && (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-pink-600 font-mono">{selectedTicket[0]}</span>
                    <h2 className="text-xl font-black text-slate-800 mt-0.5">{selectedTicket[3]}</h2>
                    <p className="text-xs font-bold text-slate-400">Solicitado por {selectedTicket[2]}</p>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
                    {selectedTicket[4]}
                  </span>
                </div>

                {/* Resumen General */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha Creado</span>
                    <span className="text-slate-800">{new Date(selectedTicket[1]).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pasajeros</span>
                    <span className="text-slate-800 text-right">{data?.pasajerosResumen?.[selectedTicket[0]]?.join(', ') || 'Sin pasajeros'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total</span>
                    <span className="text-slate-800 font-black text-sm">${Number(selectedTicket[6] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                    <div className="animate-spin text-pink-500 text-2xl">❖</div>
                    Cargando opciones e itinerario...
                  </div>
                ) : (
                  <>
                    {/* Itinerario / Servicios */}
                    {ticketDetails?.servicios?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Itinerario Solicitado</h3>
                        <div className="space-y-2">
                          {ticketDetails.servicios.map((s: any, idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-black text-pink-600">{s[1]}</span>
                                <span className="text-[10px] font-bold text-slate-400">{s[4] ? new Date(s[4]).toLocaleDateString('es-MX') : ''}</span>
                              </div>
                              <p className="font-black text-slate-700">{s[2]} → {s[3]}</p>
                              {s[6] && <p className="text-[10px] text-slate-400 mt-1">{s[6]}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cotizaciones / Opciones */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cotizaciones ({ticketDetails?.opciones?.length || 0})</h3>
                        {canManageOptions && (
                          <button 
                            onClick={handleOpenCargarModal}
                            className="text-[10px] font-black text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full uppercase tracking-wider hover:bg-pink-100 transition"
                          >
                            + Cargar Opciones
                          </button>
                        )}
                      </div>

                      {ticketDetails?.opciones && ticketDetails.opciones.length > 0 ? (
                        <div className="space-y-3">
                          {ticketDetails.opciones.map((o: any, idx: number) => {
                            const isSelectable = selectedTicket[4] === 'Cotizado' && canAuthorizeOptions;
                            const isSelected = selectedOptionIds.includes(String(o[1]));
                            const isAuthorized = o[6] === 'Autorizada' || o[6] === 'Comprado';
                            const isRejected = o[6] === 'Rechazada';

                            let cardClass = 'border-slate-200 bg-white';
                            if (isAuthorized) cardClass = 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-300';
                            else if (isRejected) cardClass = 'border-red-200 bg-red-50/30 opacity-50';
                            else if (isSelected) cardClass = 'border-pink-500 bg-pink-50/40 ring-2 ring-pink-400';

                            return (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  if (!isSelectable) return;
                                  setSelectedOptionIds(prev => 
                                    prev.includes(String(o[1])) ? prev.filter(id => id !== String(o[1])) : [...prev, String(o[1])]
                                  );
                                }}
                                className={`p-4 rounded-2xl border transition-all relative ${cardClass} ${isSelectable ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black bg-slate-800 text-white px-2 py-0.5 rounded-full uppercase">
                                      Opción {idx + 1}
                                    </span>
                                    {isSelectable && (
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {isSelected ? '✓ Seleccionada' : 'Tocar para elegir'}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${isAuthorized ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {o[6] || 'Propuesta'}
                                  </span>
                                </div>

                                <div 
                                  className="text-xs text-slate-700 font-bold space-y-1 mb-3"
                                  dangerouslySetInnerHTML={{ __html: o[2] || 'Sin descripción' }}
                                />

                                <div className="flex justify-between items-end border-t border-slate-100 pt-2 text-[11px] font-bold">
                                  <span className="text-slate-400">Base: ${Number(o[3] || 0).toLocaleString('es-MX')} + Fee: ${Number(o[4] || 0).toLocaleString('es-MX')}</span>
                                  <span className="text-base font-black text-slate-900">${Number(o[5] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                          <p className="text-xs font-bold text-slate-400">Aún no hay cotizaciones cargadas para este viaje.</p>
                          {canManageOptions && (
                            <button
                              onClick={handleOpenCargarModal}
                              className="mt-3 bg-pink-600 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition"
                            >
                              + Cargar Primera Cotización
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          {selectedTicket && (
            <div className="px-5 pt-3 pb-6 border-t border-slate-100 bg-white shrink-0 space-y-2">
              {selectedTicket[4] === 'Cotizado' && canAuthorizeOptions ? (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="bg-white border-2 border-red-500 text-red-600 font-black p-3.5 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button 
                    disabled={actionLoading || selectedOptionIds.length === 0}
                    onClick={handleAuthorize}
                    className="bg-emerald-500 text-white font-black p-3.5 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-transform uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {actionLoading ? 'Guardando...' : `Aprobar (${selectedOptionIds.length})`}
                  </button>
                </div>
              ) : canManageOptions ? (
                <div className="space-y-2">
                  {/* Botón de compra / PNR si está autorizado o tiene opciones aprobadas */}
                  {(selectedTicket[4] === 'Autorizado' || ticketDetails?.opciones?.some((o: any) => o[6] === 'Autorizada')) && (
                    <button 
                      onClick={handleOpenComprarModal}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-3.5 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                      <span>✓ Marcar Comprado y Subir PNR</span>
                    </button>
                  )}

                  {/* Acciones si el ticket ya está en estado Comprado */}
                  {selectedTicket[4] === 'Comprado' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={handleOpenComprarModal}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black p-3 rounded-2xl shadow-md active:scale-95 transition-transform uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <span>✏️ PNR / Compra</span>
                      </button>
                      <button 
                        onClick={handleDirectExportarOrbix}
                        disabled={actionLoading}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black p-3 rounded-2xl shadow-md active:scale-95 transition-transform uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <span>🚀 Enviar a Orbix</span>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={handleOpenCargarModal}
                      className="flex-1 bg-pink-600 text-white font-black p-3.5 rounded-2xl shadow-lg shadow-pink-200 active:scale-95 transition-transform uppercase tracking-widest text-xs"
                    >
                      {ticketDetails?.opciones?.length > 0 ? 'Modificar Cotizaciones' : '+ Cargar Opciones de Viaje'}
                    </button>
                    <button 
                      onClick={() => router.push(`/dashboard/ticket/${selectedTicket[0]}`)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-3.5 py-3.5 rounded-2xl active:scale-95 transition-transform text-[11px] uppercase tracking-wider"
                      title="Ver Detalles Completos"
                    >
                      Detalles →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push(`/dashboard/ticket/${selectedTicket[0]}`)}
                    className="flex-1 bg-slate-900 text-white font-black p-3.5 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs"
                  >
                    Ver Detalles Completos →
                  </button>
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="bg-slate-100 text-slate-500 font-black px-4 py-3.5 rounded-2xl active:scale-95 transition-transform text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL CARGAR COTIZACIONES EN MÓVIL ────────────────────────── */}
      {showCargarModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-end justify-center backdrop-blur-sm" onClick={() => setShowCargarModal(false)}>
          <div 
            className="bg-white w-full max-w-xl rounded-t-[2.5rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800">Cargar Cotización</h3>
                <p className="text-[10px] font-bold text-slate-400">Ticket {selectedTicket?.[0]}</p>
              </div>
              <button onClick={() => setShowCargarModal(false)} className="text-slate-400 font-bold text-xl px-2">✕</button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
              {opcionesForm.map((opt, idx) => (
                <div key={opt.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="bg-slate-800 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Opción {idx + 1}
                    </span>
                    {opcionesForm.length > 1 && (
                      <button onClick={() => removeOptionField(idx)} className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Aerolínea / Proveedor *</label>
                    <input 
                      type="text" 
                      value={opt.aerolinea}
                      onChange={e => updateOptionField(idx, 'aerolinea', e.target.value)}
                      placeholder="Ej. Aeroméxico, Volaris, Viva"
                      className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Origen</label>
                      <input 
                        type="text" 
                        value={opt.origen}
                        onChange={e => updateOptionField(idx, 'origen', e.target.value.toUpperCase())}
                        placeholder="MEX"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-pink-500 uppercase text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Destino</label>
                      <input 
                        type="text" 
                        value={opt.destino}
                        onChange={e => updateOptionField(idx, 'destino', e.target.value.toUpperCase())}
                        placeholder="CUN"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-pink-500 uppercase text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fecha</label>
                      <input 
                        type="date" 
                        value={opt.fecha}
                        onChange={e => updateOptionField(idx, 'fecha', e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-bold text-xs outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">No. Vuelo / PNR</label>
                      <input 
                        type="text" 
                        value={opt.pnr}
                        onChange={e => updateOptionField(idx, 'pnr', e.target.value.toUpperCase())}
                        placeholder="VB123 / X7B9M2"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-bold text-xs outline-none focus:border-pink-500 uppercase text-pink-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hora Salida</label>
                      <input 
                        type="time" 
                        value={opt.salida}
                        onChange={e => updateOptionField(idx, 'salida', e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-bold text-xs outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hora Llegada</label>
                      <input 
                        type="time" 
                        value={opt.llegada}
                        onChange={e => updateOptionField(idx, 'llegada', e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-bold text-xs outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Costo Base *</label>
                      <input 
                        type="number" 
                        value={opt.costo}
                        onChange={e => updateOptionField(idx, 'costo', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-black text-xs outline-none focus:border-pink-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fee Total</label>
                      <input 
                        type="number" 
                        value={opt.fee}
                        onChange={e => updateOptionField(idx, 'fee', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-2 rounded-xl font-black text-xs outline-none focus:border-pink-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`iva-${opt.id}`}
                      checked={opt.aplicaIva}
                      onChange={e => updateOptionField(idx, 'aplicaIva', e.target.checked)}
                      className="w-4 h-4 accent-pink-600 rounded"
                    />
                    <label htmlFor={`iva-${opt.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                      Aplicar 16% IVA al total
                    </label>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Comentario para el cliente</label>
                    <textarea 
                      rows={2}
                      value={opt.comentario}
                      onChange={e => updateOptionField(idx, 'comentario', e.target.value)}
                      placeholder="Incluye equipaje de mano, selección de asiento..."
                      className="w-full bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-pink-500 resize-none text-slate-600"
                    />
                  </div>

                  {/* Total Preview */}
                  <div className="bg-slate-50 p-2.5 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase text-[9px]">Total Venta:</span>
                    <span className="font-black text-pink-600 text-sm">
                      ${(((Number(opt.costo) || 0) + (Number(opt.fee) || 0)) * (opt.aplicaIva ? 1.16 : 1)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}

              <button 
                onClick={addOptionField}
                className="w-full py-3.5 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-wider hover:border-pink-500 hover:text-pink-600 transition"
              >
                + Añadir Otra Opción
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button 
                onClick={() => setShowCargarModal(false)}
                className="w-1/3 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                disabled={actionLoading}
                onClick={handleSaveOptions}
                className="flex-1 py-3 bg-pink-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-200 active:scale-95 transition disabled:opacity-50"
              >
                {actionLoading ? 'Guardando...' : 'Enviar Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MARCAR COMPRADO Y SUBIR PNR / ENVIAR A ORBIX ───────────────── */}
      {showComprarModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-end justify-center backdrop-blur-sm" onClick={() => setShowComprarModal(false)}>
          <div 
            className="bg-white w-full max-w-xl rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800">Confirmar Compra y PNR</h3>
                <p className="text-[10px] font-bold text-slate-400">Ticket {selectedTicket?.[0]} • Envío a Orbix</p>
              </div>
              <button onClick={() => setShowComprarModal(false)} className="text-slate-400 font-bold text-xl px-2">✕</button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                <span className="text-emerald-600 text-lg leading-none">💡</span>
                <p className="text-[11px] font-bold text-emerald-800 leading-snug">
                  Ingresa o verifica la <b>Clave de Reserva (PNR)</b> y <b>Número de Vuelo</b>. Al confirmar, el ticket se marcará como <b>Comprado</b> y se registrará automáticamente en <b>Orbix (Viajes y Reservas)</b>.
                </p>
              </div>

              {pnrForm.map((item, idx) => (
                <div key={item.idOpcion} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="bg-slate-800 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Opción {idx + 1} • {item.idOpcion}
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      ${Number(item.total || 0).toLocaleString('es-MX')} MXN
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-600">{item.ruta || 'Servicio de viaje'}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Número de Vuelo
                      </label>
                      <input 
                        type="text" 
                        value={item.vuelo}
                        onChange={e => updatePnrFormField(idx, 'vuelo', e.target.value.toUpperCase())}
                        placeholder="Ej: AM500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 uppercase outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block mb-1">
                        Clave PNR *
                      </label>
                      <input 
                        type="text" 
                        value={item.pnr}
                        onChange={e => updatePnrFormField(idx, 'pnr', e.target.value.toUpperCase())}
                        placeholder="Ej: X7B9M2"
                        className="w-full bg-indigo-50/40 border-2 border-indigo-300 rounded-xl px-3 py-2 text-xs font-black text-indigo-700 font-mono uppercase outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Comprobante o Link de Compra (Opcional)
                </label>
                <input 
                  type="text" 
                  value={comprobanteUrl}
                  onChange={e => setComprobanteUrl(e.target.value)}
                  placeholder="https://... o referencia interna"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex gap-2">
              <button 
                onClick={() => setShowComprarModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarCompraYOrbix}
                disabled={actionLoading}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-200 text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Enviando a Orbix...' : '✓ Confirmar y Enviar a Orbix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: any[], onClick: () => void }) {
  const [id, date, solicitante, empresa, estado, _, total] = ticket;

  let color = 'bg-slate-100 text-slate-600';
  if (estado === 'Cotizado') color = 'bg-amber-100 text-amber-700 border border-amber-200';
  if (estado === 'Autorizado') color = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (estado === 'Comprado') color = 'bg-blue-100 text-blue-700 border border-blue-200';

  return (
    <div onClick={onClick} className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 active:scale-95 transition-transform flex flex-col gap-3 cursor-pointer">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">{id}</span>
          <h3 className="font-bold text-slate-800 leading-tight">{empresa}</h3>
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${color}`}>
          {estado}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl">
        <span>👤 {solicitante}</span>
        <span className="text-slate-300">•</span>
        <span>📅 {new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}


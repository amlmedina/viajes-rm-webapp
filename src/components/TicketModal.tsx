'use client';

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pendiente:  { label: 'Pendiente',  color: 'text-amber-700',   bg: 'bg-amber-50'   },
  Cotizado:   { label: 'Cotizado',   color: 'text-blue-700',    bg: 'bg-blue-50'    },
  Autorizado: { label: 'Autorizado', color: 'text-violet-700',  bg: 'bg-violet-50'  },
  Comprado:   { label: 'Comprado',   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  Cancelado:  { label: 'Cancelado',  color: 'text-slate-400',   bg: 'bg-slate-50'   },
};

const TIPO_ICONS: Record<string, string> = {
  VUELO: '✈️', HOTEL: '🏨', BUS: '🚌', Extra: '➕',
};

interface Props {
  ticket: any;
  user: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TicketModal({ ticket, user, onClose, onRefresh }: Props) {
  const est = ESTADOS_CONFIG[ticket.estado] || ESTADOS_CONFIG['Pendiente'];
  const role = user?.role;

  const canChangeStatus = role === 'indipris' || role === 'super';
  const canAuthorize = role === 'admin' || role === 'super';

  const changeStatus = async (newStatus: string) => {
    const reason = ['Cancelado'].includes(newStatus)
      ? prompt('Motivo (opcional):') || ''
      : '';
    const res = await fetch(`/api/tickets/${ticket.idTicket}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newStatus, notas: reason || ticket.notas })
    });
    if (res.ok) onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl shadow-2xl flex flex-col h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-[2rem] md:rounded-[2rem] overflow-hidden border-t-8 border-pink-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden shrink-0"></div>

        {/* Header */}
        <div className="px-6 pb-4 pt-3 md:p-6 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 font-mono">{ticket.idTicket}</h2>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${est.bg} ${est.color}`}>
                {est.label}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1">
              {ticket.solicitante} · {ticket.empresa} · {ticket.fecha ? new Date(ticket.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 font-bold text-2xl leading-none bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {/* Notas */}
          {ticket.notas && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Notas Especiales</p>
              <p className="text-sm font-bold text-amber-900">{ticket.notas}</p>
            </div>
          )}
          {ticket.evento && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Evento</p>
              <p className="text-sm font-bold text-blue-900">{ticket.evento}</p>
            </div>
          )}

          {/* Servicios */}
          <div>
            <h4 className="text-[10px] font-black text-pink-600 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-4">
              Itinerario y Servicios
            </h4>
            {ticket.servicios?.length === 0 ? (
              <p className="text-slate-300 font-bold italic text-xs">Sin servicios registrados.</p>
            ) : (
              <div className="space-y-3">
                {ticket.servicios?.map((s: any) => (
                  <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex gap-4 items-start">
                    <div className="text-2xl shrink-0">{TIPO_ICONS[s.tipo] || '📋'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-700 text-sm">{s.tipo}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {[s.origenHotel, s.destinoCiudad].filter(Boolean).join(' → ')}
                      </p>
                      {(s.fechaIn || s.fechaOut) && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          {s.fechaIn && `Entrada: ${s.fechaIn}`}
                          {s.fechaIn && s.fechaOut && ' | '}
                          {s.fechaOut && `Salida: ${s.fechaOut}`}
                        </p>
                      )}
                      {s.detallesTecnicos && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1 font-mono bg-slate-50 rounded-lg px-2 py-1">{s.detallesTecnicos}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pasajeros */}
          <div>
            <h4 className="text-[10px] font-black text-pink-600 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-4">
              Pasajeros
            </h4>
            {ticket.pasajeros?.length === 0 ? (
              <p className="text-slate-300 font-bold italic text-xs">Sin pasajeros registrados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ticket.pasajeros?.map((p: any) => (
                  <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <p className="font-black text-slate-700">{p.nombre}</p>
                    <div className="mt-2 space-y-1">
                      {p.nacimiento && <p className="text-[10px] font-bold text-slate-400">🎂 {p.nacimiento}</p>}
                      {p.asientoCama && <p className="text-[10px] font-bold text-slate-400">💺 {p.asientoCama}</p>}
                      {p.maletas && <p className="text-[10px] font-bold text-slate-400">🧳 {p.maletas}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opciones de cotización */}
          {ticket.opciones?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-pink-600 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-4">
                Propuestas de Cotización
              </h4>
              <div className="space-y-3">
                {ticket.opciones.map((o: any) => (
                  <div key={o.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-black text-slate-700 text-sm">{o.idOpcion || 'Opción'}</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">{o.descripcion}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {o.totalIva && <p className="font-black text-pink-600">${o.totalIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>}
                        {o.estadoOpcion && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            o.estadoOpcion === 'Autorizada' ? 'bg-emerald-50 text-emerald-700' :
                            o.estadoOpcion === 'Rechazada' ? 'bg-red-50 text-red-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{o.estadoOpcion}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer de acciones */}
        <div className="p-4 md:p-5 bg-white border-t border-slate-100 shrink-0">
          <div className="flex flex-wrap gap-2 justify-end">
            {canChangeStatus && ticket.estado === 'Pendiente' && (
              <button onClick={() => changeStatus('Cotizado')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition uppercase tracking-widest">
                Marcar Cotizado
              </button>
            )}
            {canAuthorize && ticket.estado === 'Cotizado' && (
              <>
                <button onClick={() => changeStatus('Autorizado')}
                  className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-violet-200 hover:bg-violet-700 transition uppercase tracking-widest">
                  ✓ Autorizar
                </button>
                <button onClick={() => changeStatus('Cancelado')}
                  className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[10px] font-black hover:bg-red-100 transition uppercase tracking-widest">
                  Rechazar
                </button>
              </>
            )}
            {canChangeStatus && ticket.estado === 'Autorizado' && (
              <button onClick={() => changeStatus('Comprado')}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition uppercase tracking-widest">
                ✓ Marcar Comprado
              </button>
            )}
            {(canChangeStatus || canAuthorize) && ticket.estado !== 'Cancelado' && ticket.estado !== 'Comprado' && (
              <button onClick={() => changeStatus('Cancelado')}
                className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black hover:bg-red-50 hover:text-red-600 transition uppercase tracking-widest">
                Cancelar Ticket
              </button>
            )}
            <button onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black hover:bg-slate-200 transition uppercase tracking-widest">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

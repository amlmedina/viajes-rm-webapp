'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CargarCotizacionesModal from '@/components/CargarCotizacionesModal';

const ESTADOS: Record<string, { badge: string; label: string }> = {
  Pendiente:  { badge: 'badge badge-pendiente',  label: 'Pendiente'  },
  Cotizado:   { badge: 'badge badge-cotizado',   label: 'Cotizado'   },
  Autorizado: { badge: 'badge badge-autorizado', label: 'Autorizado' },
  Comprado:   { badge: 'badge badge-comprado',   label: 'Comprado'   },
  Cancelado:  { badge: 'badge badge-cancelado',  label: 'Cancelado'  },
};
const TIPO_ICON: Record<string, string> = { VUELO: '✈️', HOTEL: '🏨', BUS: '🚌', Extra: '➕' };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fmtDate(iso: string | null | undefined, human = false) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (human) return `${d.getDate()} - ${MESES[d.getMonth()]} - ${d.getFullYear()}`;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}
function fmtCurrency(n: number | null | undefined) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showCargarOpt, setShowCargarOpt] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketRes, dashRes] = await Promise.all([
          fetch(`/api/tickets/${id}`),
          fetch('/api/dashboard'),
        ]);
        if (!dashRes.ok) { router.push('/login'); return; }
        const dashData = await dashRes.json();
        setUser(dashData.data?.user);
        if (ticketRes.ok) {
          const t = await ticketRes.json();
          setTicket(t.data);
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const changeStatus = async (newStatus: string) => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus, notas: ticket.notas, evento: ticket.evento })
      });
      if (res.ok) {
        const data = await res.json();
        setTicket((prev: any) => ({ ...prev, estado: newStatus }));
        setMsg(`Estado actualizado a ${newStatus}`);
        setTimeout(() => setMsg(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const role = user?.role;
  const canManage = role === 'indipris' || role === 'super' || role === 'admin';
  const canAuthorize = role === 'admin' || role === 'super';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
    </div>
  );
  if (!ticket) return null;

  const est = ESTADOS[ticket.estado] || ESTADOS['Pendiente'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans fade-in">
      {/* ── TOP BAR ────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-black text-sm transition"
            >
              ← Regresar
            </button>
            <span className="text-slate-200">|</span>
            <span className="font-mono font-black text-indipris text-sm">{ticket.idTicket}</span>
            <span className={est.badge}>{est.label}</span>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {canManage && (
              <button onClick={() => setShowCargarOpt(true)}
                className="px-4 py-2 bg-pink-50 text-indipris border border-pink-200 rounded-xl text-[10px] font-black hover:bg-pink-100 transition uppercase tracking-widest">
                + Cargar Cotización
              </button>
            )}
            {canManage && ticket.estado === 'Pendiente' && (
              <button onClick={() => changeStatus('Cotizado')} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition uppercase tracking-widest disabled:opacity-50">
                Marcar Cotizado
              </button>
            )}
            {canAuthorize && ticket.estado === 'Cotizado' && (
              <button onClick={() => changeStatus('Autorizado')} disabled={saving}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-violet-200 hover:bg-violet-700 transition uppercase tracking-widest disabled:opacity-50">
                ✓ Autorizar
              </button>
            )}
            {canManage && ticket.estado === 'Autorizado' && (
              <button onClick={() => changeStatus('Comprado')} disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition uppercase tracking-widest disabled:opacity-50">
                ✓ Marcar Comprado
              </button>
            )}
            {(canManage || canAuthorize) && !['Cancelado', 'Comprado'].includes(ticket.estado) && (
              <button onClick={() => changeStatus('Cancelado')} disabled={saving}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[10px] font-black hover:bg-red-100 transition uppercase tracking-widest disabled:opacity-50">
                Cancelar
              </button>
            )}
          </div>
        </div>
        {msg && (
          <div className="bg-emerald-50 border-t border-emerald-200 text-center py-1.5">
            <p className="text-emerald-700 font-black text-[10px] uppercase tracking-widest">✓ {msg}</p>
          </div>
        )}
      </div>

      {/* ── BODY ───────────────────────────────────── */}
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">

        {/* Info principal */}
        <div className="bg-white rounded-[2rem] card-shadow border border-slate-100 overflow-hidden border-t-8 border-indipris">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800">{ticket.idTicket}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={est.badge}>{est.label}</span>
                  <span className="text-xs font-bold text-slate-400">·</span>
                  <span className="text-xs font-bold text-slate-500">{ticket.empresa}</span>
                  {ticket.responsable && <>
                    <span className="text-xs font-bold text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-500">Asignado: {ticket.responsable}</span>
                  </>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Solicitante</p>
                <p className="font-black text-slate-700">{ticket.solicitante}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{fmtDate(ticket.fecha)}</p>
              </div>
            </div>
          </div>

          {/* Notas y evento */}
          {(ticket.notas || ticket.evento) && (
            <div className="border-t border-slate-100 p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.notas && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Notas Especiales</p>
                  <p className="text-sm font-bold text-amber-900">{ticket.notas}</p>
                </div>
              )}
              {ticket.evento && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Evento</p>
                  <p className="text-sm font-bold text-blue-900">{ticket.evento}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Servicios */}
        <div className="bg-white rounded-[2rem] card-shadow border border-slate-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-slate-100">
            <h4 className="text-[10px] font-black text-indipris uppercase tracking-widest">Itinerario y Servicios</h4>
          </div>
          <div className="p-6 md:p-8">
            {(!ticket.servicios || ticket.servicios.length === 0) ? (
              <p className="text-slate-300 font-bold italic text-xs text-center py-4">Sin servicios registrados.</p>
            ) : (
              <div className="space-y-4">
                {ticket.servicios.map((s: any) => (
                  <div key={s.id} className="flex gap-4 items-start bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-3xl shrink-0 mt-0.5">{TIPO_ICON[s.tipo] || '📋'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-700">{s.tipo}</p>
                        {s.origenHotel && s.destinoCiudad && (
                          <p className="text-xs font-bold text-slate-500">
                            {s.origenHotel} <span className="text-slate-300 mx-1">→</span> {s.destinoCiudad}
                          </p>
                        )}
                        {s.origenHotel && !s.destinoCiudad && <p className="text-xs font-bold text-slate-500">{s.origenHotel}</p>}
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {s.fechaIn && <p className="text-[10px] font-bold text-slate-400">📅 Entrada: {fmtDate(s.fechaIn)}</p>}
                        {s.fechaOut && <p className="text-[10px] font-bold text-slate-400">📅 Salida: {fmtDate(s.fechaOut)}</p>}
                      </div>
                      {s.detallesTecnicos && (
                        <p className="text-[10px] font-mono font-bold text-slate-400 mt-2 bg-white rounded-lg px-3 py-1.5 border border-slate-100 inline-block">
                          {s.detallesTecnicos}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pasajeros */}
        <div className="bg-white rounded-[2rem] card-shadow border border-slate-100 overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-slate-100">
            <h4 className="text-[10px] font-black text-indipris uppercase tracking-widest">
              Pasajeros Oficiales
              <span className="ml-2 text-slate-400 font-bold">({ticket.pasajeros?.length || 0})</span>
            </h4>
          </div>
          <div className="p-6 md:p-8">
            {(!ticket.pasajeros || ticket.pasajeros.length === 0) ? (
              <p className="text-slate-300 font-bold italic text-xs text-center py-4">Sin pasajeros registrados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.pasajeros.map((p: any) => (
                  <div key={p.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="font-black text-slate-700 text-sm">{p.nombre}</p>
                    <div className="mt-2 space-y-1">
                      {p.nacimiento && (
                        <p className="text-[10px] font-bold text-slate-400">
                          🎂 {fmtDate(p.nacimiento, true)}
                        </p>
                      )}
                      {p.asientoCama && p.asientoCama !== 'Indiferente' && (
                        <p className="text-[10px] font-bold text-slate-400">💺 {p.asientoCama}</p>
                      )}
                      {p.maletas && p.maletas !== 'Solo Artículo Personal' && (
                        <p className="text-[10px] font-bold text-slate-400">🧳 {p.maletas}</p>
                      )}
                      {p.linkIdDrive && (
                        <a href={p.linkIdDrive} target="_blank" rel="noreferrer"
                          className="text-[10px] font-bold text-blue-500 hover:underline">
                          🔗 Ver ID
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Propuestas de Cotización */}
        {ticket.opciones?.length > 0 && (
          <div className="bg-white rounded-[2rem] card-shadow border border-slate-100 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-indipris uppercase tracking-widest">Propuestas de Cotización</h4>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              {ticket.opciones.map((o: any) => (
                <div key={o.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-700 text-sm">{o.idOpcion || 'Opción'}</p>
                    {o.descripcion && (
                      <div
                        className="text-xs text-slate-500 font-bold mt-2 leading-relaxed space-y-1 [&_b]:font-black [&_b]:text-slate-700 [&_span]:font-mono [&_span]:text-indipris"
                        dangerouslySetInnerHTML={{ __html: o.descripcion }}
                      />
                    )}
                    <div className="flex gap-4 mt-2">
                      {o.costo && <p className="text-[10px] font-bold text-slate-400">Costo: {fmtCurrency(o.costo)}</p>}
                      {o.fee && <p className="text-[10px] font-bold text-slate-400">Fee: {fmtCurrency(o.fee)}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {o.totalIva && <p className="font-black text-indipris text-lg">{fmtCurrency(o.totalIva)}</p>}
                    {o.estadoOpcion && (
                      <span className={`mt-1 inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        o.estadoOpcion === 'Autorizada' ? 'bg-emerald-50 text-emerald-700' :
                        o.estadoOpcion === 'Rechazada'  ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>{o.estadoOpcion}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer bottom */}
        <div className="h-8"></div>
      </div>

      {showCargarOpt && (
        <CargarCotizacionesModal
          idTicket={ticket.idTicket}
          pasajerosCount={ticket.pasajeros?.length || 1}
          onClose={() => setShowCargarOpt(false)}
          onSuccess={() => {
            setShowCargarOpt(false);
            setMsg('Cotizaciones guardadas con éxito');
            window.location.reload(); // Refresh to show new options
          }}
        />
      )}
    </div>
  );
}

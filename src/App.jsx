import { useState, useEffect, useCallback } from 'react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const USERS = [
  { id: 'mireia', name: 'Mireia', initials: 'MS', color: '#cf731b', bg: '#faeeda', textColor: '#633806' },
  { id: 'vicky',  name: 'Vicky',  initials: 'VK', color: '#185fa5', bg: '#e6f1fb', textColor: '#042c53' },
]

const API = '/api/firmas'
const TODAY = new Date()

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function userById(id) { return USERS.find(u => u.id === id) || USERS[0] }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function firstDow(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }
function monthLabel(m, y) {
  return new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

// ─── Hook API ─────────────────────────────────────────────────────────────────

function useFiremas() {
  const [firmas, setFirmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFirmas = useCallback(async () => {
    try {
      const r = await fetch(API)
      const json = await r.json()
      setFirmas(json.firmas || [])
      setError(null)
    } catch {
      setError('Sin conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFirmas() }, [fetchFirmas])

  // Polling cada 30s para actualización en tiempo real
  useEffect(() => {
    const interval = setInterval(fetchFirmas, 30000)
    return () => clearInterval(interval)
  }, [fetchFirmas])

  const addFirma = async (firma, pin) => {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rk-pin': pin },
      body: JSON.stringify({ firma }),
    })
    const json = await r.json()
    if (!json.ok) throw new Error(json.error)
    setFirmas(json.firmas)
  }

  const deleteFirma = async (id, pin) => {
    const r = await fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-rk-pin': pin },
      body: JSON.stringify({ id }),
    })
    const json = await r.json()
    if (!json.ok) throw new Error(json.error)
    setFirmas(json.firmas)
  }

  return { firmas, loading, error, addFirma, deleteFirma, refresh: fetchFirmas }
}

// ─── Componentes UI ───────────────────────────────────────────────────────────

function RKLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, letterSpacing: -1, color: '#fff' }}>
        R<span style={{ color: '#cf731b' }}>K</span>
      </div>
      <div style={{ width: '0.5px', height: 32, background: 'rgba(255,255,255,0.2)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.04em' }}>Palanca Fontestad</span>
        <span style={{ fontFamily: 'Montserrat', fontWeight: 400, fontSize: 9, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>by Realmark Inmobiliaria</span>
      </div>
    </div>
  )
}

function Avatar({ user, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: user.bg, color: user.textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat', fontSize: size * 0.35, fontWeight: 700,
      flexShrink: 0,
    }}>
      {user.initials}
    </div>
  )
}

// ─── Modal de acceso con PIN ───────────────────────────────────────────────────

function PinModal({ onAccess, onCancel }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)

  const check = () => {
    // El PIN se valida en el servidor — aquí solo lo enviamos
    // Guardamos en sesión y notificamos al padre
    if (pin.length < 4) { setErr(true); return }
    onAccess(pin)
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={{ ...styles.modalHead, background: '#000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cf731b' }} />
            <div>
              <div style={styles.modalTitle}>Acceso edición</div>
              <div style={{ ...styles.modalSub, color: '#888' }}>Solo Mireia y Vicky</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 20px 8px' }}>
          <label style={styles.label}>PIN de acceso</label>
          <input
            type="password"
            maxLength={8}
            value={pin}
            onChange={e => { setPin(e.target.value); setErr(false) }}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="····"
            style={{ ...styles.input, borderColor: err ? '#e24b4a' : undefined, textAlign: 'center', letterSpacing: '0.3em', fontSize: 20 }}
            autoFocus
          />
          {err && <div style={{ color: '#e24b4a', fontSize: 11, marginTop: 6, fontWeight: 500 }}>Introduce el PIN (mínimo 4 dígitos)</div>}
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.btnCancel} onClick={onCancel}>Cancelar</button>
          <button style={styles.btnSave} onClick={check}>
            <i className="ti ti-lock-open" style={{ fontSize: 13 }} /> Acceder
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal nuevo / detalle firma ───────────────────────────────────────────────

function FirmaModal({ day, month, year, onSave, onClose, pin }) {
  const [selUser, setSelUser] = useState(USERS[0].id)
  const [hora, setHora] = useState('')
  const [ref, setRef] = useState('')
  const [cap, setCap] = useState('')
  const [com, setCom] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!ref.trim()) { setErr('La referencia es obligatoria'); return }
    setSaving(true)
    try {
      await onSave({ id: uid(), year, month, day, userId: selUser, hora, referencia: ref.trim(), captador: cap.trim(), comprador: com.trim() }, pin)
      onClose()
    } catch (e) {
      setErr(e.message === 'PIN incorrecto' ? 'PIN incorrecto. Inténtalo de nuevo.' : 'Error al guardar. Comprueba la conexión.')
      setSaving(false)
    }
  }

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={{ ...styles.modalHead, background: '#000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cf731b' }} />
            <div>
              <div style={styles.modalTitle}>Nueva firma de notaría</div>
              <div style={{ ...styles.modalSub, color: '#888' }}>Día {day} · {monthLabel(month, year)}</div>
            </div>
          </div>
          <button style={styles.modalClose} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <div style={{ padding: 20 }}>
          <label style={styles.label}>¿Quién la gestiona?</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {USERS.map(u => (
              <div key={u.id}
                onClick={() => setSelUser(u.id)}
                style={{
                  flex: 1, borderRadius: 8, border: `2px solid ${selUser === u.id ? u.color : 'rgba(0,0,0,0.12)'}`,
                  background: selUser === u.id ? u.bg : '#fff',
                  padding: '10px 8px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.15s',
                }}>
                <Avatar user={u} size={36} />
                <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: '#111' }}>{u.name}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={styles.label}>Hora notaría</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Referencia inmueble</label>
              <input type="text" value={ref} onChange={e => { setRef(e.target.value); setErr('') }} placeholder="Ej. 2024-0342" style={styles.input} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}><i className="ti ti-arrow-up" style={{ color: '#cf731b', fontSize: 11 }} /> Agente captador</label>
            <input type="text" value={cap} onChange={e => setCap(e.target.value)} placeholder="Nombre del captador" style={styles.input} />
          </div>
          <div>
            <label style={styles.label}><i className="ti ti-arrow-down" style={{ color: '#185fa5', fontSize: 11 }} /> Agente comprador</label>
            <input type="text" value={com} onChange={e => setCom(e.target.value)} placeholder="Nombre del agente comprador" style={styles.input} />
          </div>
          {err && <div style={{ color: '#e24b4a', fontSize: 12, marginTop: 10, fontWeight: 500 }}>{err}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.btnCancel} onClick={onClose} disabled={saving}>Cancelar</button>
          <button style={{ ...styles.btnSave, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : <><i className="ti ti-check" style={{ fontSize: 13 }} /> Guardar firma</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ firma, onDelete, onClose, canEdit, pin }) {
  const u = userById(firma.userId)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  const del = async () => {
    setDeleting(true)
    try {
      await onDelete(firma.id, pin)
      onClose()
    } catch (e) {
      setErr(e.message === 'PIN incorrecto' ? 'PIN incorrecto' : 'Error al eliminar')
      setDeleting(false)
    }
  }

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={{ ...styles.modalHead, background: u.color }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={u} size={30} />
            <div>
              <div style={styles.modalTitle}>{u.name} · Firma de notaría</div>
              <div style={{ ...styles.modalSub, color: 'rgba(255,255,255,0.75)' }}>
                Día {firma.day} · {monthLabel(firma.month, firma.year)}{firma.hora ? ' · ' + firma.hora : ''}
              </div>
            </div>
          </div>
          <button style={styles.modalClose} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f5f4f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <Avatar user={u} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>{u.name}</div>
              <div style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#6b6b6b' }}>Coordinadora Dpto. Firmas y Postventa</div>
            </div>
            <div style={{ background: '#000', color: '#fff', borderRadius: 6, padding: '4px 10px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
              {firma.referencia}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {firma.hora && <Row icon="ti-clock" label="Hora" val={firma.hora} />}
            {firma.captador && <Row icon="ti-arrow-up" label="Captador" val={firma.captador} iconColor="#cf731b" />}
            {firma.comprador && <Row icon="ti-arrow-down" label="Comprador" val={firma.comprador} iconColor="#185fa5" />}
          </div>
          {err && <div style={{ color: '#e24b4a', fontSize: 12, marginTop: 10, fontWeight: 500 }}>{err}</div>}
        </div>
        <div style={styles.modalFooter}>
          {canEdit && (
            <button style={{ ...styles.btnDelete, opacity: deleting ? 0.7 : 1 }} onClick={del} disabled={deleting}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} /> {deleting ? '...' : 'Eliminar'}
            </button>
          )}
          <button style={styles.btnCancel} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, val, iconColor = '#cf731b' }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <i className={`ti ${icon}`} style={{ color: iconColor, fontSize: 15, marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 80 }}>{label}</span>
      <span style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 500, color: '#111' }}>{val}</span>
    </div>
  )
}

// ─── App principal ─────────────────────────────────────────────────────────────

export default function App() {
  const { firmas, loading, error, addFirma, deleteFirma, refresh } = useFiremas()
  const [year, setYear] = useState(TODAY.getFullYear())
  const [month, setMonth] = useState(TODAY.getMonth())
  const [modal, setModal] = useState(null) // { type: 'pin'|'add'|'detail', ... }
  const [pin, setPin] = useState(sessionStorage.getItem('rk_firmas_pin') || '')
  const [isEditor, setIsEditor] = useState(false)

  const mFirmas = firmas.filter(f => f.year === year && f.month === month)
  const total = mFirmas.length

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const requestEdit = (action) => {
    if (isEditor) {
      action()
    } else {
      setModal({ type: 'pin', next: action })
    }
  }

  const handlePinAccess = async (enteredPin) => {
    // Intentamos hacer una petición de prueba — si el servidor la acepta, guardamos el PIN
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rk-pin': enteredPin },
        body: JSON.stringify({ firma: { __test: true } }),
      })
      const json = await r.json()
      if (json.ok || json.error !== 'PIN incorrecto') {
        // PIN válido — refrescamos para eliminar el registro de test si se creó
        // (el servidor ignorará la firma de test con __test:true si lo implementamos, o simplemente lo borramos)
        setPin(enteredPin)
        sessionStorage.setItem('rk_firmas_pin', enteredPin)
        setIsEditor(true)
        if (modal?.next) { modal.next(); return }
        setModal(null)
        refresh()
      } else {
        alert('PIN incorrecto')
      }
    } catch {
      // Si no hay conexión, aceptamos el PIN localmente (se validará en cada operación)
      setPin(enteredPin)
      sessionStorage.setItem('rk_firmas_pin', enteredPin)
      setIsEditor(true)
      if (modal?.next) { modal.next(); return }
      setModal(null)
    }
  }

  const openAdd = (day) => {
    requestEdit(() => setModal({ type: 'add', day }))
  }

  const handleSave = async (firma, p) => {
    await addFirma(firma, p || pin)
  }

  const handleDelete = async (id, p) => {
    await deleteFirma(id, p || pin)
  }

  const dim = daysInMonth(year, month)
  const fd = firstDow(year, month)
  const trailing = (fd + dim) % 7 === 0 ? 0 : 7 - ((fd + dim) % 7)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#000', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <RKLogo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, color: '#cf731b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dpto. Firmas</div>
            <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: '#666', letterSpacing: '0.04em' }}>Notarías · Seguimiento</div>
          </div>
          {isEditor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(207,115,27,0.2)', border: '0.5px solid rgba(207,115,27,0.4)', borderRadius: 20, padding: '5px 12px' }}>
              <i className="ti ti-edit" style={{ color: '#cf731b', fontSize: 13 }} />
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#cf731b' }}>Modo edición</span>
            </div>
          ) : (
            <button
              onClick={() => setModal({ type: 'pin' })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 12px', color: '#fff' }}>
              <i className="ti ti-lock" style={{ fontSize: 13 }} />
              <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 500 }}>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra naranja: mes + stats */}
      <div style={{ background: '#cf731b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
            <i className="ti ti-chevron-left" />
          </button>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: '#fff', minWidth: 200, textAlign: 'center', letterSpacing: '0.02em', textTransform: 'capitalize' }}>
            {monthLabel(month, year)}
          </div>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Stat num={total} label="Total" />
          {USERS.map(u => <Stat key={u.id} num={mFirmas.filter(f => f.userId === u.id).length} label={u.name} />)}
          <button onClick={refresh} title="Actualizar" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
            <i className="ti ti-refresh" />
          </button>
        </div>
      </div>

      {/* Leyenda equipo */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <i className="ti ti-users" style={{ fontSize: 13, verticalAlign: -2, marginRight: 4 }} />Equipo
        </span>
        <div style={{ width: '0.5px', height: 24, background: 'rgba(0,0,0,0.1)' }} />
        {USERS.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar user={u} size={28} />
            <div>
              <div style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: '#111' }}>{u.name}</div>
              <div style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#6b6b6b' }}>
                {mFirmas.filter(f => f.userId === u.id).length} firma{mFirmas.filter(f => f.userId === u.id).length !== 1 ? 's' : ''} este mes
              </div>
            </div>
          </div>
        ))}
        {error && <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#e24b4a', marginLeft: 'auto' }}>⚠ {error}</span>}
        {loading && <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#6b6b6b', marginLeft: 'auto' }}>Cargando...</span>}
      </div>

      {/* Calendario */}
      <div style={{ margin: '0 24px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f5f4f0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
            <div key={d} style={{
              padding: '8px 4px', textAlign: 'center',
              fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: i >= 5 ? '#cf731b' : '#6b6b6b',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              borderRight: i < 6 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
            }}>{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array(fd).fill(null).map((_, i) => <EmptyCell key={`e${i}`} />)}

          {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
            const dow = (fd + d - 1) % 7
            const isWE = dow >= 5
            const isToday = d === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear()
            const df = mFirmas.filter(f => f.day === d).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
            return (
              <div key={d}
                onClick={() => isEditor && openAdd(d)}
                style={{
                  minHeight: 108, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
                  borderRight: (fd + d - 1) % 7 < 6 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                  borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                  background: isToday ? '#fff9f5' : isWE ? '#fafaf8' : '#fff',
                  cursor: isEditor ? 'pointer' : 'default',
                  outline: isToday ? '2px solid #cf731b' : 'none',
                  outlineOffset: -2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (isEditor) e.currentTarget.style.background = '#f5f4f0' }}
                onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#fff9f5' : isWE ? '#fafaf8' : '#fff' }}
              >
                <div style={{
                  fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
                  color: isToday ? '#cf731b' : isWE ? '#cf731b' : '#6b6b6b', marginBottom: 1,
                }}>{d}</div>

                {df.map(f => {
                  const u = userById(f.userId)
                  return (
                    <div key={f.id}
                      onClick={e => { e.stopPropagation(); setModal({ type: 'detail', firma: f }) }}
                      style={{
                        background: u.bg, borderLeft: `3px solid ${u.color}`,
                        borderRadius: 5, padding: '3px 5px', cursor: 'pointer',
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, color: u.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.referencia}
                        </span>
                        {f.hora && <span style={{ fontFamily: 'Montserrat', fontSize: 9, color: u.textColor, opacity: 0.75, marginLeft: 'auto', flexShrink: 0 }}>{f.hora}</span>}
                      </div>
                      {(f.captador || f.comprador) && (
                        <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: u.textColor, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[f.captador ? '↑' + f.captador : '', f.comprador ? '↓' + f.comprador : ''].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isEditor && (
                  <button
                    onClick={e => { e.stopPropagation(); openAdd(d) }}
                    style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', padding: '2px 0', fontFamily: 'Montserrat', fontSize: 10, color: '#bbb', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#cf731b'}
                    onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
                  >
                    <i className="ti ti-plus" style={{ fontSize: 11 }} /> añadir
                  </button>
                )}
              </div>
            )
          })}

          {Array(trailing).fill(null).map((_, i) => <EmptyCell key={`t${i}`} />)}
        </div>
      </div>

      {/* Pie */}
      <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'Montserrat', fontSize: 11, color: '#aaa', letterSpacing: '0.04em' }}>
        RK Palanca Fontestad · Desde 1976 · L'Horta Nord, Valencia
        {!isEditor && (
          <span style={{ marginLeft: 16 }}>
            <i className="ti ti-eye" style={{ fontSize: 12, verticalAlign: -2, marginRight: 4 }} />Modo consulta
          </span>
        )}
      </div>

      {/* Modales */}
      {modal?.type === 'pin' && (
        <PinModal onAccess={handlePinAccess} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'add' && (
        <FirmaModal
          day={modal.day} month={month} year={year}
          onSave={handleSave} onClose={() => setModal(null)} pin={pin}
        />
      )}
      {modal?.type === 'detail' && (
        <DetailModal
          firma={modal.firma}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          canEdit={isEditor} pin={pin}
        />
      )}
    </div>
  )
}

function EmptyCell() {
  return <div style={{ minHeight: 108, background: '#f8f8f6', borderRight: '0.5px solid rgba(0,0,0,0.06)', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }} />
}

function Stat({ num, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: '#fff', lineHeight: 1 }}>{num}</div>
      <div style={{ fontFamily: 'Montserrat', fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

// ─── Estilos compartidos ───────────────────────────────────────────────────────

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.15)',
    width: 400, maxWidth: '100%', overflow: 'hidden',
  },
  modalHead: {
    padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  modalTitle: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#fff' },
  modalSub: { fontFamily: 'Montserrat', fontWeight: 400, fontSize: 11 },
  modalClose: {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
    width: 26, height: 26, cursor: 'pointer', color: '#fff', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalFooter: {
    padding: '14px 18px', borderTop: '0.5px solid rgba(0,0,0,0.08)',
    display: 'flex', gap: 8, justifyContent: 'flex-end',
  },
  label: {
    fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#6b6b6b',
    textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5,
  },
  input: {
    width: '100%', padding: '8px 10px',
    border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8,
    fontFamily: 'Montserrat', fontSize: 13, background: '#fff', color: '#111',
  },
  btnCancel: {
    background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8,
    padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 500,
    color: '#6b6b6b', cursor: 'pointer',
  },
  btnSave: {
    background: '#cf731b', border: 'none', borderRadius: 8,
    padding: '8px 20px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700,
    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  },
  btnDelete: {
    background: 'none', border: '0.5px solid #e24b4a', borderRadius: 8,
    padding: '8px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 500,
    color: '#e24b4a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  },
}

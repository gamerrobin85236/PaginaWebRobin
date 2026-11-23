import { useEffect, useState } from 'react'
import { EMAIL_DEFAULTS, fetchEmailSettings, saveEmailSettings, sendTestEmail, type EmailSettings } from '../../lib/adminApi'
import { useAuth } from '../../hooks/useAuth'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

const fill = (text: string) => text.replace(/\{nombre\}/g, 'Luis').replace(/\{pedido\}/g, 'GR-1A2B3C4D5E6F7A8B')

export default function EmailAdmin() {
  const { session } = useAuth()
  const [form, setForm] = useState<EmailSettings>(EMAIL_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [testTo, setTestTo] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchEmailSettings()
      .then(setForm)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo cargar.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    if (!testTo && session?.user.email) setTestTo(session.user.email)
  }, [session, testTo])

  async function save() {
    setError(null)
    setInfo(null)
    if (!form.subject.trim() || !form.intro.trim() || !form.footer.trim()) return setError('Ningún texto puede quedar vacío.')
    setSaving(true)
    const err = await saveEmailSettings(form)
    setSaving(false)
    if (err) return setError(err)
    setInfo('Guardado. Los próximos correos usarán estos textos.')
  }

  async function test() {
    setError(null)
    setInfo(null)
    setSending(true)
    // Primero se guarda, para que el ejemplo use lo que se ve en pantalla.
    const saveErr = await saveEmailSettings(form)
    if (saveErr) {
      setSending(false)
      return setError(saveErr)
    }
    const err = await sendTestEmail(testTo.trim())
    setSending(false)
    if (err) return setError(err)
    setInfo(`Enviamos un correo de ejemplo a ${testTo.trim()}. Revisa también la carpeta de spam.`)
  }

  if (loading) return <p className="text-sm text-muted">Cargando...</p>

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-lg">Correo que recibe el cliente</h2>
          <p className="text-xs text-muted mt-1">
            Se envía automáticamente al aprobarse el pago, con el logo de la tienda y los datos de la compra. Aquí editas los
            textos. Puedes usar <b>{'{nombre}'}</b> (nombre del cliente) y <b>{'{pedido}'}</b> (número de pedido).
          </p>
        </div>
        <div>
          <label className="text-xs text-muted">Asunto</label>
          <input className={inputCls} maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted">Mensaje principal (arriba, junto al logo)</label>
          <textarea rows={3} className={inputCls} maxLength={600} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted">Mensaje final (instrucciones, recomendaciones)</label>
          <textarea rows={5} className={inputCls} maxLength={1500} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={saving} className="bg-primary text-primary-ink font-semibold rounded-full px-5 py-2.5 text-sm disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar textos'}
          </button>
          <button onClick={() => setForm(EMAIL_DEFAULTS)} type="button" className="rounded-full border border-line px-4 py-2.5 text-sm text-muted hover:border-primary/60">
            Volver a los textos originales
          </button>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-2 mt-2">
          <p className="text-sm font-semibold">Enviar un correo de prueba</p>
          <p className="text-xs text-muted">Te llega un correo de ejemplo igual al que verá el cliente, con una cuenta inventada.</p>
          <input className={inputCls} type="email" placeholder="Correo donde recibirlo" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button onClick={test} disabled={sending || !testTo.trim()} className="rounded-full border border-primary/60 text-primary font-semibold px-4 py-2 text-sm disabled:opacity-50">
            {sending ? 'Enviando...' : 'Guardar y enviar prueba'}
          </button>
        </div>
      </div>

      {/* Vista previa aproximada del correo */}
      <div>
        <p className="text-xs text-muted mb-2">Así se verá (aproximado)</p>
        <div className="rounded-2xl overflow-hidden bg-white text-[#111] shadow-lg">
          <div className="bg-black flex justify-center p-4">
            <img src="/logo-email.png" alt="" width={96} height={96} />
          </div>
          <div className="p-5 text-sm">
            <p className="text-xs text-[#6b7a70] mb-2">Asunto: {fill(form.subject)}</p>
            <h3 className="font-bold text-lg whitespace-pre-line">{fill(form.intro)}</h3>
            <p className="text-xs text-[#6b7a70] mt-1">Pedido GR-1A2B3C4D5E6F7A8B · Total $80.000</p>
            <p className="font-bold mt-4">Juego de ejemplo (PS5) <span className="font-normal text-[#6b7a70]">x1</span></p>
            <div className="mt-2 rounded-lg border border-[#bfe6cb] bg-[#f1fbf4] p-3 text-xs">
              <p className="font-bold text-[#0a7a3a]">CUENTA PRINCIPAL</p>
              <p className="mt-1 text-[#6b7a70]">Correo / usuario</p>
              <p className="font-mono font-bold">ejemplo@correo.com</p>
              <p className="mt-1 text-[#6b7a70]">Contraseña</p>
              <p className="font-mono font-bold">ClaveDeEjemplo123</p>
              <p className="mt-1 text-[#6b7a70]">Código de verificación</p>
              <p className="font-mono font-bold">123456</p>
            </div>
            <p className="text-xs mt-4 whitespace-pre-line text-[#333]">{fill(form.footer)}</p>
            <div className="mt-3 flex gap-2 flex-wrap text-xs font-bold">
              <span className="rounded-full bg-[#16c75a] text-[#04210f] px-4 py-2">Ver mi pedido</span>
              <span className="rounded-full border border-[#16c75a] text-[#0a7a3a] px-4 py-2">Escribir por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

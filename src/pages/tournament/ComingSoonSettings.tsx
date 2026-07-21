import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { comingSoonSettingsService, type ComingSoonSettings as CS } from '@/services/api'

type Lang = 'ru' | 'kk'

const EMPTY: CS = {
  title1_ru: '', title1_kk: '', title2_ru: '', title2_kk: '',
  subtitle_ru: '', subtitle_kk: '',
}

export default function ComingSoonSettings() {
  const [v, setV] = useState<CS>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')

  const apply = useCallback((s: CS) => setV(s), [])

  useEffect(() => {
    comingSoonSettingsService.getSettings()
      .then(apply)
      .catch(() => toast.error('Не удалось загрузить настройки экрана «Скоро»'))
      .finally(() => setLoading(false))
  }, [apply])

  const set = <K extends keyof CS>(k: K, val: CS[K]) => setV(p => ({ ...p, [k]: val }))

  const handleSave = async () => {
    for (const k of Object.keys(v) as (keyof CS)[]) {
      if (!String(v[k]).trim()) { toast.error('Все поля должны быть заполнены (RU и KK)'); return }
    }
    setSaving(true)
    try {
      const s = await comingSoonSettingsService.updateSettings(v)
      apply(s)
      toast.success('Экран «Скоро» сохранён')
    } catch {
      toast.error('Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Загрузка…</div>

  // Live preview (sample event name substituted into {title}).
  const sampleTitle = 'AIMA GRAND PRIX'
  const t1 = lang === 'ru' ? v.title1_ru : v.title1_kk
  const t2 = lang === 'ru' ? v.title2_ru : v.title2_kk
  const sub = (lang === 'ru' ? v.subtitle_ru : v.subtitle_kk).replace('{title}', sampleTitle)

  const field = (label: string, ru: keyof CS, kk: keyof CS, textarea = false) => (
    <div className="mb-4">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        {([['RU', ru], ['KK', kk]] as [string, keyof CS][]).map(([tag, key]) => (
          <div key={key as string}>
            <span className="text-[10px] font-bold text-gray-400">{tag}</span>
            {textarea ? (
              <textarea
                rows={3}
                value={v[key]}
                onChange={e => set(key, e.target.value as CS[typeof key])}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <input
                value={v[key]}
                onChange={e => set(key, e.target.value as CS[typeof key])}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Экран «Скоро запускаем»</h1>
      <p className="text-sm text-gray-500 mb-5">
        Показывается при тапе на баннер события, которое ещё не запущено.
        Тексты применяются без публикации новой версии приложения. В подзаголовке{' '}
        <code className="bg-gray-100 rounded px-1">{'{title}'}</code> заменяется на название события.
      </p>

      <div className="flex gap-6 flex-wrap">
        {/* Form */}
        <div className="flex-1 min-w-[340px] bg-white rounded-xl border border-gray-200 p-5">
          {field('Заголовок — строка 1 (обычная)', 'title1_ru', 'title1_kk')}
          {field('Заголовок — строка 2 (акцент, фиолетовая)', 'title2_ru', 'title2_kk')}
          {field('Подзаголовок', 'subtitle_ru', 'subtitle_kk', true)}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>

        {/* Live preview */}
        <div className="w-[300px]">
          <div className="flex gap-2 mb-2">
            {(['ru', 'kk'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs px-3 py-1 rounded-full border ${lang === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div
            className="rounded-3xl p-6 flex flex-col items-center text-center"
            style={{ background: 'linear-gradient(135deg,#1B0E3B,#100823 55%,#070410)', minHeight: 460 }}
          >
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 60 }}>🚀</div>
            <div className="mt-5" style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              {t1}<span style={{ color: '#A8AAFF' }}>{t2}</span>
            </div>
            <div className="mt-3" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {sub}
            </div>
            <div style={{ flex: 1 }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Предпросмотр с примером названия «{sampleTitle}». Кнопки на экране больше нет.
          </p>
        </div>
      </div>
    </div>
  )
}

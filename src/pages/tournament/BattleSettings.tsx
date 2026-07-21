import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { battleSettingsService, type BattleSettings as BattleSettingsT } from '@/services/api'

type FieldKey =
    | 'stars_win'
    | 'stars_draw'
    | 'stars_loss'
    | 'questions_per_subject'
    | 'time_seconds'
    | 'bot_win_rate_min'
    | 'bot_win_rate_max'

const FIELDS: { key: FieldKey; label: string; hint?: string }[] = [
    { key: 'stars_win', label: 'Очки за победу' },
    { key: 'stars_draw', label: 'Очки за ничью' },
    { key: 'stars_loss', label: 'Очки за поражение' },
    { key: 'questions_per_subject', label: 'Вопросов на предмет' },
    { key: 'time_seconds', label: 'Время на баттл, сек', hint: 'Пока таймер на стороне приложения — значение хранится, но сервером ещё не применяется.' },
    { key: 'bot_win_rate_min', label: 'Сложность бота: мин. win-rate, %' },
    { key: 'bot_win_rate_max', label: 'Сложность бота: макс. win-rate, %' },
]

export default function BattleSettings() {
    const [values, setValues] = useState<Record<FieldKey, string>>({
        stars_win: '', stars_draw: '', stars_loss: '',
        questions_per_subject: '', time_seconds: '',
        bot_win_rate_min: '', bot_win_rate_max: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const apply = useCallback((s: BattleSettingsT) => {
        setValues({
            stars_win: String(s.stars_win),
            stars_draw: String(s.stars_draw),
            stars_loss: String(s.stars_loss),
            questions_per_subject: String(s.questions_per_subject),
            time_seconds: String(s.time_seconds),
            bot_win_rate_min: String(s.bot_win_rate_min),
            bot_win_rate_max: String(s.bot_win_rate_max),
        })
    }, [])

    useEffect(() => {
        battleSettingsService.getSettings()
            .then(apply)
            .catch(() => toast.error('Не удалось загрузить настройки баттла'))
            .finally(() => setLoading(false))
    }, [apply])

    const handleSave = async () => {
        // Every field is a non-negative integer.
        for (const f of FIELDS) {
            const n = parseInt(values[f.key], 10)
            if (isNaN(n) || n < 0) { toast.error(`${f.label}: введите неотрицательное число`); return }
        }
        const min = parseInt(values.bot_win_rate_min, 10)
        const max = parseInt(values.bot_win_rate_max, 10)
        if (min > max) { toast.error('Сложность бота: минимум не может быть больше максимума'); return }
        if (max > 100) { toast.error('Win-rate бота не может быть больше 100%'); return }

        setSaving(true)
        try {
            const patch = Object.fromEntries(
                FIELDS.map(f => [f.key, parseInt(values[f.key], 10)]),
            )
            const s = await battleSettingsService.updateSettings(patch)
            apply(s)
            toast.success('Настройки баттла сохранены')
        } catch {
            toast.error('Не удалось сохранить настройки')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Загрузка…</div>

    return (
        <div className="p-6 max-w-2xl">
            <h1 className="text-xl font-bold mb-1">Баттл — настройки</h1>
            <p className="text-sm text-gray-500 mb-5">
                Раньше эти значения были захардкожены. Меняются здесь и применяются
                без публикации новой версии приложения.
            </p>
            <div className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-5">
                {FIELDS.map(f => (
                    <div key={f.key} className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">{f.label}</label>
                        <input
                            type="number" min={0} step={1}
                            value={values[f.key]}
                            onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                            className="w-48 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {f.hint && <span className="text-xs text-gray-400">{f.hint}</span>}
                    </div>
                ))}
                <div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                    >
                        {saving ? 'Сохранение…' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    )
}

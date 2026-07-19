import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AlertModal from '@/components/common/AlertModal'
import {
    Bell, Send, Users, Crown, Smartphone, History,
    Clock, Flame, Settings, CheckCircle, XCircle, Loader2,
    ChevronDown, ChevronUp, Save, Play, WifiOff, FlaskConical,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/common/Button'
import {
    pushService,
    streakPushTemplateService,
    dailyNotificationService,
    type PushTarget,
    type PushSendResult,
    type StreakPushTemplate,
    type DailyNotificationTemplate,
    type TestPushResult,
    type TestPushPhoneResult,
} from '@/services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast history (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'aima_admin_push_history_v1'
const HISTORY_LIMIT = 10
const TITLE_MAX = 100
const BODY_MAX = 500

interface HistoryEntry {
    timestamp: string
    title: string
    body: string
    target: PushTarget
    result: PushSendResult
}

const TARGET_LABELS: Record<PushTarget, string> = {
    all: 'Все пользователи',
    pro: 'Только PRO',
    ios: 'Только iOS',
}

const TARGET_ICONS: Record<PushTarget, React.ComponentType<{ className?: string }>> = {
    all: Users,
    pro: Crown,
    ios: Smartphone,
}

const TARGET_DESCRIPTIONS: Record<PushTarget, string> = {
    all: 'Все зарегистрированные устройства (iOS + Android, FREE + PRO)',
    pro: 'Только пользователи с активной PRO-подпиской',
    ios: 'Только устройства iOS (для пушей про App Store обновления и т.п.)',
}

const loadHistory = (): HistoryEntry[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : []
    } catch {
        return []
    }
}

const saveHistory = (entries: HistoryEntry[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
    } catch { /* quota — non-essential */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fireTime = (h: number, m: number, tz: string) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${tz}`

const streakFireTime = (t: StreakPushTemplate) =>
    fireTime((24 - t.hours_before_reset) % 24, 0, t.timezone)

const StatusBadge: React.FC<{ enabled: boolean }> = ({ enabled }) =>
    enabled
        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <CheckCircle className="h-3 w-3" /> Активен
          </span>
        : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
              <XCircle className="h-3 w-3" /> Отключён
          </span>

// ─────────────────────────────────────────────────────────────────────────────
// Streak config panel (inline)
// ─────────────────────────────────────────────────────────────────────────────

interface StreakConfigProps {
    template: StreakPushTemplate
    onSaved: (t: StreakPushTemplate) => void
}

const StreakConfigPanel: React.FC<StreakConfigProps> = ({ template, onSaved }) => {
    const [enabled, setEnabled] = useState(template.enabled)
    const [title, setTitle] = useState(template.title)
    const [body, setBody] = useState(template.body)
    const [hours, setHours] = useState(template.hours_before_reset)
    const [tz, setTz] = useState(template.timezone)
    const [saving, setSaving] = useState(false)
    const [triggering, setTriggering] = useState(false)
    const [testUserId, setTestUserId] = useState('')
    const [testStreak, setTestStreak] = useState(5)

    const save = async () => {
        if (!title.trim() || !body.trim()) { toast.error('Заголовок и текст не могут быть пустыми'); return }
        if (hours < 1 || hours > 23) { toast.error('Сдвиг: от 1 до 23 часов'); return }
        setSaving(true)
        try {
            const updated = await streakPushTemplateService.update({
                enabled, title: title.trim(), body: body.trim(),
                hours_before_reset: hours, timezone: tz.trim() || 'Asia/Almaty',
            })
            onSaved(updated)
            toast.success('Шаблон сохранён')
        } catch (e: any) {
            toast.error(`Ошибка: ${e?.response?.data?.detail || e.message}`)
        } finally { setSaving(false) }
    }

    const trigger = async () => {
        setTriggering(true)
        try {
            const payload: { target_user_id?: string; fake_streak?: number } = {}
            if (testUserId.trim()) { payload.target_user_id = testUserId.trim(); payload.fake_streak = testStreak }
            const r = await streakPushTemplateService.trigger(payload)
            if (r.skipped_disabled) toast('Cron отключён — пропустил')
            else toast.success(`Доставлено ${r.delivered}/${r.requested}`)
        } catch (e: any) {
            toast.error(`Ошибка триггера: ${e?.response?.data?.detail || e.message}`)
        } finally { setTriggering(false) }
    }

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
                <div
                    onClick={() => setEnabled(v => !v)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Включить отправку</span>
            </label>

            {/* Title */}
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs font-medium text-gray-600">Заголовок</label>
                    <span className="text-xs text-gray-400 tabular-nums">{title.length}/200</span>
                </div>
                <input
                    value={title} onChange={e => setTitle(e.target.value)} maxLength={220}
                    placeholder="Не теряй стрик! 🔥"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {/* Body */}
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs font-medium text-gray-600">Текст <code className="bg-gray-100 px-1 rounded text-xs">{'{streak}'}</code> — дни стрика</label>
                    <span className="text-xs text-gray-400 tabular-nums">{body.length}/500</span>
                </div>
                <textarea
                    value={body} onChange={e => setBody(e.target.value)} maxLength={520} rows={3}
                    placeholder="У тебя {streak} дн. подряд. Зайди до полуночи — иначе серия сгорит."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">За N часов до полуночи (1–23)</label>
                    <input
                        type="number" min={1} max={23} value={hours}
                        onChange={e => setHours(parseInt(e.target.value || '1', 10))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Таймзона</label>
                    <input
                        value={tz} onChange={e => setTz(e.target.value)} maxLength={64}
                        placeholder="Asia/Almaty"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                    {template.updated_at && `Обновлено: ${new Date(template.updated_at).toLocaleString('ru-RU')}`}
                </span>
                <Button variant="primary" onClick={save} disabled={saving} loading={saving} icon={<Save className="h-4 w-4" />}>
                    Сохранить
                </Button>
            </div>

            {/* QA trigger */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div>
                    <p className="text-sm font-semibold text-amber-900">QA: ручной триггер</p>
                    <p className="text-xs text-amber-700 mt-0.5">Пустой user_id → реальный broadcast. С user_id → точечный тест-пуш.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-amber-900 mb-1">user_id (UUID, опционально)</label>
                        <input
                            value={testUserId} onChange={e => setTestUserId(e.target.value)}
                            placeholder="оставь пустым для broadcast"
                            className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 bg-white rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-amber-900 mb-1">fake_streak</label>
                        <input
                            type="number" min={1} max={365} value={testStreak}
                            onChange={e => setTestStreak(parseInt(e.target.value || '5', 10))}
                            className="w-full px-3 py-1.5 text-sm border border-amber-300 bg-white rounded-md"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button variant="primary" onClick={trigger} disabled={triggering} loading={triggering} icon={<Play className="h-4 w-4" />}>
                        Отправить тест
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily notification config panel (inline)
// ─────────────────────────────────────────────────────────────────────────────

interface DailyConfigProps {
    template: DailyNotificationTemplate
    onSaved: (t: DailyNotificationTemplate) => void
}

const DailyConfigPanel: React.FC<DailyConfigProps> = ({ template, onSaved }) => {
    const [enabled, setEnabled] = useState(template.enabled)
    const [title, setTitle] = useState(template.title)
    const [body, setBody] = useState(template.body)
    const [hour, setHour] = useState(template.hour)
    const [minute, setMinute] = useState(template.minute)
    const [tz, setTz] = useState(template.timezone)
    const [saving, setSaving] = useState(false)
    const [triggering, setTriggering] = useState(false)

    const save = async () => {
        if (!title.trim() || !body.trim()) { toast.error('Заголовок и текст не могут быть пустыми'); return }
        setSaving(true)
        try {
            const updated = await dailyNotificationService.update({
                enabled, title: title.trim(), body: body.trim(),
                hour, minute, timezone: tz.trim() || 'Asia/Almaty',
            })
            onSaved(updated)
            toast.success('Настройки сохранены')
        } catch (e: any) {
            toast.error(`Ошибка: ${e?.response?.data?.detail || e.message}`)
        } finally { setSaving(false) }
    }

    const trigger = async () => {
        setTriggering(true)
        try {
            const r = await dailyNotificationService.trigger()
            if (r.skipped_disabled) toast('Пуш отключён (enabled=false или FCB disabled) — пропустил')
            else toast.success(`Доставлено ${r.delivered}/${r.requested}`)
        } catch (e: any) {
            toast.error(`Ошибка триггера: ${e?.response?.data?.detail || e.message}`)
        } finally { setTriggering(false) }
    }

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
                <div
                    onClick={() => setEnabled(v => !v)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Включить отправку</span>
            </label>

            {/* Title */}
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs font-medium text-gray-600">Заголовок</label>
                    <span className="text-xs text-gray-400 tabular-nums">{title.length}/200</span>
                </div>
                <input
                    value={title} onChange={e => setTitle(e.target.value)} maxLength={220}
                    placeholder="Новые ежедневные задания уже ждут тебя!"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {/* Body */}
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs font-medium text-gray-600">Текст</label>
                    <span className="text-xs text-gray-400 tabular-nums">{body.length}/500</span>
                </div>
                <textarea
                    value={body} onChange={e => setBody(e.target.value)} maxLength={520} rows={3}
                    placeholder="Открывай приложение AIMA и решай свежий тест!"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
            </div>

            {/* Timing */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Час (0–23)</label>
                    <input
                        type="number" min={0} max={23} value={hour}
                        onChange={e => setHour(parseInt(e.target.value || '9', 10))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Минута (0–59)</label>
                    <input
                        type="number" min={0} max={59} value={minute}
                        onChange={e => setMinute(parseInt(e.target.value || '0', 10))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Таймзона</label>
                    <input
                        value={tz} onChange={e => setTz(e.target.value)} maxLength={64}
                        placeholder="Asia/Almaty"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Save + trigger */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                    {template.updated_at && `Обновлено: ${new Date(template.updated_at).toLocaleString('ru-RU')}`}
                </span>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={trigger} disabled={triggering} loading={triggering} icon={<Play className="h-4 w-4" />}>
                        Тест-отправка
                    </Button>
                    <Button variant="primary" onClick={save} disabled={saving} loading={saving} icon={<Save className="h-4 w-4" />}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled card (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduledCardProps {
    icon: React.ReactNode
    title: string
    description: string
    badge: React.ReactNode
    meta?: string
    configHref?: string
    loading?: boolean
    error?: boolean
    children?: React.ReactNode
}

const ScheduledCard: React.FC<ScheduledCardProps> = ({
    icon, title, description, badge, meta, configHref, loading, error, children,
}) => {
    const [open, setOpen] = useState(false)

    return (
        <div className={`bg-white rounded-xl border shadow-sm transition-all ${open ? 'border-primary-200' : 'border-gray-200'}`}>
            {/* Header row — always visible */}
            <button
                type="button"
                onClick={() => !loading && !error && setOpen(v => !v)}
                className="w-full flex items-start gap-4 p-4 text-left"
            >
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5 flex-shrink-0 mt-0.5">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{title}</span>
                        {badge}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                    {meta && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {meta}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    {configHref && (
                        <Link
                            to={configHref}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </Link>
                    )}
                    {loading
                        ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        : error
                            ? <span className="text-xs text-red-500">ошибка</span>
                            : open
                                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                </div>
            </button>

            {/* Expandable config */}
            {open && !loading && !error && children && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export const PushNotifications: React.FC = () => {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [target, setTarget] = useState<PushTarget>('all')
    const [confirming, setConfirming] = useState(false)
    const [sending, setSending] = useState(false)
    const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)

    const [streakTemplate, setStreakTemplate] = useState<StreakPushTemplate | null>(null)
    const [streakLoading, setStreakLoading] = useState(true)
    const [streakError, setStreakError] = useState(false)

    const [dailyTemplate, setDailyTemplate] = useState<DailyNotificationTemplate | null>(null)
    const [dailyLoading, setDailyLoading] = useState(true)
    const [dailyError, setDailyError] = useState(false)

    const [firebaseEnabled, setFirebaseEnabled] = useState<boolean | null>(null)

    const [testSending, setTestSending] = useState(false)
    const [testResult, setTestResult] = useState<TestPushResult | null>(null)
    const [testPhones, setTestPhones] = useState<string[]>([])
    const [testPhonesLoading, setTestPhonesLoading] = useState(true)
    // Distinct from "confirmed empty" (real backend answer: no phones
    // configured) — a fetch failure shouldn't look/behave the same, and
    // must NOT permanently block a working send-test just because this
    // one GET hiccuped. See loadTestPhones() below (retryable).
    const [testPhonesError, setTestPhonesError] = useState(false)

    // ── Personal push by phone ────────────────────────────────────────────────
    const [personalPhone, setPersonalPhone] = useState('')
    const [personalTitle, setPersonalTitle] = useState('')
    const [personalBody, setPersonalBody] = useState('')
    const [personalSending, setPersonalSending] = useState(false)
    const [personalResult, setPersonalResult] = useState<{
        phone: string; user_found: boolean; tokens_found: number; sent: number; failed: number
    } | null>(null)

    const handlePersonalSend = async () => {
        const phone = personalPhone.trim()
        const ptitle = personalTitle.trim()
        const pbody = personalBody.trim()
        if (!phone) { toast.error('Введите номер телефона'); return }
        if (!ptitle) { toast.error('Введите заголовок'); return }
        if (!pbody) { toast.error('Введите текст'); return }
        setPersonalSending(true)
        setPersonalResult(null)
        try {
            const res = await pushService.sendToPhone(phone, ptitle, pbody)
            setPersonalResult(res)
            if (!res.user_found) toast.error('Пользователь не найден')
            else if (res.tokens_found === 0) toast.error('У пользователя нет устройств с push-токеном')
            else if (res.sent > 0) toast.success(`Пуш отправлен на ${res.sent} устройств`)
            else toast.error('Пуш не доставлен')
        } catch {
            toast.error('Ошибка при отправке')
        } finally {
            setPersonalSending(false)
        }
    }

    // Retryable on purpose: a transient GET failure must not permanently
    // disable "Отправить тест" (see review note — the button's disabled
    // state depends on testPhones, so a one-off network blip shouldn't
    // masquerade as "no test phones configured on the backend").
    const loadTestPhones = () => {
        setTestPhonesLoading(true)
        setTestPhonesError(false)
        pushService.getTestPhones()
            .then(r => setTestPhones(r.phones))
            .catch(() => setTestPhonesError(true))
            .finally(() => setTestPhonesLoading(false))
    }

    useEffect(() => {
        streakPushTemplateService.get()
            .then(t => { setStreakTemplate(t); setStreakError(false) })
            .catch(() => setStreakError(true))
            .finally(() => setStreakLoading(false))

        dailyNotificationService.get()
            .then(t => { setDailyTemplate(t); setDailyError(false) })
            .catch(() => setDailyError(true))
            .finally(() => setDailyLoading(false))

        dailyNotificationService.firebaseStatus()
            .then(s => setFirebaseEnabled(s.enabled))
            .catch(() => setFirebaseEnabled(false))

        loadTestPhones()
    }, [])

    const titleTrimmed = title.trim()
    const bodyTrimmed = body.trim()
    const titleError = titleTrimmed.length === 0 ? 'Введите заголовок'
        : titleTrimmed.length > TITLE_MAX ? `Максимум ${TITLE_MAX} символов` : null
    const bodyError = bodyTrimmed.length === 0 ? 'Введите текст'
        : bodyTrimmed.length > BODY_MAX ? `Максимум ${BODY_MAX} символов` : null
    const canSubmit = !titleError && !bodyError && !sending

    const titleRemaining = TITLE_MAX - titleTrimmed.length
    const bodyRemaining = BODY_MAX - bodyTrimmed.length

    const handleSend = async () => {
        if (!canSubmit) return
        setSending(true)
        try {
            const result = await pushService.send(titleTrimmed, bodyTrimmed, target)
            const entry: HistoryEntry = { timestamp: new Date().toISOString(), title: titleTrimmed, body: bodyTrimmed, target, result }
            const next = [entry, ...history].slice(0, HISTORY_LIMIT)
            setHistory(next)
            saveHistory(next)
            if (result.delivered > 0) toast.success(`Доставлено ${result.delivered} из ${result.matched_tokens}`, { duration: 5000 })
            else if (result.matched_tokens === 0) toast.error('В целевой аудитории нет устройств', { duration: 5000 })
            else toast.error(`Не доставлено ни одного push (${result.failed} ошибок)`, { duration: 5000 })
            setTitle('')
            setBody('')
            setConfirming(false)
        } catch (err: any) {
            toast.error(`Ошибка: ${err?.response?.data?.detail || err?.message || 'Неизвестная ошибка'}`, { duration: 6000 })
            setConfirming(false)
        } finally {
            setSending(false)
        }
    }

    const handleTestSend = async () => {
        if (!canSubmit) { toast.error('Сначала заполните заголовок и текст'); return }
        setTestSending(true)
        setTestResult(null)
        try {
            const result = await pushService.sendTest(titleTrimmed, bodyTrimmed)
            setTestResult(result)
            if (result.total_sent > 0) toast.success(`Тест-пуш доставлен на ${result.total_sent} устройств`)
            else toast.error('Тест-пуш не доставлен — проверьте что приложение установлено на тестовых телефонах')
        } catch (err: any) {
            toast.error(`Ошибка: ${err?.response?.data?.detail || err?.message || 'Неизвестная ошибка'}`)
        } finally {
            setTestSending(false)
        }
    }

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 text-primary-700 p-2.5">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Push-уведомления</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Ручная рассылка и управление автоматическими пушами</p>
                </div>
            </div>

            {/* Firebase disabled banner */}
            {firebaseEnabled === false && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <WifiOff className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Firebase Cloud Messaging отключён</p>
                        <p className="text-xs text-red-700 mt-0.5">
                            Пуши не доставляются. Чтобы включить: добавьте <code className="bg-red-100 px-1 rounded">firebase_credentials.json</code> в Railway Volume
                            и установите <code className="bg-red-100 px-1 rounded">firebase__enabled=true</code> в переменных окружения.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Scheduled ── */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0.5">
                    Автоматические пуши
                </h3>

                {/* Streak */}
                <ScheduledCard
                    icon={<Flame className="h-5 w-5 text-orange-500" />}
                    title="Напоминание о стрике"
                    description="Шлёт всем у кого активный стрик ≥ 1 и не клеймили сегодня. Подставляет {streak} каждому персонально."
                    badge={streakTemplate ? <StatusBadge enabled={streakTemplate.enabled} /> : null}
                    meta={streakTemplate ? `Ежедневно в ${streakFireTime(streakTemplate)}` : undefined}
                    configHref="/streak-push"
                    loading={streakLoading}
                    error={streakError}
                >
                    {streakTemplate && (
                        <StreakConfigPanel
                            template={streakTemplate}
                            onSaved={setStreakTemplate}
                        />
                    )}
                </ScheduledCard>

                {/* Daily */}
                <ScheduledCard
                    icon={<Clock className="h-5 w-5 text-blue-500" />}
                    title="Ежедневное уведомление"
                    description="Напоминание о новых заданиях. Шлётся всем зарегистрированным устройствам автоматически."
                    badge={dailyTemplate ? <StatusBadge enabled={dailyTemplate.enabled} /> : null}
                    meta={dailyTemplate ? `Ежедневно в ${fireTime(dailyTemplate.hour, dailyTemplate.minute, dailyTemplate.timezone)}` : undefined}
                    loading={dailyLoading}
                    error={dailyError}
                >
                    {dailyTemplate && (
                        <DailyConfigPanel
                            template={dailyTemplate}
                            onSaved={setDailyTemplate}
                        />
                    )}
                </ScheduledCard>
            </div>

            {/* ── Test push section ── */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0.5">
                    Тестовая отправка
                </h3>
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-50 text-amber-600 p-2 flex-shrink-0">
                            <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Проверить перед рассылкой</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Отправляет пуш только на тестовые телефоны (ваш + ревьюеры). Используйте тот же заголовок и текст что ниже — проверьте как выглядит уведомление перед broadcast.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {testPhonesLoading ? (
                                <span className="text-xs text-gray-400">Загрузка номеров…</span>
                            ) : testPhonesError ? (
                                <>
                                    <span className="text-xs text-red-500">
                                        Не удалось загрузить список тестовых номеров (ошибка сети/сервера)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={loadTestPhones}
                                        className="text-xs font-medium text-blue-600 hover:underline"
                                    >
                                        Повторить
                                    </button>
                                </>
                            ) : testPhones.length === 0 ? (
                                <span className="text-xs text-amber-600">
                                    Тестовые номера не настроены на бэкенде (REVIEWER_TEST_PHONE / DEV_RATE_LIMIT_BYPASS_PHONES)
                                </span>
                            ) : (
                                testPhones.map(phone => (
                                    <span key={phone} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full px-2.5 py-1">
                                        <Smartphone className="h-3 w-3 text-gray-400" />
                                        {phone}
                                    </span>
                                ))
                            )}
                        </div>
                        <Button
                            variant="secondary"
                            onClick={handleTestSend}
                            disabled={
                                testSending ||
                                !canSubmit ||
                                testPhonesLoading ||
                                // A failed GET is NOT proof of "nothing configured" — don't
                                // block the button on it, let the real POST /send-test call
                                // (and its own 400 guard) be the source of truth instead.
                                (!testPhonesError && testPhones.length === 0)
                            }
                            loading={testSending}
                            icon={<Send className="h-4 w-4" />}
                        >
                            Отправить тест
                        </Button>
                    </div>

                    {testResult && (
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-left">
                                        <th className="px-3 py-2 font-medium">Телефон</th>
                                        <th className="px-3 py-2 font-medium text-center">Польз.</th>
                                        <th className="px-3 py-2 font-medium text-center">Устройств</th>
                                        <th className="px-3 py-2 font-medium text-center">Доставлено</th>
                                        <th className="px-3 py-2 font-medium text-center">Ошибок</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {testResult.phones.map((r: TestPushPhoneResult) => (
                                        <tr key={r.phone} className="bg-white">
                                            <td className="px-3 py-2 font-mono text-gray-700">{r.phone}</td>
                                            <td className="px-3 py-2 text-center">
                                                {r.user_found
                                                    ? <CheckCircle className="h-3.5 w-3.5 text-green-500 inline" />
                                                    : <XCircle className="h-3.5 w-3.5 text-red-400 inline" />
                                                }
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-600">{r.tokens_found}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={r.sent > 0 ? 'text-green-700 font-semibold' : 'text-gray-400'}>{r.sent}</span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={r.failed > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{r.failed}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 font-semibold text-gray-700">
                                        <td className="px-3 py-2" colSpan={3}>Итого</td>
                                        <td className="px-3 py-2 text-center text-green-700">{testResult.total_sent}</td>
                                        <td className="px-3 py-2 text-center text-red-600">{testResult.total_failed}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Broadcast form ── */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0.5">
                    Ручная рассылка
                </h3>

                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                    {/* Target */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Аудитория</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(['all', 'pro', 'ios'] as PushTarget[]).map(t => {
                                const Icon = TARGET_ICONS[t]
                                const active = target === t
                                return (
                                    <button
                                        key={t} type="button" onClick={() => setTarget(t)}
                                        className={`text-left p-4 rounded-xl border-2 transition-colors ${active ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon className={`h-4 w-4 ${active ? 'text-primary-700' : 'text-gray-500'}`} />
                                            <span className={`text-sm font-semibold ${active ? 'text-primary-900' : 'text-gray-900'}`}>{TARGET_LABELS[t]}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-snug">{TARGET_DESCRIPTIONS[t]}</p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <label className="text-sm font-medium text-gray-700">Заголовок</label>
                            <span className={`text-xs tabular-nums ${titleRemaining < 0 ? 'text-red-600 font-medium' : titleRemaining <= 20 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {titleRemaining < 0 ? `+${-titleRemaining} лишних` : `ещё ${titleRemaining}`}
                            </span>
                        </div>
                        <input
                            type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={TITLE_MAX + 20}
                            placeholder="Например: Новый тренажёр уже в приложении!"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                        {titleError && title.length > 0 && <p className="text-xs text-red-600 mt-1">{titleError}</p>}
                    </div>

                    {/* Body */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <label className="text-sm font-medium text-gray-700">Текст уведомления</label>
                            <span className={`text-xs tabular-nums ${bodyRemaining < 0 ? 'text-red-600 font-medium' : bodyRemaining <= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {bodyRemaining < 0 ? `+${-bodyRemaining} лишних` : `ещё ${bodyRemaining}`}
                            </span>
                        </div>
                        <textarea
                            value={body} onChange={e => setBody(e.target.value)} maxLength={BODY_MAX + 50} rows={4}
                            placeholder="Например: Попробуй новый тренажёр по математике. Решай задачи и набирай очки!"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
                        />
                        {bodyError && body.length > 0 && <p className="text-xs text-red-600 mt-1">{bodyError}</p>}
                    </div>

                    {/* Preview */}
                    {titleTrimmed && bodyTrimmed && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Превью</span>
                            <div className="mt-2 bg-white rounded-xl p-3 shadow-sm border border-gray-100 max-w-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                                        <Bell className="h-4 w-4 text-primary-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AIMA</span>
                                            <span className="text-xs text-gray-400 flex-shrink-0">сейчас</span>
                                        </div>
                                        <div className="font-semibold text-sm text-gray-900 mt-0.5">{titleTrimmed}</div>
                                        <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">{bodyTrimmed}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <Button variant="primary" disabled={!canSubmit} onClick={() => setConfirming(true)} icon={<Send className="h-4 w-4" />}>
                            Отправить
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Confirm modal ── */}
            <AlertModal
                isOpen={confirming}
                onClose={() => setConfirming(false)}
                icon="caution"
                title="Проверьте перед отправкой"
                message={`Уведомление уйдёт ${TARGET_LABELS[target].toLowerCase()} — отменить нельзя. Если что-то не понятно, лучше не отправляйте и уточните у главного администратора.`}
                onConfirm={handleSend}
                confirmText={sending ? 'Отправка…' : 'Отправить'}
                cancelText="Отмена"
                isLoading={sending}
            >
                <div className="bg-gray-50 rounded-xl p-3 text-[13px] border border-gray-100">
                    <div className="font-semibold text-gray-900 mb-0.5">{titleTrimmed}</div>
                    <div className="text-gray-600">{bodyTrimmed}</div>
                </div>
            </AlertModal>

            {/* ── Personal push by phone ── */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0.5">
                    Личная отправка по номеру
                </h3>
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефона</label>
                        <input
                            type="tel" value={personalPhone}
                            onChange={e => setPersonalPhone(e.target.value)}
                            placeholder="+77001234567"
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
                            <input
                                type="text" value={personalTitle}
                                onChange={e => setPersonalTitle(e.target.value)} maxLength={100}
                                placeholder="Заголовок уведомления"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Текст</label>
                            <input
                                type="text" value={personalBody}
                                onChange={e => setPersonalBody(e.target.value)} maxLength={500}
                                placeholder="Текст уведомления"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            onClick={handlePersonalSend}
                            disabled={personalSending}
                            loading={personalSending}
                            icon={<Send className="h-4 w-4" />}
                        >
                            Отправить
                        </Button>
                        {personalResult && (
                            <div className={`text-sm rounded-lg px-3 py-2 border ${
                                !personalResult.user_found ? 'bg-red-50 border-red-200 text-red-700'
                                : personalResult.sent > 0 ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                                {!personalResult.user_found
                                    ? `Пользователь ${personalResult.phone} не найден`
                                    : personalResult.tokens_found === 0
                                        ? 'Нет устройств с push-токеном'
                                        : `Доставлено: ${personalResult.sent} / ${personalResult.tokens_found} устройств`
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── History ── */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">История ручных отправок</h3>
                    <span className="text-xs text-gray-400 ml-auto">{history.length > 0 ? `${history.length} из ${HISTORY_LIMIT}` : 'Пусто'}</span>
                </div>
                {history.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                        <Bell className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                        Здесь будут отображаться отправленные push'ы
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((h, i) => {
                            const Icon = TARGET_ICONS[h.target] ?? Bell
                            const when = new Date(h.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                            const rate = h.result.matched_tokens > 0 ? Math.round((h.result.delivered / h.result.matched_tokens) * 100) : 0
                            const allOk = h.result.failed === 0
                            return (
                                <div key={`${h.timestamp}-${i}`} className="rounded-xl border border-gray-100 p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                                    <div className={`rounded-lg p-2 flex-shrink-0 ${allOk ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="font-semibold text-sm text-gray-900 truncate">{h.title}</div>
                                            <span className="text-xs text-gray-400 flex-shrink-0">{when}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{h.body}</div>
                                        <div className="text-xs mt-1.5 flex items-center gap-2 flex-wrap">
                                            <span className="text-gray-500">{TARGET_LABELS[h.target]}</span>
                                            <span className="text-gray-300">·</span>
                                            <span className={allOk ? 'text-green-600' : 'text-amber-600'}>
                                                {h.result.delivered}/{h.result.matched_tokens} доставлено ({rate}%)
                                            </span>
                                            {h.result.removed_tokens > 0 && (
                                                <><span className="text-gray-300">·</span><span className="text-gray-400">−{h.result.removed_tokens} токенов удалено</span></>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

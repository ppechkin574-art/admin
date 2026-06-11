import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Bell, Send, Users, Crown, Smartphone, History, AlertTriangle,
    Clock, Flame, Settings, CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/common/Button'
import {
    pushService,
    streakPushTemplateService,
    type PushTarget,
    type PushSendResult,
    type StreakPushTemplate,
} from '@/services/api'

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
    } catch {
        // Ignore quota errors — history is non-essential
    }
}

/** "16:00" from hours_before_reset=8 */
const streakFireTime = (t: StreakPushTemplate): string => {
    const h = (24 - t.hours_before_reset) % 24
    return `${String(h).padStart(2, '0')}:00 ${t.timezone}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled push status card
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduledCardProps {
    icon: React.ReactNode
    title: string
    description: string
    badge: React.ReactNode
    meta?: string
    configHref?: string
    onToggle?: (enabled: boolean) => void
    enabled?: boolean
    toggling?: boolean
}

const ScheduledCard: React.FC<ScheduledCardProps> = ({
    icon, title, description, badge, meta, configHref, onToggle, enabled, toggling,
}) => (
    <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
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
                    <Clock className="h-3 w-3" />
                    {meta}
                </p>
            )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {onToggle !== undefined && enabled !== undefined && (
                <button
                    type="button"
                    onClick={() => !toggling && onToggle(!enabled)}
                    title={enabled ? 'Отключить' : 'Включить'}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                        enabled ? 'bg-green-500' : 'bg-gray-300'
                    } ${toggling ? 'opacity-60 cursor-wait' : ''}`}
                >
                    <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                </button>
            )}
            {configHref && (
                <Link
                    to={configHref}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Настроить
                </Link>
            )}
        </div>
    </div>
)

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

    // Scheduled: streak reminder template
    const [streakTemplate, setStreakTemplate] = useState<StreakPushTemplate | null>(null)
    const [streakLoading, setStreakLoading] = useState(true)
    const [streakToggling, setStreakToggling] = useState(false)

    useEffect(() => {
        streakPushTemplateService.get()
            .then(setStreakTemplate)
            .catch(() => {}) // non-critical, don't break the page
            .finally(() => setStreakLoading(false))
    }, [])

    const toggleStreak = async (enabled: boolean) => {
        if (!streakTemplate) return
        setStreakToggling(true)
        try {
            const updated = await streakPushTemplateService.update({ enabled })
            setStreakTemplate(updated)
            toast.success(enabled ? 'Streak-пуш включён' : 'Streak-пуш отключён')
        } catch {
            toast.error('Не удалось изменить статус')
        } finally {
            setStreakToggling(false)
        }
    }

    const titleTrimmed = title.trim()
    const bodyTrimmed = body.trim()
    const titleError =
        titleTrimmed.length === 0
            ? 'Введите заголовок'
            : titleTrimmed.length > TITLE_MAX
                ? `Максимум ${TITLE_MAX} символов`
                : null
    const bodyError =
        bodyTrimmed.length === 0
            ? 'Введите текст уведомления'
            : bodyTrimmed.length > BODY_MAX
                ? `Максимум ${BODY_MAX} символов`
                : null
    const canSubmit = !titleError && !bodyError && !sending

    const handleSend = async () => {
        if (!canSubmit) return
        setSending(true)
        try {
            const result = await pushService.send(titleTrimmed, bodyTrimmed, target)
            const entry: HistoryEntry = {
                timestamp: new Date().toISOString(),
                title: titleTrimmed,
                body: bodyTrimmed,
                target,
                result,
            }
            const next = [entry, ...history].slice(0, HISTORY_LIMIT)
            setHistory(next)
            saveHistory(next)

            if (result.delivered > 0) {
                toast.success(`Доставлено ${result.delivered} из ${result.matched_tokens}`, { duration: 5000 })
            } else if (result.matched_tokens === 0) {
                toast.error('В целевой аудитории нет устройств', { duration: 5000 })
            } else {
                toast.error(`Не доставлено ни одного push (${result.failed} ошибок)`, { duration: 5000 })
            }

            setTitle('')
            setBody('')
            setConfirming(false)
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message || 'Неизвестная ошибка'
            toast.error(`Ошибка отправки: ${detail}`, { duration: 6000 })
            setConfirming(false) // close modal so user can retry or edit
        } finally {
            setSending(false)
        }
    }

    const titleRemaining = TITLE_MAX - titleTrimmed.length
    const bodyRemaining = BODY_MAX - bodyTrimmed.length

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 text-primary-700 p-2.5">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Push-уведомления</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Ручная рассылка и управление автоматическими пушами
                    </p>
                </div>
            </div>

            {/* ── Scheduled pushes ── */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Автоматические пуши
                </h3>

                {/* Streak reminder */}
                {streakLoading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Загрузка шаблона…
                    </div>
                ) : streakTemplate ? (
                    <ScheduledCard
                        icon={<Flame className="h-5 w-5 text-orange-500" />}
                        title="Напоминание о стрике"
                        description={`Шлёт всем у кого активный стрик ≥ 1 и не клеймили сегодня. Подставляет {streak} каждому персонально.`}
                        badge={
                            streakTemplate.enabled
                                ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                    <CheckCircle className="h-3 w-3" /> Активен
                                  </span>
                                : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                                    <XCircle className="h-3 w-3" /> Отключён
                                  </span>
                        }
                        meta={`Ежедневно в ${streakFireTime(streakTemplate)}`}
                        configHref="/streak-push"
                        onToggle={toggleStreak}
                        enabled={streakTemplate.enabled}
                        toggling={streakToggling}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-400">
                        Не удалось загрузить шаблон streak-пуша
                    </div>
                )}

                {/* Daily notification — hardcoded, no admin config yet */}
                <ScheduledCard
                    icon={<Clock className="h-5 w-5 text-blue-500" />}
                    title="Ежедневное уведомление"
                    description="Напоминание о новых заданиях. Шлётся всем зарегистрированным устройствам автоматически."
                    badge={
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <CheckCircle className="h-3 w-3" /> Активен
                        </span>
                    }
                    meta="Ежедневно в 09:00 Asia/Almaty"
                />
            </div>

            {/* ── Broadcast form ── */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Ручная рассылка
                </h3>

                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">

                    {/* Target picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Аудитория
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(['all', 'pro', 'ios'] as PushTarget[]).map(t => {
                                const Icon = TARGET_ICONS[t]
                                const active = target === t
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTarget(t)}
                                        className={`text-left p-4 rounded-xl border-2 transition-colors ${
                                            active
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon className={`h-4 w-4 ${active ? 'text-primary-700' : 'text-gray-500'}`} />
                                            <span className={`text-sm font-semibold ${active ? 'text-primary-900' : 'text-gray-900'}`}>
                                                {TARGET_LABELS[t]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-snug">
                                            {TARGET_DESCRIPTIONS[t]}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Заголовок
                            </label>
                            <span className={`text-xs tabular-nums ${titleRemaining < 0 ? 'text-red-600 font-medium' : titleRemaining <= 20 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {titleRemaining < 0 ? `+${-titleRemaining} лишних` : `ещё ${titleRemaining}`}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={TITLE_MAX + 20}
                            placeholder="Например: Новый тренажёр уже в приложении!"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                        {titleError && title.length > 0 && (
                            <p className="text-xs text-red-600 mt-1">{titleError}</p>
                        )}
                    </div>

                    {/* Body */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Текст уведомления
                            </label>
                            <span className={`text-xs tabular-nums ${bodyRemaining < 0 ? 'text-red-600 font-medium' : bodyRemaining <= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {bodyRemaining < 0 ? `+${-bodyRemaining} лишних` : `ещё ${bodyRemaining}`}
                            </span>
                        </div>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            maxLength={BODY_MAX + 50}
                            rows={4}
                            placeholder="Например: Попробуй новый тренажёр по математике. Решай задачи и набирай очки!"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                        />
                        {bodyError && body.length > 0 && (
                            <p className="text-xs text-red-600 mt-1">{bodyError}</p>
                        )}
                    </div>

                    {/* Preview */}
                    {titleTrimmed && bodyTrimmed && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                                Превью уведомления
                            </span>
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
                                        <div className="font-semibold text-sm text-gray-900 mt-0.5 leading-snug">
                                            {titleTrimmed}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-0.5 line-clamp-2 leading-snug">
                                            {bodyTrimmed}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <Button
                            variant="primary"
                            disabled={!canSubmit}
                            onClick={() => setConfirming(true)}
                            icon={<Send className="h-4 w-4" />}
                        >
                            Отправить
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Confirm modal ── */}
            {confirming && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-full bg-orange-100 text-orange-700 p-2.5">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Подтвердить отправку
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Push будет отправлен <strong>{TARGET_LABELS[target].toLowerCase()}</strong>.{' '}
                            Действие необратимо.
                        </p>
                        <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm border border-gray-100">
                            <div className="font-semibold text-gray-900 mb-1">{titleTrimmed}</div>
                            <div className="text-gray-600 leading-relaxed">{bodyTrimmed}</div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setConfirming(false)}
                                disabled={sending}
                            >
                                Отмена
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSend}
                                disabled={sending}
                                loading={sending}
                                icon={<Send className="h-4 w-4" />}
                            >
                                {sending ? 'Отправка…' : 'Отправить'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── History ── */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">
                        История ручных отправок
                    </h3>
                    <span className="text-xs text-gray-400 ml-auto">
                        {history.length > 0 ? `${history.length} из ${HISTORY_LIMIT}` : 'Пусто'}
                    </span>
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
                            const when = new Date(h.timestamp).toLocaleString('ru-RU', {
                                day: '2-digit', month: '2-digit', year: '2-digit',
                                hour: '2-digit', minute: '2-digit',
                            })
                            const rate = h.result.matched_tokens > 0
                                ? Math.round((h.result.delivered / h.result.matched_tokens) * 100)
                                : 0
                            const allOk = h.result.failed === 0
                            return (
                                <div
                                    key={`${h.timestamp}-${i}`}
                                    className="rounded-xl border border-gray-100 p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                                >
                                    <div className={`rounded-lg p-2 flex-shrink-0 ${allOk ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="font-semibold text-sm text-gray-900 truncate">
                                                {h.title}
                                            </div>
                                            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                                                {when}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                            {h.body}
                                        </div>
                                        <div className="text-xs mt-1.5 flex items-center gap-2 flex-wrap">
                                            <span className="text-gray-500">{TARGET_LABELS[h.target]}</span>
                                            <span className="text-gray-300">·</span>
                                            <span className={allOk ? 'text-green-600' : 'text-amber-600'}>
                                                {h.result.delivered}/{h.result.matched_tokens} доставлено ({rate}%)
                                            </span>
                                            {h.result.removed_tokens > 0 && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-gray-400">
                                                        −{h.result.removed_tokens} токенов удалено
                                                    </span>
                                                </>
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

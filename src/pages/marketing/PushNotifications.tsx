import React, { useState } from 'react'
import { Bell, Send, Users, Crown, Smartphone, History, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/common/Button'
import { pushService, type PushTarget, type PushSendResult } from '@/services/api'

// Push-уведомления admin page.
//
// Sends a broadcast push to a filtered slice of the user base via
// the backend's POST /admin/notifications/send endpoint
// (aima-backend@5216971). Three target slices are exposed:
//   all → every registered FCM token
//   pro → users on PRO plan (resolved server-side via Keycloak)
//   ios → devices with platform=ios
//
// The page is deliberately conservative on the destructive side:
// the operator has to confirm a modal before the request actually
// goes out, since a broadcast push is irreversible once delivered.
// Recent-history is kept in localStorage (last 10) so the operator
// can see what they sent, even if the backend doesn't persist a
// log table yet. When the backend grows a /admin/notifications/log
// endpoint, this can switch to fetching from there instead.

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
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(entries.slice(0, HISTORY_LIMIT))
        )
    } catch {
        // Ignore quota errors — history is non-essential nice-to-have
    }
}

export const PushNotifications: React.FC = () => {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [target, setTarget] = useState<PushTarget>('all')
    const [confirming, setConfirming] = useState(false)
    const [sending, setSending] = useState(false)
    const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)

    // Mirror the backend Pydantic constraints so the UI surfaces
    // the limit before the request bounces with a 422. The submit
    // button stays disabled until validation passes.
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

            // Detailed toast — let the operator see whether the push
            // actually reached anyone vs returned matched=0
            if (result.delivered > 0) {
                toast.success(
                    `Доставлено ${result.delivered} из ${result.matched_tokens}`,
                    { duration: 5000 }
                )
            } else if (result.matched_tokens === 0) {
                toast.error('В целевой аудитории нет устройств', { duration: 5000 })
            } else {
                toast.error(
                    `Не доставлено ни одного push (${result.failed} ошибок)`,
                    { duration: 5000 }
                )
            }

            // Clear form on success so the next send is fresh
            setTitle('')
            setBody('')
            setConfirming(false)
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message || 'Неизвестная ошибка'
            toast.error(`Ошибка отправки: ${detail}`, { duration: 6000 })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 text-primary-700 p-2.5">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Push-уведомления</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Отправка маркетинговых уведомлений выбранной аудитории
                    </p>
                </div>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
                {/* Target picker — radio cards */}
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
                                        <Icon
                                            className={`h-4 w-4 ${
                                                active ? 'text-primary-700' : 'text-gray-500'
                                            }`}
                                        />
                                        <span
                                            className={`text-sm font-semibold ${
                                                active ? 'text-primary-900' : 'text-gray-900'
                                            }`}
                                        >
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

                {/* Title field */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Заголовок
                        </label>
                        <span
                            className={`text-xs tabular-nums ${
                                titleTrimmed.length > TITLE_MAX ? 'text-red-600' : 'text-gray-400'
                            }`}
                        >
                            {titleTrimmed.length}/{TITLE_MAX}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={TITLE_MAX + 20} // soft cap; let user paste-and-trim
                        placeholder="Например: Новый тренажёр уже в приложении!"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {titleError && title.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">{titleError}</p>
                    )}
                </div>

                {/* Body field */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Текст уведомления
                        </label>
                        <span
                            className={`text-xs tabular-nums ${
                                bodyTrimmed.length > BODY_MAX ? 'text-red-600' : 'text-gray-400'
                            }`}
                        >
                            {bodyTrimmed.length}/{BODY_MAX}
                        </span>
                    </div>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        maxLength={BODY_MAX + 50}
                        rows={4}
                        placeholder="Например: Попробуй новый тренажёр по математике. Решай задачи и набирай очки!"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                    {bodyError && body.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">{bodyError}</p>
                    )}
                </div>

                {/* Preview — show what the user will see */}
                {titleTrimmed && bodyTrimmed && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                            Превью
                        </span>
                        <div className="mt-2 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                                    <Bell className="h-5 w-5 text-primary-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-gray-900 truncate">
                                        {titleTrimmed}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                        {bodyTrimmed}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">сейчас</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit row */}
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

            {/* Confirmation modal — broadcast push is irreversible */}
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
                            Push будет отправлен <strong>{TARGET_LABELS[target].toLowerCase()}</strong>.
                            Действие необратимо.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
                            <div className="font-semibold text-gray-900">{titleTrimmed}</div>
                            <div className="text-gray-600 mt-1">{bodyTrimmed}</div>
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
                                Отправить
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* History panel */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Последние отправки
                    </h3>
                    <span className="text-xs text-gray-400 ml-auto">
                        Хранится локально, до {HISTORY_LIMIT} записей
                    </span>
                </div>
                {history.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                        Здесь будут отображаться отправленные push'ы.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((h, i) => {
                            const Icon = TARGET_ICONS[h.target]
                            const when = new Date(h.timestamp).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            return (
                                <div
                                    key={i}
                                    className="border border-gray-100 rounded-lg p-3 flex items-start gap-3"
                                >
                                    <div className="rounded-lg bg-gray-100 text-gray-700 p-2 flex-shrink-0">
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
                                        <div className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                                            {h.body}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1.5 flex gap-3">
                                            <span>{TARGET_LABELS[h.target]}</span>
                                            <span className="text-gray-400">·</span>
                                            <span>Доставлено {h.result.delivered}/{h.result.matched_tokens}</span>
                                            {h.result.failed > 0 && (
                                                <>
                                                    <span className="text-gray-400">·</span>
                                                    <span className="text-red-600">
                                                        Ошибок: {h.result.failed}
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

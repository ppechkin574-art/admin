import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
    Save, Plus, Trash2, RefreshCw, Crown, Users as UsersIcon,
    Scale, Wallet, Search, Phone,
} from 'lucide-react'
import {
    leaderboardPointsService,
    sprintService,
    userService,
    type SprintCurrent,
    type SprintHistoryEntry,
    type SprintParticipant,
    type SprintResolution,
} from '@/services/api'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import ConfirmModal from '@/components/common/ConfirmModal'

/**
 * CRM #19 — «Логика всего блока: Еженедельный спринт».
 *
 * Owns everything sprint-specific in one screen:
 *  - the card copy (RU/KK), prize and optional early-win threshold,
 *  - the participant allowlist (entry is paid outside the app, the admin
 *    adds payers here — an EMPTY list means nobody competes),
 *  - the current week: live standings and any locked-in winner,
 *  - past weeks, including splitting a tied prize.
 *
 * The auto-reset cadence deliberately stays on the Пользователи page; both
 * screens PATCH the same settings row, so each sends only its own fields
 * (see `leaderboardPointsService.updateSettings`).
 */

// Kazakhstani mobile numbers: +7 7XX XXX XX XX.
const KZ_PHONE_RE = /^\+7\d{10}$/

/** Mirrors the backend's `normalize_phone` — the allowlist is keyed on this
 * string, so a formatting difference would create a second entry for the
 * same person. */
function normalizePhone(raw: string): string {
    const d = (raw || '').replace(/[^\d+]/g, '')
    if (d.startsWith('8') && d.length === 11) return `+7${d.slice(1)}`
    if (d.startsWith('7') && d.length === 11) return `+${d}`
    if (d.length === 10 && !d.startsWith('+')) return `+7${d}`
    return d
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    } catch { return '—' }
}

function weekLabel(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('ru-RU', {
            day: '2-digit', month: 'long', year: 'numeric',
        })
    } catch { return iso }
}

const RESOLUTION_META: Record<SprintResolution, { label: string; badge: 'success' | 'warning' | 'info' | 'secondary' }> = {
    threshold: { label: 'Досрочная победа', badge: 'success' },
    closest: { label: 'Лучший за неделю', badge: 'info' },
    tie_pending: { label: 'Ничья — не разрешена', badge: 'warning' },
    tie_split: { label: 'Ничья — приз разделён', badge: 'secondary' },
}

const formatPrize = (amount: number | null): string =>
    amount == null ? '—' : `${amount.toLocaleString('ru-RU')} ₸`

/** Empty string / 0 both mean "off" — send null so the backend clears it. */
const toNullableInt = (raw: string): number | null => {
    const n = parseInt(raw, 10)
    return isNaN(n) || n <= 0 ? null : n
}

export default function SprintSettings() {
    // ── settings: card copy, prize, threshold ────────────────────────────
    const [titleRu, setTitleRu] = useState('')
    const [titleKk, setTitleKk] = useState('')
    const [prizeInput, setPrizeInput] = useState('')
    const [targetInput, setTargetInput] = useState('')
    const [accessUrlInput, setAccessUrlInput] = useState('')
    const [perAnswerInput, setPerAnswerInput] = useState('')
    const [settingsSaving, setSettingsSaving] = useState(false)

    const loadSettings = useCallback(async () => {
        try {
            const s = await leaderboardPointsService.getSettings()
            setTitleRu(s.sprint_title_ru ?? '')
            setTitleKk(s.sprint_title_kk ?? '')
            setPrizeInput(s.sprint_prize_amount ? String(s.sprint_prize_amount) : '')
            setTargetInput(s.sprint_target_points ? String(s.sprint_target_points) : '')
            setAccessUrlInput(s.sprint_access_url ?? '')
            setPerAnswerInput(s.sprint_points_per_answer ? String(s.sprint_points_per_answer) : '')
        } catch {
            toast.error('Не удалось загрузить настройки спринта')
        }
    }, [])

    const handleSaveSettings = async () => {
        for (const [raw, label] of [[targetInput, 'Порог баллов'], [prizeInput, 'Приз']] as const) {
            const n = parseInt(raw, 10)
            if (raw.trim() !== '' && (isNaN(n) || n < 0)) {
                toast.error(`${label}: введите неотрицательное число`); return
            }
        }
        setSettingsSaving(true)
        try {
            // Only this page's fields — the Пользователи page owns the rest.
            const s = await leaderboardPointsService.updateSettings({
                sprint_title_ru: titleRu.trim() || null,
                sprint_title_kk: titleKk.trim() || null,
                sprint_prize_amount: toNullableInt(prizeInput),
                sprint_target_points: toNullableInt(targetInput),
                sprint_access_url: accessUrlInput.trim() || null,
                sprint_points_per_answer: toNullableInt(perAnswerInput),
            })
            setTitleRu(s.sprint_title_ru ?? '')
            setTitleKk(s.sprint_title_kk ?? '')
            setPrizeInput(s.sprint_prize_amount ? String(s.sprint_prize_amount) : '')
            setTargetInput(s.sprint_target_points ? String(s.sprint_target_points) : '')
            setAccessUrlInput(s.sprint_access_url ?? '')
            setPerAnswerInput(s.sprint_points_per_answer ? String(s.sprint_points_per_answer) : '')
            toast.success('Настройки спринта сохранены')
            loadCurrent()
        } catch {
            toast.error('Ошибка сохранения настроек спринта')
        } finally {
            setSettingsSaving(false)
        }
    }

    // ── participants ─────────────────────────────────────────────────────
    const [participants, setParticipants] = useState<SprintParticipant[]>([])
    const [participantsLoading, setParticipantsLoading] = useState(true)
    const [newPhone, setNewPhone] = useState('')
    const [adding, setAdding] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SprintParticipant | null>(null)
    const [deleting, setDeleting] = useState(false)

    // user search — the safer of the two add paths: no typos, and the admin
    // sees who they are letting in before committing.
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string; label: string; phone: string }[]>([])
    const [searching, setSearching] = useState(false)

    const loadParticipants = useCallback(async () => {
        setParticipantsLoading(true)
        try {
            setParticipants(await sprintService.listParticipants())
        } catch {
            toast.error('Не удалось загрузить список участников')
        } finally {
            setParticipantsLoading(false)
        }
    }, [])

    const runSearch = async () => {
        const q = searchQuery.trim()
        if (q.length < 2) { toast.error('Введите минимум 2 символа'); return }
        setSearching(true)
        try {
            // GET /admin/users returns a plain array; `phone` is what the
            // allowlist is keyed on, so users without one can't be added
            // through this path (the manual-number field covers them).
            const res: any[] = await userService.getAll({ search: q })
            const list = res.slice(0, 8).map(u => ({
                id: String(u.id),
                label: u.name || u.username || u.email || String(u.id),
                phone: u.phone || u.username || '',
            }))
            setSearchResults(list)
            if (!list.length) toast('Никого не нашлось', { icon: '🔍' })
        } catch {
            toast.error('Поиск не удался')
        } finally {
            setSearching(false)
        }
    }

    const addParticipant = async (phone: string, userId: string | null) => {
        const normalized = normalizePhone(phone)
        if (!KZ_PHONE_RE.test(normalized)) {
            toast.error('Номер должен быть в формате +77001234567'); return
        }
        setAdding(true)
        try {
            await sprintService.addParticipant(normalized, userId)
            setNewPhone('')
            setSearchResults([])
            setSearchQuery('')
            toast.success('Участник добавлен')
            await Promise.all([loadParticipants(), loadCurrent()])
        } catch {
            toast.error('Не удалось добавить участника')
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await sprintService.removeParticipant(deleteTarget.id)
            toast.success('Участник удалён')
            setDeleteTarget(null)
            await Promise.all([loadParticipants(), loadCurrent()])
        } catch {
            toast.error('Не удалось удалить участника')
        } finally {
            setDeleting(false)
        }
    }

    // ── current week ─────────────────────────────────────────────────────
    const [current, setCurrent] = useState<SprintCurrent | null>(null)
    const [currentLoading, setCurrentLoading] = useState(true)
    const [resolvingTie, setResolvingTie] = useState(false)

    const loadCurrent = useCallback(async () => {
        setCurrentLoading(true)
        try {
            setCurrent(await sprintService.getCurrent())
        } catch {
            toast.error('Не удалось загрузить данные текущей недели')
        } finally {
            setCurrentLoading(false)
        }
    }, [])

    // ── history ──────────────────────────────────────────────────────────
    const [history, setHistory] = useState<SprintHistoryEntry[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true)
        try {
            setHistory(await sprintService.getHistory())
        } catch {
            toast.error('Не удалось загрузить историю спринта')
        } finally {
            setHistoryLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSettings(); loadParticipants(); loadCurrent(); loadHistory()
    }, [loadSettings, loadParticipants, loadCurrent, loadHistory])

    const tiePending = useMemo(
        () => (current?.winners ?? []).filter(w => w.resolution_type === 'tie_pending'),
        [current],
    )

    const handleResolveTie = async () => {
        if (!current) return
        setResolvingTie(true)
        try {
            const res = await sprintService.resolveTie(current.week_start_at)
            toast.success(`Приз разделён: по ${formatPrize(res.prize_share)} каждому`)
            await Promise.all([loadCurrent(), loadHistory()])
        } catch {
            toast.error('Не удалось разделить приз')
        } finally {
            setResolvingTie(false)
        }
    }

    // Grouping past weeks keeps a tie (several rows, one week) readable.
    const historyByWeek = useMemo(() => {
        const map = new Map<string, SprintHistoryEntry[]>()
        for (const h of history) {
            const rows = map.get(h.week_start_at) ?? []
            rows.push(h)
            map.set(h.week_start_at, rows)
        }
        return [...map.entries()]
    }, [history])

    return (
        <ListContainer>
            <ListHeader title="Турнир · Еженедельный спринт" />

            {/* ── Card copy, prize, threshold ──────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Crown className="h-4 w-4 text-gray-400" />
                    Карточка на главной
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Название (рус)</label>
                        <input
                            value={titleRu}
                            onChange={e => setTitleRu(e.target.value)}
                            placeholder="Еженедельный спринт"
                            maxLength={120}
                            className="w-56 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Название (каз)</label>
                        <input
                            value={titleKk}
                            onChange={e => setTitleKk(e.target.value)}
                            placeholder="Апталық спринт"
                            maxLength={120}
                            className="w-56 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Призовой фонд, ₸</label>
                        <input
                            type="number" min={0} step={1}
                            value={prizeInput}
                            onChange={e => setPrizeInput(e.target.value)}
                            placeholder="без приза"
                            className="w-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Порог досрочной победы</label>
                        <input
                            type="number" min={0} step={1}
                            value={targetInput}
                            onChange={e => setTargetInput(e.target.value)}
                            placeholder="выключено"
                            className="w-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Баллы за верный ответ</label>
                        <input
                            type="number" min={0} step={1}
                            value={perAnswerInput}
                            onChange={e => setPerAnswerInput(e.target.value)}
                            placeholder="выключено"
                            className="w-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Ссылка «Купить доступ»</label>
                        <input
                            type="url"
                            value={accessUrlInput}
                            onChange={e => setAccessUrlInput(e.target.value)}
                            placeholder="https://wa.me/7700… или ссылка на оплату"
                            className="w-72 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <Button
                        variant="secondary" size="sm"
                        icon={<Save className="h-3.5 w-3.5" />}
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}
                        loading={settingsSaving}
                    >
                        Сохранить
                    </Button>
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                    Неделя идёт с понедельника 00:00 до воскресенья 23:59 по Алматы. Побеждает набравший
                    больше всех баллов за неделю. Если задан порог — первый, кто его наберёт, побеждает
                    досрочно, и карточка сразу показывает победителя. Приз делится поровну при ничье и
                    записывается в историю. Выплата — вручную. Ссылка «Купить доступ» — куда ведёт
                    кнопка на экране спринта у тех, кто не в списке участников (пусто — кнопка скрыта).
                    Баллы за верный ответ — сколько очков даёт каждый правильный ответ в тесте спринта.
                </p>
            </div>

            {/* ── Participants ─────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <UsersIcon className="h-4 w-4 text-gray-400" />
                    Участники ({participants.length})
                </div>

                <div className="grid gap-3 md:grid-cols-2 mb-4">
                    {/* preferred path: pick a real account */}
                    <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Search className="h-3.5 w-3.5 text-gray-400" /> Найти пользователя
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                                placeholder="имя или номер"
                                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <Button variant="secondary" size="sm" onClick={runSearch} disabled={searching} loading={searching}>
                                Найти
                            </Button>
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-lg">
                                {searchResults.map(r => (
                                    <li key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                                        <span className="min-w-0">
                                            <span className="block text-sm text-gray-700 truncate">{r.label}</span>
                                            <span className="block text-xs text-gray-400 font-mono">{r.phone || '—'}</span>
                                        </span>
                                        <Button
                                            variant="ghost" size="sm"
                                            disabled={adding || !r.phone}
                                            onClick={() => addParticipant(r.phone, r.id)}
                                        >
                                            Допустить
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* fallback: someone who paid but hasn't registered yet */}
                    <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400" /> Добавить по номеру
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addParticipant(newPhone, null) }}
                                placeholder="+77001234567"
                                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <Button
                                variant="secondary" size="sm"
                                icon={<Plus className="h-3.5 w-3.5" />}
                                onClick={() => addParticipant(newPhone, null)}
                                disabled={adding}
                                loading={adding}
                            >
                                Добавить
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Для тех, кто оплатил взнос, но ещё не зарегистрировался — доступ сработает
                            после регистрации на этот номер.
                        </p>
                    </div>
                </div>

                {participantsLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : participants.length === 0 ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-3 px-3 text-center">
                        Список пуст — в спринте <b>никто не участвует</b>, победителя не будет.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 font-medium">Номер</th>
                                <th className="py-1.5 font-medium">Пользователь</th>
                                <th className="py-1.5 font-medium">Добавил</th>
                                <th className="py-1.5 font-medium">Дата</th>
                                <th className="py-1.5 font-medium w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(p => (
                                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 font-mono text-gray-700">{p.phone_number}</td>
                                    <td className="py-1.5 text-gray-600">
                                        {p.user_display ?? (
                                            <span className="text-xs text-amber-600">ещё не зарегистрирован</span>
                                        )}
                                    </td>
                                    <td className="py-1.5 text-gray-500">{p.added_by_display}</td>
                                    <td className="py-1.5 text-gray-400">{formatDateTime(p.created_at)}</td>
                                    <td className="py-1.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(p)}
                                            className="text-gray-400 hover:text-red-600"
                                            aria-label="Удалить"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Current week ─────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Crown className="h-4 w-4 text-gray-400" />
                    Текущая неделя
                    {current && (
                        <span className="text-xs text-gray-400 font-normal">
                            {weekLabel(current.week_start_at)} — {weekLabel(current.week_end_at)}
                        </span>
                    )}
                    <Button
                        variant="ghost" size="sm"
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() => { loadCurrent(); loadHistory() }}
                        disabled={currentLoading}
                        className="ml-auto"
                    >
                        Обновить
                    </Button>
                </div>

                {currentLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : !current ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Нет данных</div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <Badge type="info">Участников: {current.participant_count}</Badge>
                            <Badge type="secondary">Порог: {current.target_points ?? 'не задан'}</Badge>
                            <Badge type="secondary" icon={<Wallet className="h-3 w-3" />}>
                                Приз: {formatPrize(current.prize_amount)}
                            </Badge>
                        </div>

                        {current.winners.length > 0 && (
                            <table className="w-full text-sm mb-3">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        <th className="py-1.5 font-medium">Победитель</th>
                                        <th className="py-1.5 font-medium">Баллы</th>
                                        <th className="py-1.5 font-medium">Статус</th>
                                        <th className="py-1.5 font-medium">Доля приза</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {current.winners.map(w => (
                                        <tr key={w.user_id} className="border-b border-gray-50 last:border-0">
                                            <td className="py-1.5 text-gray-700">{w.name}</td>
                                            <td className="py-1.5 text-gray-600">{w.points}</td>
                                            <td className="py-1.5">
                                                <Badge type={RESOLUTION_META[w.resolution_type].badge} size="sm">
                                                    {RESOLUTION_META[w.resolution_type].label}
                                                </Badge>
                                            </td>
                                            <td className="py-1.5 text-gray-600">{formatPrize(w.prize_share)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {tiePending.length > 1 && (
                            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                <div className="flex items-center gap-2 text-sm text-amber-800">
                                    <Scale className="h-4 w-4" />
                                    Ничья между {tiePending.length} участниками — приз пока не разделён.
                                </div>
                                <Button
                                    variant="secondary" size="sm"
                                    onClick={handleResolveTie}
                                    disabled={resolvingTie}
                                    loading={resolvingTie}
                                >
                                    Разделить приз
                                </Button>
                            </div>
                        )}

                        <div className="text-xs text-gray-500 mb-1">Текущий рейтинг недели</div>
                        {current.standings.length === 0 ? (
                            <div className="text-sm text-gray-400 py-2">
                                Пока никто из участников не набрал баллов на этой неделе
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        <th className="py-1.5 font-medium w-10">#</th>
                                        <th className="py-1.5 font-medium">Участник</th>
                                        <th className="py-1.5 font-medium">Баллы за неделю</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {current.standings.map((s, i) => (
                                        <tr key={s.user_id} className="border-b border-gray-50 last:border-0">
                                            <td className="py-1.5 text-gray-400">{i + 1}</td>
                                            <td className="py-1.5 text-gray-700">{s.name}</td>
                                            <td className="py-1.5 text-gray-600">{s.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>

            {/* ── History ──────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <RefreshCw className="h-4 w-4 text-gray-400" />
                    История прошлых недель
                </div>
                {historyLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : historyByWeek.length === 0 ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Пока нет завершённых недель</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 font-medium">Неделя</th>
                                <th className="py-1.5 font-medium">Победитель</th>
                                <th className="py-1.5 font-medium">Баллы</th>
                                <th className="py-1.5 font-medium">Статус</th>
                                <th className="py-1.5 font-medium">Доля приза</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyByWeek.map(([week, rows]) =>
                                rows.map((h, i) => (
                                    <tr key={`${week}-${h.user_id}`} className="border-b border-gray-50 last:border-0">
                                        <td className="py-1.5 text-gray-500">{i === 0 ? weekLabel(week) : ''}</td>
                                        <td className="py-1.5 text-gray-700">{h.name}</td>
                                        <td className="py-1.5 text-gray-600">{h.points}</td>
                                        <td className="py-1.5">
                                            <Badge type={RESOLUTION_META[h.resolution_type].badge} size="sm">
                                                {RESOLUTION_META[h.resolution_type].label}
                                            </Badge>
                                        </td>
                                        <td className="py-1.5 text-gray-600">{formatPrize(h.prize_share)}</td>
                                    </tr>
                                )),
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Удалить участника?"
                message={`${deleteTarget?.phone_number ?? ''} перестанет участвовать в спринте. Уже выигранные им недели останутся в истории.`}
                confirmText="Удалить"
                isLoading={deleting}
            />
        </ListContainer>
    )
}

import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
    Save, Plus, Trash2, RefreshCw, Crown, Users as UsersIcon,
    ChevronDown, ChevronUp, ShieldAlert, Scale, Wallet,
} from 'lucide-react'
import {
    leaderboardPointsService,
    sprintService,
    type SprintAllowedPhone,
    type SprintCurrent,
    type SprintHistoryEntry,
    type SprintSuspiciousEntry,
    type SprintResolutionType,
} from '@/services/api'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import ConfirmModal from '@/components/common/ConfirmModal'

/**
 * CRM #19 "Логика всего блока — Еженедельный спринт".
 *
 * Continues CRM #6/#7 (already shipped): the Monday auto-reset and the
 * "sprint_target_points" threshold live on the leaderboard-points settings
 * endpoint (still edited on the Users page for auto-reset itself). This
 * page owns everything else that's specific to the weekly sprint:
 *  - the threshold + prize amount (moved here from UserList — see the
 *    comment on the auto-reset card there),
 *  - the phone allowlist controlling who can participate,
 *  - the current week's standings/winner(s), incl. resolving unresolved
 *    ties by splitting the prize,
 *  - history of past weeks,
 *  - a lightweight antifraud diagnostic list (suspicious point gains).
 */

// Kazakhstani mobile numbers: +7 7XX XXX XX XX — 11 digits total, leading 7.
const KZ_PHONE_RE = /^\+7\d{10}$/

function normalizePhone(raw: string): string {
    const digits = raw.trim().replace(/[^\d+]/g, '')
    if (digits.startsWith('8') && digits.length === 11) return `+7${digits.slice(1)}`
    if (digits.startsWith('7') && !digits.startsWith('+')) return `+${digits}`
    return digits
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '—' }
}

function weekLabel(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return iso }
}

const RESOLUTION_META: Record<SprintResolutionType, { label: string; badge: 'success' | 'warning' | 'info' | 'secondary' }> = {
    threshold: { label: 'Достиг порога', badge: 'success' },
    closest: { label: 'Ближе всех к порогу', badge: 'info' },
    tie_pending: { label: 'Ничья — не разрешена', badge: 'warning' },
    tie_split: { label: 'Ничья — приз разделён', badge: 'secondary' },
}

const formatPrize = (amount: number | null): string =>
    amount == null ? '—' : `${amount.toLocaleString('ru-RU')} ₸`

export default function SprintSettings() {
    // ── settings: threshold + prize ─────────────────────────────────────
    const [targetInput, setTargetInput] = useState('')
    const [prizeInput, setPrizeInput] = useState('')
    const [settingsSaving, setSettingsSaving] = useState(false)

    const loadSettings = useCallback(async () => {
        try {
            const s = await leaderboardPointsService.getSettings()
            setTargetInput(s.sprint_target_points ? String(s.sprint_target_points) : '')
            setPrizeInput(s.sprint_prize_amount ? String(s.sprint_prize_amount) : '')
        } catch {
            toast.error('Не удалось загрузить настройки спринта')
        }
    }, [])
    useEffect(() => { loadSettings() }, [loadSettings])

    const handleSaveSettings = async () => {
        const targetRaw = parseInt(targetInput, 10)
        if (targetInput.trim() !== '' && (isNaN(targetRaw) || targetRaw < 0)) {
            toast.error('Порог баллов должен быть неотрицательным числом'); return
        }
        const prizeRaw = parseInt(prizeInput, 10)
        if (prizeInput.trim() !== '' && (isNaN(prizeRaw) || prizeRaw < 0)) {
            toast.error('Сумма приза должна быть неотрицательным числом'); return
        }
        const target = isNaN(targetRaw) || targetRaw <= 0 ? null : targetRaw
        const prize = isNaN(prizeRaw) || prizeRaw <= 0 ? null : prizeRaw
        setSettingsSaving(true)
        try {
            const s = await leaderboardPointsService.updateSettings({
                sprint_target_points: target,
                sprint_prize_amount: prize,
            })
            setTargetInput(s.sprint_target_points ? String(s.sprint_target_points) : '')
            setPrizeInput(s.sprint_prize_amount ? String(s.sprint_prize_amount) : '')
            toast.success('Настройки спринта сохранены')
        } catch {
            toast.error('Ошибка сохранения настроек спринта')
        } finally {
            setSettingsSaving(false)
        }
    }

    // ── allowed phones ───────────────────────────────────────────────────
    const [phones, setPhones] = useState<SprintAllowedPhone[]>([])
    const [phonesLoading, setPhonesLoading] = useState(true)
    const [newPhone, setNewPhone] = useState('')
    const [addingPhone, setAddingPhone] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SprintAllowedPhone | null>(null)
    const [deletingPhone, setDeletingPhone] = useState(false)

    const loadPhones = useCallback(async () => {
        setPhonesLoading(true)
        try {
            setPhones(await sprintService.listAllowedPhones())
        } catch {
            toast.error('Не удалось загрузить список номеров')
        } finally {
            setPhonesLoading(false)
        }
    }, [])
    useEffect(() => { loadPhones() }, [loadPhones])

    const handleAddPhone = async () => {
        const normalized = normalizePhone(newPhone)
        if (!KZ_PHONE_RE.test(normalized)) {
            toast.error('Введите номер в формате +77001234567'); return
        }
        setAddingPhone(true)
        try {
            await sprintService.addAllowedPhone(normalized)
            setNewPhone('')
            toast.success('Номер добавлен')
            await loadPhones()
        } catch {
            toast.error('Не удалось добавить номер (возможно, уже есть в списке)')
        } finally {
            setAddingPhone(false)
        }
    }

    const handleDeletePhone = async () => {
        if (!deleteTarget) return
        setDeletingPhone(true)
        try {
            await sprintService.removeAllowedPhone(deleteTarget)
            toast.success('Номер удалён')
            setDeleteTarget(null)
            await loadPhones()
        } catch {
            toast.error('Не удалось удалить номер')
        } finally {
            setDeletingPhone(false)
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
    useEffect(() => { loadCurrent() }, [loadCurrent])

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
    useEffect(() => { loadHistory() }, [loadHistory])

    const tiePending = current?.winners.filter(w => w.resolution_type === 'tie_pending') ?? []

    const handleResolveTie = async () => {
        if (!current) return
        setResolvingTie(true)
        try {
            await sprintService.resolveTie(current.week_start_at)
            toast.success('Приз разделён между победителями')
            await Promise.all([loadCurrent(), loadHistory()])
        } catch {
            toast.error('Не удалось разделить приз')
        } finally {
            setResolvingTie(false)
        }
    }

    // ── suspicious activity (antifraud) — collapsible, not the main focus ──
    const [suspicious, setSuspicious] = useState<SprintSuspiciousEntry[]>([])
    const [suspiciousLoading, setSuspiciousLoading] = useState(true)
    const [suspiciousOpen, setSuspiciousOpen] = useState(false)

    const loadSuspicious = useCallback(async () => {
        setSuspiciousLoading(true)
        try {
            setSuspicious(await sprintService.getSuspicious())
        } catch {
            // best-effort — diagnostic list just stays empty
        } finally {
            setSuspiciousLoading(false)
        }
    }, [])
    useEffect(() => { loadSuspicious() }, [loadSuspicious])

    return (
        <ListContainer>
            <ListHeader title="Турнир · Спринт" />

            {/* ── Settings: threshold + prize ──────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Crown className="h-4 w-4 text-gray-400" />
                    Настройки спринта
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Порог баллов (0 или пусто — выключено)</label>
                        <input
                            type="number" min={0} step={1}
                            value={targetInput}
                            onChange={e => setTargetInput(e.target.value)}
                            placeholder="выключено"
                            className="w-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-600">Приз победителю, ₸ (0 или пусто — без приза)</label>
                        <input
                            type="number" min={0} step={1}
                            value={prizeInput}
                            onChange={e => setPrizeInput(e.target.value)}
                            placeholder="без приза"
                            className="w-48 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                <p className="text-xs text-gray-400 mt-3">
                    Первый, кто наберёт указанный порог баллов за неделю, фиксируется победителем. Если к концу недели порог никто не достиг — победителем становится набравший наибольшее число очков. Автообнуление очков по понедельникам настраивается на странице «Пользователи».
                </p>
            </div>

            {/* ── Allowed phones ───────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <UsersIcon className="h-4 w-4 text-gray-400" />
                    Разрешённые номера ({phones.length})
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <input
                        type="text"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddPhone() }}
                        placeholder="+77001234567"
                        className="w-52 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <Button
                        variant="secondary" size="sm"
                        icon={<Plus className="h-3.5 w-3.5" />}
                        onClick={handleAddPhone}
                        disabled={addingPhone}
                        loading={addingPhone}
                    >
                        Добавить
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={loadPhones}
                        disabled={phonesLoading}
                    >
                        Обновить
                    </Button>
                </div>
                {phonesLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : phones.length === 0 ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Список пуст — участвовать могут все пользователи.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 font-medium">Номер</th>
                                <th className="py-1.5 font-medium">Добавил</th>
                                <th className="py-1.5 font-medium">Дата</th>
                                <th className="py-1.5 font-medium w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {phones.map(p => (
                                <tr key={p.id ?? p.phone_number} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 font-mono text-gray-700">{p.phone_number}</td>
                                    <td className="py-1.5 text-gray-600">{p.added_by_display}</td>
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

            {/* ── Current week ──────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Crown className="h-4 w-4 text-gray-400" />
                    Текущая неделя
                    {current && <span className="text-xs text-gray-400 font-normal">с {weekLabel(current.week_start_at)}</span>}
                </div>
                {currentLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : !current ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Нет данных</div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                            <Badge type="info">Участников: {current.participant_count}</Badge>
                            <Badge type="secondary">Порог: {current.target_points ?? '—'}</Badge>
                            <Badge type="secondary" icon={<Wallet className="h-3 w-3" />}>Приз: {formatPrize(current.prize_amount)}</Badge>
                        </div>
                        {current.winners.length === 0 ? (
                            <div className="text-sm text-gray-400 py-2">Пока нет победителя</div>
                        ) : (
                            <table className="w-full text-sm mb-3">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        <th className="py-1.5 font-medium">Пользователь</th>
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
                            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 text-sm text-amber-800">
                                    <Scale className="h-4 w-4" />
                                    Ничья между {tiePending.length} участниками — приз не разделён.
                                </div>
                                <Button
                                    variant="secondary" size="sm"
                                    onClick={handleResolveTie}
                                    disabled={resolvingTie}
                                    loading={resolvingTie}
                                >
                                    Разделить приз между {tiePending.length}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── History ───────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <RefreshCw className="h-4 w-4 text-gray-400" />
                    История прошлых недель
                </div>
                {historyLoading ? (
                    <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                ) : history.length === 0 ? (
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
                            {history.map(h => (
                                <tr key={`${h.week_start_at}-${h.user_id}`} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 text-gray-500">{weekLabel(h.week_start_at)}</td>
                                    <td className="py-1.5 text-gray-700">{h.name}</td>
                                    <td className="py-1.5 text-gray-600">{h.points}</td>
                                    <td className="py-1.5">
                                        <Badge type={RESOLUTION_META[h.resolution_type].badge} size="sm">
                                            {RESOLUTION_META[h.resolution_type].label}
                                        </Badge>
                                    </td>
                                    <td className="py-1.5 text-gray-600">{formatPrize(h.prize_share)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Suspicious activity (antifraud) — secondary, collapsible ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <button
                    type="button"
                    onClick={() => setSuspiciousOpen(v => !v)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
                >
                    <span className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-gray-400" />
                        Подозрительная активность ({suspicious.length})
                    </span>
                    {suspiciousOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {suspiciousOpen && (
                    <div className="mt-3">
                        {suspiciousLoading ? (
                            <div className="text-sm text-gray-400 py-4 text-center">Загрузка…</div>
                        ) : suspicious.length === 0 ? (
                            <div className="text-sm text-gray-400 py-4 text-center">Подозрительной активности не обнаружено</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        <th className="py-1.5 font-medium">Пользователь</th>
                                        <th className="py-1.5 font-medium">Прирост баллов</th>
                                        <th className="py-1.5 font-medium">Источник</th>
                                        <th className="py-1.5 font-medium">Дата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suspicious.map((s, i) => (
                                        <tr key={`${s.user_id}-${s.created_at}-${i}`} className="border-b border-gray-50 last:border-0">
                                            <td className="py-1.5 text-gray-700">{s.name}</td>
                                            <td className="py-1.5 text-gray-600">+{s.points_delta}</td>
                                            <td className="py-1.5 text-gray-500 font-mono text-xs">{s.source_type}</td>
                                            <td className="py-1.5 text-gray-400">{formatDateTime(s.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeletePhone}
                title="Удалить номер?"
                message={`Номер ${deleteTarget?.phone_number ?? ''} будет исключён из списка разрешённых участников спринта.`}
                confirmText="Удалить"
                isLoading={deletingPhone}
            />
        </ListContainer>
    )
}

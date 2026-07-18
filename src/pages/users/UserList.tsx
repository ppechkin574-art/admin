import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import {
    ArrowUpDown, ChevronDown, ChevronUp, Crown,
    Eye, EyeOff, Lock, RefreshCw, Trash2, Unlock, Users as UsersIcon, X,
    Smartphone, Apple, Save, Settings, Coins, RotateCcw,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import Modal from '@/components/common/Modal'
import { leaderboardHiddenService, appSettingsService, leaderboardPointsService } from '@/services/api'

interface User {
    id: string
    username: string
    name: string
    email: string | null
    phone: string | null
    is_active: boolean
    roles: string[]
    role?: 'parent' | 'child' | 'user' | string
    allowed_subject_ids: number[]
    grade: number | null
    plan: 'FREE' | 'PRO' | string
    used_trial: boolean
    subscription_end: string | null
    subscription_cancelled: boolean
    attendance_streak_days: number
    attendance_total_points: number
    points: number
    rank: number | null
    created_at: string
    updated_at: string | null
    platforms: string[]          // e.g. ["ios", "android"] — from FCM token table
    last_seen: string | null     // max FCM token updated_at
}

type SortKey = 'name' | 'plan' | 'created_at' | 'attendance_streak_days' | 'points'
type PlanFilter = '' | 'PRO' | 'FREE'
type HiddenFilter = '' | 'hidden' | 'visible'

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '—' }
}

const ROLE_OPTIONS = [
    { value: '', label: 'Все роли' },
    { value: 'child', label: 'Ученики' },
    { value: 'parent', label: 'Родители' },
    { value: 'teacher', label: 'Учителя' },
    { value: 'admin', label: 'Администраторы' },
]

const roleLabel = (user: User): string => {
    const r = user.role || (user.roles?.includes('parent') ? 'parent'
        : user.roles?.includes('child') ? 'child'
        : user.roles?.includes('teacher') ? 'teacher'
        : user.roles?.includes('admin') ? 'admin' : 'user')
    switch (r) {
        case 'child': return 'Ученик'
        case 'parent': return 'Родитель'
        case 'teacher': return 'Учитель'
        case 'admin': return 'Админ'
        default: return 'Пользователь'
    }
}

const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return '—' }
}

// Returns human-readable "last seen" label and online status.
const lastSeenLabel = (iso: string | null): { label: string; online: boolean } => {
    if (!iso) return { label: 'Нет данных', online: false }
    const diff = Date.now() - new Date(iso).getTime()
    const online = diff < 5 * 60 * 1000  // 5 minutes
    if (online) return { label: 'Онлайн', online: true }
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return { label: `${mins} мин назад`, online: false }
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return { label: `${hrs} ч назад`, online: false }
    const days = Math.floor(hrs / 24)
    if (days < 30) return { label: `${days} дн назад`, online: false }
    return { label: `>30 дней`, online: false }
}

const PlatformIcons: React.FC<{ platforms: string[] }> = ({ platforms }) => {
    const has = (p: string) => platforms.map(x => x.toLowerCase()).includes(p)
    return (
        <div className="flex items-center gap-1">
            {has('ios') && <Apple className="h-3.5 w-3.5 text-gray-500" aria-label="iOS" />}
            {has('android') && <Smartphone className="h-3.5 w-3.5 text-green-600" aria-label="Android" />}
            {platforms.length === 0 && <span className="text-gray-300 text-xs">—</span>}
        </div>
    )
}

const ActivityCell: React.FC<{ platforms: string[]; lastSeen: string | null }> = ({ platforms, lastSeen }) => {
    const { label, online } = lastSeenLabel(lastSeen)
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {online
                    ? <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                        Онлайн
                      </span>
                    : <span className="text-xs text-gray-400">{label}</span>
                }
            </div>
            <PlatformIcons platforms={platforms} />
        </div>
    )
}

const daysRemaining = (user: User): number | null => {
    if (user.plan !== 'PRO' || !user.subscription_end) return null
    const end = new Date(user.subscription_end).getTime()
    if (Number.isNaN(end)) return null
    const now = Date.now()
    if (end <= now) return 0
    return Math.floor((end - now) / 86_400_000)
}

// Trial = subscription was set within 5 days of account creation (3-day onboarding period).
// Once paid (Month = +30 days), the gap exceeds 5 days and this returns false.
const isTrial = (user: User): boolean => {
    if (!user.subscription_end || !user.created_at) return false
    const subEnd = new Date(user.subscription_end).getTime()
    const createdAt = new Date(user.created_at).getTime()
    return (subEnd - createdAt) < 5 * 86_400_000
}

const subLabel = (user: User): React.ReactNode => {
    if (user.plan !== 'PRO') return <Badge type="secondary">FREE</Badge>
    const days = daysRemaining(user)
    if (days === null) return <Badge type="primary">Month</Badge>
    if (days <= 0) return <Badge type="error">Month · истёк</Badge>
    if (isTrial(user)) return <Badge type="warning">Пробный · {days}д</Badge>
    if (days <= 7) return <Badge type="warning">Month · {days}д</Badge>
    return <Badge type="primary">Month · {days}д</Badge>
}

export const UserList: React.FC = () => {
    const navigate = useNavigate()
    const { users, loading, fetchUsers, refreshUsers, updateUser, deleteUser, grantPro, resetToFree } = useUserStore()

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [planFilter, setPlanFilter] = useState<PlanFilter>('')
    const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>('')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
    const subMenuRef = useRef<HTMLDivElement>(null)

    // ── Auto-subscription settings ────────────────────────────────────────────
    const [autoDays, setAutoDays] = useState<number>(0)
    const [autoDaysInput, setAutoDaysInput] = useState<string>('0')
    const [autoSettingLoading, setAutoSettingLoading] = useState(false)

    useEffect(() => {
        appSettingsService.getByKey('new_user_pro_days').then(s => {
            const v = parseInt(s?.value ?? '0', 10)
            setAutoDays(v)
            setAutoDaysInput(String(v))
        }).catch(() => {})
    }, [])

    const handleSaveAutoSetting = async () => {
        const n = parseInt(autoDaysInput, 10)
        if (isNaN(n) || n < 0 || n > 3650) { toast.error('Введите число от 0 до 3650'); return }
        setAutoSettingLoading(true)
        try {
            await appSettingsService.updateValue('new_user_pro_days', String(n))
            setAutoDays(n)
            toast.success(n === 0 ? 'Авто-подписка отключена' : `Авто-подписка: ${n} дней PRO`)
        } catch {
            toast.error('Ошибка сохранения')
        } finally {
            setAutoSettingLoading(false)
        }
    }

    // ── Leaderboard points: auto-reset settings ─────────────────────────────
    const [pointsResetEnabled, setPointsResetEnabled] = useState(false)
    const [pointsIntervalInput, setPointsIntervalInput] = useState<string>('30')
    const [pointsNextReset, setPointsNextReset] = useState<string | null>(null)
    const [pointsSettingLoading, setPointsSettingLoading] = useState(false)

    const loadPointsSettings = useCallback(async () => {
        try {
            const s = await leaderboardPointsService.getSettings()
            setPointsResetEnabled(s.auto_reset_enabled)
            setPointsIntervalInput(String(s.interval_days))
            setPointsNextReset(s.next_reset_at)
        } catch { /* best-effort — card just won't show a next-reset date */ }
    }, [])
    useEffect(() => { loadPointsSettings() }, [loadPointsSettings])

    const handleSavePointsSettings = async (enabledOverride?: boolean) => {
        const n = parseInt(pointsIntervalInput, 10)
        if (isNaN(n) || n < 1 || n > 3650) { toast.error('Введите число дней от 1 до 3650'); return }
        const enabled = enabledOverride ?? pointsResetEnabled
        setPointsSettingLoading(true)
        try {
            const s = await leaderboardPointsService.updateSettings(enabled, n)
            setPointsResetEnabled(s.auto_reset_enabled)
            setPointsNextReset(s.next_reset_at)
            toast.success(enabled ? `Автообнуление: каждые ${n} дн.` : 'Автообнуление отключено')
        } catch {
            toast.error('Ошибка сохранения настроек очков')
        } finally {
            setPointsSettingLoading(false)
        }
    }

    // ── Leaderboard points: selective adjust ────────────────────────────────
    const [adjustUser, setAdjustUser] = useState<User | null>(null)

    useEffect(() => { fetchUsers({}) }, [fetchUsers])

    // ── leaderboard hide-list ────────────────────────────────────────────────
    // Hidden users are excluded from the in-app leaderboard ranking by the
    // backend; here we only fetch the set to mark rows + drive the bulk action.
    const refreshHidden = useCallback(async () => {
        try {
            const data = await leaderboardHiddenService.get()
            setHiddenIds(new Set(data.user_ids))
        } catch {
            // Non-fatal: the user table still works without the hide-list.
            // A failed fetch just means no "Скрыт" badges this render.
        }
    }, [])

    useEffect(() => { refreshHidden() }, [refreshHidden])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (subMenuRef.current && !subMenuRef.current.contains(e.target as Node))
                setOpenSubMenu(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // ── Resizable columns ─────────────────────────────────────────────────
    const COL_KEYS = ['name','phone','role','plan','streak','points','registered','activity','status','actions'] as const
    type ColKey = typeof COL_KEYS[number]
    const DEFAULT_WIDTHS: Record<ColKey, number> = {
        name: 180, phone: 140, role: 100, plan: 150,
        streak: 90, points: 80, registered: 110,
        activity: 120, status: 110, actions: 280,
    }
    const COL_WIDTHS_KEY = 'userlist_col_widths_v1'

    // The "Действия" column had no resize handle until a 5th action button
    // (points adjust) was added, so any previously-saved width of exactly the
    // OLD default (110px) was never a deliberate user choice — it's stale and
    // now too narrow to fit 5 icons. Treat that specific value as unset so
    // everyone gets the new, wider default without re-saving.
    const OLD_ACTIONS_DEFAULT = 110

    const [colWidths, setColWidths] = useState<Record<ColKey, number>>(() => {
        try {
            const raw = localStorage.getItem(COL_WIDTHS_KEY)
            if (raw) {
                const saved = JSON.parse(raw)
                if (saved.actions === OLD_ACTIONS_DEFAULT) delete saved.actions
                return { ...DEFAULT_WIDTHS, ...saved }
            }
        } catch {}
        return { ...DEFAULT_WIDTHS }
    })

    // Sum of all column widths + 40px checkbox — used as explicit table width
    // so table-fixed treats each col's style width as absolute pixels, not ratios.
    const totalTableWidth = 40 + COL_KEYS.reduce((s, k) => s + colWidths[k], 0)

    const colWidthsRef = useRef(colWidths)
    useEffect(() => { colWidthsRef.current = colWidths }, [colWidths])

    const startResize = useCallback((col: ColKey, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startWidth = colWidthsRef.current[col]
        const onMove = (ev: MouseEvent) => {
            const w = Math.max(60, startWidth + ev.clientX - startX)
            setColWidths(prev => ({ ...prev, [col]: w }))
        }
        const onUp = (ev: MouseEvent) => {
            const w = Math.max(60, startWidth + ev.clientX - startX)
            const next = { ...colWidthsRef.current, [col]: w }
            setColWidths(next)
            try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(next)) } catch {}
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }, [])

    // ── stats ──────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const today = new Date().toDateString()
        const FIVE_MIN = 5 * 60 * 1000
        return {
            total: users.length,
            pro: users.filter(u => u.plan === 'PRO').length,
            free: users.filter(u => u.plan !== 'PRO').length,
            expiringSoon: users.filter(u => {
                const d = daysRemaining(u)
                return d !== null && d >= 0 && d <= 7
            }).length,
            newToday: users.filter(u => u.created_at && new Date(u.created_at).toDateString() === today).length,
            ios: users.filter(u => u.platforms?.map(p => p.toLowerCase()).includes('ios')).length,
            android: users.filter(u => u.platforms?.map(p => p.toLowerCase()).includes('android')).length,
            online: users.filter(u => u.last_seen && Date.now() - new Date(u.last_seen).getTime() < FIVE_MIN).length,
        }
    }, [users])

    // ── filter + sort ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = users
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(u =>
                u.name?.toLowerCase().includes(q) ||
                u.phone?.includes(q) ||
                u.email?.toLowerCase().includes(q)
            )
        }
        if (roleFilter) list = list.filter(u => u.roles?.includes(roleFilter) || u.role === roleFilter)
        if (planFilter) list = list.filter(u => planFilter === 'PRO' ? u.plan === 'PRO' : u.plan !== 'PRO')
        if (hiddenFilter) list = list.filter(u => hiddenFilter === 'hidden' ? hiddenIds.has(u.id) : !hiddenIds.has(u.id))
        return list
    }, [users, search, roleFilter, planFilter, hiddenFilter, hiddenIds])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = (a as any)[sortKey]
            const bv = (b as any)[sortKey]
            if (av == null && bv == null) return 0
            if (av == null) return 1
            if (bv == null) return -1
            const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av > bv ? 1 : av < bv ? -1 : 0)
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir])

    const totalPages = Math.ceil(sorted.length / pageSize) || 1
    const paginated = useMemo(() => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize), [sorted, currentPage, pageSize])

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />
        return sortDir === 'asc'
            ? <ChevronUp className="h-3 w-3 ml-1 inline text-blue-500" />
            : <ChevronDown className="h-3 w-3 ml-1 inline text-blue-500" />
    }

    // ── selection ──────────────────────────────────────────────────────────
    const allPageSelected = paginated.length > 0 && paginated.every(u => selected.has(u.id))
    const somePageSelected = paginated.some(u => selected.has(u.id))

    const toggleOne = (id: string) => setSelected(prev => {
        const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
    const togglePage = () => {
        if (allPageSelected) setSelected(prev => { const n = new Set(prev); paginated.forEach(u => n.delete(u.id)); return n })
        else setSelected(prev => { const n = new Set(prev); paginated.forEach(u => n.add(u.id)); return n })
    }
    const clearSelection = () => setSelected(new Set())

    // ── single actions ──────────────────────────────────────────────────────
    const handleView = useCallback((user: User) => navigate(`/users/${user.id}`), [navigate])

    const handleToggleActive = useCallback(async (user: User) => {
        try {
            await updateUser(user.id, { is_active: !user.is_active })
            toast.success(!user.is_active ? `"${user.name}" разблокирован` : `"${user.name}" заблокирован`)
            await refreshUsers({})
        } catch { toast.error('Не удалось изменить статус') }
    }, [updateUser, refreshUsers])

    const handleGrantPro = useCallback(async (user: User, days: number) => {
        setOpenSubMenu(null)
        try {
            await grantPro(user.id, days)
            toast.success(`PRO на ${days} дней → "${user.name || user.phone}"`)
            await refreshUsers({})
        } catch { toast.error('Не удалось выдать PRO') }
    }, [grantPro, refreshUsers])

    const handleResetToFree = useCallback(async (user: User) => {
        setOpenSubMenu(null)
        try {
            await resetToFree(user.id)
            toast.success(`Сброшено на FREE → "${user.name || user.phone}"`)
            await refreshUsers({})
        } catch { toast.error('Не удалось сбросить подписку') }
    }, [resetToFree, refreshUsers])

    const handleDelete = useCallback(async (user: User) => {
        if (!window.confirm(`Удалить аккаунт "${user.name || user.phone}"?\n\nДействие необратимо — номер и все данные исчезнут из системы.`)) return
        try {
            await deleteUser(user.id)
            toast.success('Аккаунт удалён')
            await refreshUsers({})
        } catch { toast.error('Не удалось удалить аккаунт') }
    }, [deleteUser, refreshUsers])

    // ── bulk actions ────────────────────────────────────────────────────────
    const selectedUsers = useMemo(() => users.filter(u => selected.has(u.id)), [users, selected])

    const bulkAction = async (fn: () => Promise<void>, successMsg: string) => {
        setBulkLoading(true)
        try {
            await fn()
            toast.success(successMsg)
            await refreshUsers({})
            clearSelection()
        } catch { toast.error('Ошибка при массовом действии') }
        finally { setBulkLoading(false) }
    }

    const handleBulkGrantPro = (days: number) => bulkAction(
        () => Promise.all(selectedUsers.map(u => grantPro(u.id, days))).then(() => {}),
        `PRO на ${days} дней выдан ${selected.size} пользователям`
    )
    const handleBulkFree = () => bulkAction(
        () => Promise.all(selectedUsers.map(u => resetToFree(u.id))).then(() => {}),
        `${selected.size} пользователей переведены на FREE`
    )
    const handleBulkBlock = (block: boolean) => bulkAction(
        () => Promise.all(selectedUsers.map(u => updateUser(u.id, { is_active: !block }))).then(() => {}),
        block ? `${selected.size} заблокировано` : `${selected.size} разблокировано`
    )
    const handleBulkDelete = async () => {
        if (!window.confirm(`Удалить ${selected.size} аккаунтов?\n\nДействие необратимо.`)) return
        await bulkAction(
            () => Promise.all(selectedUsers.map(u => deleteUser(u.id))).then(() => {}),
            `${selected.size} аккаунтов удалено`
        )
    }

    // Hide / show selected users on the in-app leaderboard. One bulk call
    // to the backend; on success refetch the hidden set so the «Скрыт»
    // badges update, then clear the selection. Does NOT touch user data,
    // so no refreshUsers() needed.
    const handleBulkHidden = async (hidden: boolean) => {
        const ids = Array.from(selected)
        setBulkLoading(true)
        try {
            await leaderboardHiddenService.set(ids, hidden)
            await refreshHidden()
            toast.success(
                hidden
                    ? `${ids.length} скрыто из лидерборда`
                    : `${ids.length} показано в лидерборде`
            )
            clearSelection()
        } catch {
            toast.error('Не удалось изменить видимость в лидерборде')
        } finally {
            setBulkLoading(false)
        }
    }

    const resetFilters = () => { setSearch(''); setRoleFilter(''); setPlanFilter(''); setHiddenFilter(''); setCurrentPage(1) }
    const activeFiltersCount = (search ? 1 : 0) + (roleFilter ? 1 : 0) + (planFilter ? 1 : 0) + (hiddenFilter ? 1 : 0)

    return (
        <ListContainer>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-gray-500" />
                    Пользователи
                    <span className="text-sm font-normal text-gray-400">({sorted.length} из {users.length})</span>
                </h1>
                <Button
                    variant="secondary"
                    onClick={() => refreshUsers({})}
                    disabled={loading}
                    icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                    {loading ? 'Загрузка...' : 'Обновить'}
                </Button>
            </div>

            {/* ── Auto-subscription settings ──────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
                    <Settings className="h-4 w-4 text-gray-400" />
                    Авто-подписка при регистрации
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { const next = autoDays > 0 ? 0 : 7; setAutoDaysInput(String(next)); setAutoDays(next) }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoDays > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${autoDays > 0 ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-gray-500">{autoDays > 0 ? 'Включено' : 'Выключено'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Дней PRO:</label>
                    <input
                        type="number" min={0} max={3650} step={1}
                        value={autoDaysInput}
                        onChange={e => { setAutoDaysInput(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) setAutoDays(n) }}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-400">(0 = выключено)</span>
                </div>
                <Button
                    variant="secondary" size="sm"
                    icon={<Save className="h-3.5 w-3.5" />}
                    onClick={handleSaveAutoSetting}
                    disabled={autoSettingLoading}
                    loading={autoSettingLoading}
                >
                    Сохранить
                </Button>
                {autoDays > 0 && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                        Новые пользователи получат {autoDays} дней PRO
                    </span>
                )}
            </div>

            {/* ── Leaderboard points auto-reset settings ──────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
                    <RotateCcw className="h-4 w-4 text-gray-400" />
                    Автообнуление очков лидерборда
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { const next = !pointsResetEnabled; setPointsResetEnabled(next); handleSavePointsSettings(next) }}
                        disabled={pointsSettingLoading}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${pointsResetEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${pointsResetEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-gray-500">{pointsResetEnabled ? 'Включено' : 'Выключено'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Раз в (дней):</label>
                    <input
                        type="number" min={1} max={3650} step={1}
                        value={pointsIntervalInput}
                        onChange={e => setPointsIntervalInput(e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                <Button
                    variant="secondary" size="sm"
                    icon={<Save className="h-3.5 w-3.5" />}
                    onClick={() => handleSavePointsSettings()}
                    disabled={pointsSettingLoading}
                    loading={pointsSettingLoading}
                >
                    Сохранить
                </Button>
                {pointsResetEnabled && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                        Следующий сброс: {formatDateTime(pointsNextReset)} · у всех, включая скрытых
                    </span>
                )}
                <span className="text-xs text-gray-400 w-full">
                    Обнуляет очки у всех пользователей (в т.ч. скрытых из лидерборда). Сохранение перезапускает отсчёт от текущего момента.
                </span>
            </div>

            {/* ── Stats bar ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Всего</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.pro}</div>
                    <div className="text-xs text-gray-500 mt-0.5">PRO</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-gray-400">{stats.free}</div>
                    <div className="text-xs text-gray-500 mt-0.5">FREE</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Истекает ≤7д</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.newToday}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Новые сегодня</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-gray-600 flex items-center justify-center gap-1">
                        <Apple className="h-5 w-5" />{stats.ios}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">iOS</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                        <Smartphone className="h-5 w-5" />{stats.android}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Android</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        {stats.online}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Онлайн</div>
                </div>
            </div>

            {/* ── Filters ────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-600">Фильтры</span>
                    {activeFiltersCount > 0 && (
                        <button onClick={resetFilters} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            <X className="h-3 w-3" /> Сбросить
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                        placeholder="Имя, телефон, email..."
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <select
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1) }}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                        {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
                        {(['', 'PRO', 'FREE'] as PlanFilter[]).map(v => (
                            <button
                                key={v}
                                onClick={() => { setPlanFilter(v); setCurrentPage(1) }}
                                className={`px-3 py-1.5 ${planFilter === v ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                {v || 'Все'}
                            </button>
                        ))}
                    </div>
                    <select
                        value={hiddenFilter}
                        onChange={e => { setHiddenFilter(e.target.value as HiddenFilter); setCurrentPage(1) }}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        title="Видимость в лидерборде"
                    >
                        <option value="">Лидерборд: все</option>
                        <option value="hidden">Только скрытые ({hiddenIds.size})</option>
                        <option value="visible">Только показанные</option>
                    </select>
                </div>
            </div>

            {/* ── Bulk action bar ────────────────────────────────────────── */}
            {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-3">
                    <span className="text-sm font-semibold text-blue-700 mr-1">
                        {selected.size} выбрано
                    </span>
                    <div className="h-4 w-px bg-blue-200" />
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkGrantPro(30)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
                    >
                        <Crown className="h-3 w-3" /> PRO 30 дней
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkGrantPro(365)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
                    >
                        <Crown className="h-3 w-3" /> PRO год
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={handleBulkFree}
                        className="text-xs px-2.5 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                        → FREE
                    </button>
                    <div className="h-4 w-px bg-blue-200" />
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkBlock(true)}
                        className="text-xs px-2.5 py-1.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                    >
                        Заблокировать
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkBlock(false)}
                        className="text-xs px-2.5 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                    >
                        Разблокировать
                    </button>
                    <div className="h-4 w-px bg-blue-200" />
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkHidden(true)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    >
                        <EyeOff className="h-3 w-3" /> Скрыть из лидерборда
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkHidden(false)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    >
                        <Eye className="h-3 w-3" /> Показать в лидерборде
                    </button>
                    <div className="h-4 w-px bg-blue-200" />
                    <button
                        disabled={bulkLoading}
                        onClick={handleBulkDelete}
                        className="text-xs px-2.5 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                        Удалить
                    </button>
                    <div className="flex-1" />
                    <button onClick={clearSelection} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        <X className="h-3 w-3" /> Снять выбор
                    </button>
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                {/* tableLayout:fixed + explicit total width → each <col> width is absolute pixels, not ratio */}
                <table className="text-sm" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
                    <colgroup>
                        <col style={{ width: 40 }} />
                        {COL_KEYS.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
                    </colgroup>
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-3 py-3" style={{ width: 40 }}>
                                <input
                                    type="checkbox"
                                    checked={allPageSelected}
                                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                                    onChange={togglePage}
                                    className="rounded border-gray-300 cursor-pointer"
                                />
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 relative overflow-hidden"
                                onClick={() => handleSort('name')}
                            >
                                Имя <SortIcon k="name" />
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('name', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 relative overflow-hidden">
                                Телефон
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('phone', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 relative overflow-hidden">
                                Роль
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('role', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 relative overflow-hidden"
                                onClick={() => handleSort('plan')}
                            >
                                Подписка <SortIcon k="plan" />
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('plan', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 relative overflow-hidden"
                                onClick={() => handleSort('attendance_streak_days')}
                            >
                                Стрик <SortIcon k="attendance_streak_days" />
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('streak', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 relative overflow-hidden"
                                onClick={() => handleSort('points')}
                            >
                                Очки <SortIcon k="points" />
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('points', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 relative overflow-hidden"
                                onClick={() => handleSort('created_at')}
                            >
                                Регистрация <SortIcon k="created_at" />
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('registered', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 relative overflow-hidden">
                                Активность
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('activity', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 relative overflow-hidden">
                                Статус
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('status', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 relative overflow-hidden">
                                Действия
                                <div className="group absolute top-0 right-0 h-full w-3 cursor-col-resize z-10" onMouseDown={e => startResize('actions', e)}><div className="absolute right-1 top-2 h-4/5 w-px bg-gray-200 group-hover:bg-blue-400 group-hover:w-0.5 transition-all" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && paginated.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Загрузка...
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                                    Пользователи не найдены
                                </td>
                            </tr>
                        ) : paginated.map(user => (
                            <tr
                                key={user.id}
                                className={`hover:bg-gray-50 transition-colors ${selected.has(user.id) ? 'bg-blue-50' : ''}`}
                            >
                                <td className="px-3 py-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggleOne(user.id) }}>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(user.id)}
                                        readOnly
                                        tabIndex={-1}
                                        className="rounded border-gray-300 pointer-events-none"
                                    />
                                </td>
                                <td
                                    className="px-4 py-3 cursor-pointer"
                                    onClick={() => handleView(user)}
                                >
                                    <div className="font-medium text-gray-900 hover:text-blue-600 truncate max-w-[160px]">
                                        {user.name || <span className="text-gray-400 italic">Без имени</span>}
                                    </div>
                                    {user.grade && (
                                        <div className="text-xs text-gray-400">{user.grade} класс</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-600 tabular-nums">{user.phone || '—'}</td>
                                <td className="px-4 py-3">
                                    <Badge type="secondary">{roleLabel(user)}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-1">
                                        {subLabel(user)}
                                        {hiddenIds.has(user.id) && (
                                            <Badge type="secondary" icon={<EyeOff className="h-3 w-3" />}>
                                                Скрыт
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {user.attendance_streak_days > 0
                                        ? <span className="text-gray-700">{user.attendance_streak_days} дн.</span>
                                        : <span className="text-gray-300 text-xs">0</span>}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                    {user.points > 0
                                        ? <span className="text-gray-700">{user.points}</span>
                                        : <span className="text-gray-300 text-xs">0</span>}
                                </td>
                                <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                                    {formatDate(user.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                    <ActivityCell platforms={user.platforms || []} lastSeen={user.last_seen || null} />
                                </td>
                                <td className="px-4 py-3">
                                    <Badge type={user.is_active ? 'success' : 'error'}>
                                        {user.is_active ? 'Активен' : 'Заблокирован'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div
                                        className="flex items-center gap-0.5"
                                        onClick={e => e.stopPropagation()}
                                        ref={openSubMenu === user.id ? subMenuRef : null}
                                    >
                                        <Button variant="ghost" size="sm" onClick={() => handleView(user)}
                                            icon={<Eye className="h-4 w-4" />} title="Карточка" />
                                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)}
                                            icon={user.is_active
                                                ? <Lock className="h-4 w-4 text-orange-500" />
                                                : <Unlock className="h-4 w-4 text-green-600" />}
                                            title={user.is_active ? 'Заблокировать' : 'Разблокировать'} />
                                        <Button variant="ghost" size="sm" onClick={() => setAdjustUser(user)}
                                            icon={<Coins className="h-4 w-4 text-amber-500" />}
                                            title="Изменить очки" />
                                        <div className="relative">
                                            <Button variant="ghost" size="sm"
                                                onClick={() => setOpenSubMenu(openSubMenu === user.id ? null : user.id)}
                                                icon={<Crown className="h-4 w-4 text-yellow-500" />}
                                                title="Подписка" />
                                            {openSubMenu === user.id && (
                                                <div className="absolute right-0 top-8 z-50 w-44 rounded-md border border-gray-200 bg-white shadow-lg py-1">
                                                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                                                        onClick={() => handleGrantPro(user, 30)}>
                                                        <Crown className="h-3.5 w-3.5 text-yellow-500" /> PRO на 30 дней
                                                    </button>
                                                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                                                        onClick={() => handleGrantPro(user, 365)}>
                                                        <Crown className="h-3.5 w-3.5 text-yellow-500" /> PRO на год
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100" />
                                                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                                                        onClick={() => handleResetToFree(user)}>
                                                        Сбросить на FREE
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user)}
                                            icon={<Trash2 className="h-4 w-4 text-red-500" />}
                                            title="Удалить аккаунт" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Pagination ─────────────────────────────────────────── */}
                {sorted.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>На странице:</span>
                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                                className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                            >
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span>
                                Показано {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} из {sorted.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                            >«</button>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                            >‹</button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-2.5 py-1 text-xs rounded border ${page === currentPage ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-100'}`}
                                    >{page}</button>
                                )
                            })}
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                            >›</button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                            >»</button>
                        </div>
                    </div>
                )}
            </div>

            <AdjustPointsModal
                user={adjustUser}
                onClose={() => setAdjustUser(null)}
                onApplied={async () => { setAdjustUser(null); await refreshUsers({}) }}
            />
        </ListContainer>
    )
}

// ── Adjust points modal ──────────────────────────────────────────────────
// Selective +/- points for one user. Result is always clamped at 0 server-side
// (no "reason required" friction — see leaderboard_points backend docs); the
// preview below shows the clamped outcome before the admin confirms.
interface AdjustPointsModalProps {
    user: User | null
    onClose: () => void
    onApplied: () => void
}

const AdjustPointsModal: React.FC<AdjustPointsModalProps> = ({ user, onClose, onApplied }) => {
    const [deltaInput, setDeltaInput] = useState('')
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (user) { setDeltaInput(''); setReason('') }
    }, [user])

    if (!user) return null

    const delta = parseInt(deltaInput, 10)
    const validDelta = deltaInput.trim() !== '' && !isNaN(delta) && delta !== 0
    const preview = validDelta ? Math.max(0, user.points + delta) : null

    const apply = async () => {
        if (!validDelta) { toast.error('Введите ненулевое число очков'); return }
        setSaving(true)
        try {
            const result = await leaderboardPointsService.adjustPoints(user.id, delta, reason || undefined)
            toast.success(
                `${result.points_delta >= 0 ? '+' : ''}${result.points_delta} очков → "${user.name || user.phone}" (итого ${result.points_after})`
            )
            onApplied()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Не удалось изменить очки')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen={!!user} onClose={onClose} title="Изменить очки" maxWidth="sm">
            <div className="space-y-4">
                <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{user.name || user.phone}</span>
                    {' — текущие очки: '}
                    <span className="font-semibold tabular-nums">{user.points}</span>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Изменение (например 50 или -50)
                    </label>
                    <input
                        type="number"
                        value={deltaInput}
                        onChange={e => setDeltaInput(e.target.value)}
                        placeholder="50"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Причина (необязательно)
                    </label>
                    <input
                        type="text"
                        value={reason}
                        maxLength={500}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Например: компенсация за баг"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                {preview !== null && (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        Итого станет: <span className="font-semibold text-gray-800">{preview}</span>
                        {user.points + delta < 0 && ' (списание ограничено нулём)'}
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
                    <Button variant="primary" onClick={apply} disabled={saving || !validDelta} loading={saving}>
                        Применить
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

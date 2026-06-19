import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import {
    ArrowUpDown, ChevronDown, ChevronUp, Crown,
    Eye, EyeOff, Lock, RefreshCw, Star, Trash2, Unlock, Users as UsersIcon, X,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import Modal from '@/components/common/Modal'
import { leaderboardHiddenService } from '@/services/api'

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
    device_platform: string | null
    device_os_version: string | null
    app_version: string | null
    last_active_at: string | null
    created_at: string
    updated_at: string | null
}

type SortKey = 'name' | 'plan' | 'created_at' | 'attendance_streak_days' | 'points' | 'last_active_at'
type PlanFilter = '' | 'PRO' | 'FREE'

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

// Device platform → colored badge. Source is best-effort (latest analytics
// event / push-token registration), so missing values render a faint dash.
const platformLabel = (p: string | null): React.ReactNode => {
    if (!p) return <span className="text-gray-300">—</span>
    const n = p.toLowerCase()
    if (n.includes('ios') || n.includes('iphone') || n.includes('ipad')) return <Badge type="info">iOS</Badge>
    if (n.includes('android')) return <Badge type="success">Android</Badge>
    return <Badge type="secondary">{p}</Badge>
}

// "last_active_at" → human relative string. Used as a PROXY for install
// status (no real installed/uninstalled signal exists — FCM is disabled).
const relativeTime = (iso: string | null): string => {
    if (!iso) return '—'
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return '—'
    const diff = Date.now() - t
    if (diff < 0) return 'только что'
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин назад`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`
    const days = Math.floor(diff / 86_400_000)
    if (days < 30) return `${days} дн назад`
    return formatDate(iso)
}

// Freshness tint: green ≤7д, neutral ≤30д, faded beyond / unknown.
const activityClass = (iso: string | null): string => {
    if (!iso) return 'text-gray-300'
    const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
    if (days <= 7) return 'text-green-600'
    if (days <= 30) return 'text-gray-600'
    return 'text-gray-400'
}

export const UserList: React.FC = () => {
    const navigate = useNavigate()
    const { users, loading, fetchUsers, refreshUsers, updateUser, deleteUser, grantPro, resetToFree, adjustPoints } = useUserStore()

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [planFilter, setPlanFilter] = useState<PlanFilter>('')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
    const subMenuRef = useRef<HTMLDivElement>(null)

    // ── points-edit modal ───────────────────────────────────────────────────
    const [pointsUser, setPointsUser] = useState<User | null>(null)
    const [pointsMode, setPointsMode] = useState<'delta' | 'set'>('delta')
    const [pointsValue, setPointsValue] = useState('')
    const [pointsReason, setPointsReason] = useState('')
    const [pointsSaving, setPointsSaving] = useState(false)

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

    // ── stats ──────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const today = new Date().toDateString()
        return {
            total: users.length,
            pro: users.filter(u => u.plan === 'PRO').length,
            free: users.filter(u => u.plan !== 'PRO').length,
            expiringSoon: users.filter(u => {
                const d = daysRemaining(u)
                return d !== null && d >= 0 && d <= 7
            }).length,
            newToday: users.filter(u => u.created_at && new Date(u.created_at).toDateString() === today).length,
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
        return list
    }, [users, search, roleFilter, planFilter])

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

    // ── points editing ────────────────────────────────────────────────────
    const openPoints = (user: User) => {
        setPointsUser(user)
        setPointsMode('delta')
        setPointsValue('')
        setPointsReason('')
    }

    const handlePointsSave = async () => {
        if (!pointsUser) return
        const val = parseInt(pointsValue, 10)
        if (Number.isNaN(val)) { toast.error('Введите число'); return }
        if (pointsMode === 'set' && val < 0) { toast.error('В режиме «задать» значение ≥ 0'); return }
        setPointsSaving(true)
        try {
            const res = await adjustPoints(pointsUser.id, pointsMode, val, pointsReason.trim() || undefined)
            toast.success(`Баллы: ${res.total_points}${res.rank ? ` · место #${res.rank}` : ''}`)
            await refreshUsers({})
            setPointsUser(null)
        } catch { toast.error('Не удалось изменить баллы') }
        finally { setPointsSaving(false) }
    }

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

    const resetFilters = () => { setSearch(''); setRoleFilter(''); setPlanFilter(''); setCurrentPage(1) }
    const activeFiltersCount = (search ? 1 : 0) + (roleFilter ? 1 : 0) + (planFilter ? 1 : 0)

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

            {/* ── Stats bar ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                {[
                    { label: 'Всего', value: stats.total, color: 'text-gray-700' },
                    { label: 'PRO', value: stats.pro, color: 'text-blue-600' },
                    { label: 'FREE', value: stats.free, color: 'text-gray-500' },
                    { label: 'Истекает ≤7д', value: stats.expiringSoon, color: 'text-amber-600' },
                    { label: 'Новые сегодня', value: stats.newToday, color: 'text-green-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                ))}
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
                <table className="w-full text-sm min-w-[1180px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-10 px-3 py-3">
                                <input
                                    type="checkbox"
                                    checked={allPageSelected}
                                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                                    onChange={togglePage}
                                    className="rounded border-gray-300 cursor-pointer"
                                />
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[14%]"
                                onClick={() => handleSort('name')}
                            >
                                Имя <SortIcon k="name" />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[11%]">Телефон</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[8%]">Роль</th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[11%]"
                                onClick={() => handleSort('plan')}
                            >
                                Подписка <SortIcon k="plan" />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[8%]">Устройство</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[7%]">Версия</th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[6%]"
                                onClick={() => handleSort('attendance_streak_days')}
                            >
                                Стрик <SortIcon k="attendance_streak_days" />
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[8%]"
                                onClick={() => handleSort('points')}
                            >
                                Очки <SortIcon k="points" />
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[9%]"
                                onClick={() => handleSort('last_active_at')}
                                title="Последняя активность — прокси install-статуса (нет прямого сигнала об удалении)"
                            >
                                Активность <SortIcon k="last_active_at" />
                            </th>
                            <th
                                className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 w-[8%]"
                                onClick={() => handleSort('created_at')}
                            >
                                Регистрация <SortIcon k="created_at" />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[7%]">Статус</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-[11%]">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && paginated.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Загрузка...
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
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
                                    <div className="flex flex-col gap-0.5">
                                        {platformLabel(user.device_platform)}
                                        {user.device_os_version && (
                                            <span className="text-xs text-gray-400">{user.device_os_version}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">
                                    {user.app_version || <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {user.attendance_streak_days > 0 ? `${user.attendance_streak_days} дн.` : '—'}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                    <button
                                        onClick={() => openPoints(user)}
                                        className="group inline-flex items-center gap-1 text-gray-700 hover:text-blue-600"
                                        title="Изменить баллы"
                                    >
                                        <Star className="h-3.5 w-3.5 text-yellow-400 group-hover:text-blue-500" />
                                        {user.points > 0 ? user.points : 0}
                                        {user.rank != null && user.points > 0 && (
                                            <span className="text-xs text-gray-400">#{user.rank}</span>
                                        )}
                                    </button>
                                </td>
                                <td className={`px-4 py-3 tabular-nums text-xs ${activityClass(user.last_active_at)}`}>
                                    {relativeTime(user.last_active_at)}
                                </td>
                                <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                                    {formatDate(user.created_at)}
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
                                        <Button variant="ghost" size="sm" onClick={() => openPoints(user)}
                                            icon={<Star className="h-4 w-4 text-yellow-500" />}
                                            title="Изменить баллы" />
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

            {/* ── Points edit modal ──────────────────────────────────────── */}
            {pointsUser && (
                <Modal
                    isOpen
                    onClose={() => setPointsUser(null)}
                    title={`Баллы — ${pointsUser.name || pointsUser.phone || 'без имени'}`}
                    subtitle={`Сейчас: ${pointsUser.points}${pointsUser.rank ? ` · место #${pointsUser.rank}` : ''} в лидерборде`}
                    maxWidth="md"
                >
                    <div className="space-y-4">
                        {/* Mode toggle */}
                        <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
                            <button
                                onClick={() => setPointsMode('delta')}
                                className={`flex-1 px-3 py-2 ${pointsMode === 'delta' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                Добавить / убавить
                            </button>
                            <button
                                onClick={() => setPointsMode('set')}
                                className={`flex-1 px-3 py-2 ${pointsMode === 'set' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                Задать точное
                            </button>
                        </div>

                        {/* Value */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {pointsMode === 'delta' ? 'На сколько изменить (можно отрицательное)' : 'Новое значение баллов'}
                            </label>
                            <input
                                type="number"
                                value={pointsValue}
                                onChange={e => setPointsValue(e.target.value)}
                                placeholder={pointsMode === 'delta' ? 'напр. 50 или -20' : 'напр. 100'}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                autoFocus
                            />
                            {pointsMode === 'delta' && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {[10, 50, 100, -10, -50].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setPointsValue(String(n))}
                                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        >
                                            {n > 0 ? `+${n}` : n}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => { setPointsMode('set'); setPointsValue('0') }}
                                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Обнулить
                                    </button>
                                </div>
                            )}
                            {pointsMode === 'delta' && pointsValue !== '' && !Number.isNaN(parseInt(pointsValue, 10)) && (
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Итог: <span className="font-medium text-gray-700">{Math.max(0, pointsUser.points + parseInt(pointsValue, 10))}</span> баллов
                                </p>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Причина (попадёт в аудит-лог)</label>
                            <input
                                value={pointsReason}
                                onChange={e => setPointsReason(e.target.value)}
                                placeholder="напр. компенсация за баг, ручная корректировка"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setPointsUser(null)}>Отмена</Button>
                            <Button variant="primary" loading={pointsSaving} onClick={handlePointsSave} icon={<Star className="h-4 w-4" />}>
                                Сохранить
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </ListContainer>
    )
}

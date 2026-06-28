import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSecurityStore } from '@/stores/securityStore'
import { securityService, userService } from '@/services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Ban,
  Eye,
  Gift,
  CircleSlash,
  RefreshCw,
  RotateCcw,
  Shield,
  Snowflake,
  X,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import type { UserRiskProfile } from '@/stores/securityStore'

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const riskStatusBadge = (status: string) => {
  switch (status) {
    case 'blocked': return <Badge type="error">Заблокирован</Badge>
    case 'restricted': return <Badge type="warning">Ограничен</Badge>
    case 'normal': return <Badge type="success">Норма</Badge>
    default: return <Badge type="secondary">{status}</Badge>
  }
}

interface UserInfo { name: string; phone: string | null }

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'normal', label: 'Норма' },
  { value: 'restricted', label: 'Ограниченные' },
  { value: 'blocked', label: 'Заблокированные' },
]

const MIN_RISK_OPTIONS = [
  { value: 0, label: 'Любой риск' },
  { value: 25, label: 'Риск ≥ 25' },
  { value: 50, label: 'Риск ≥ 50' },
  { value: 75, label: 'Риск ≥ 75' },
]

export const SecurityUsersList: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { riskyUsers, loading, error, fetchRiskyUsers } = useSecurityStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minRisk, setMinRisk] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // User info cache
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({})
  const fetchingIds = useRef<Set<string>>(new Set())

  // Bulk selection: set of user_id strings
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const buildParams = (page = currentPage) => ({
    page, limit: pageSize,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(minRisk > 0 ? { min_risk: minRisk } : {}),
    ...(search ? { search } : {}),
  })

  const load = (page = 1) => {
    fetchRiskyUsers(buildParams(page))
    setSelectedIds(new Set())
  }

  const loadUserInfo = async (userIds: string[]) => {
    const toFetch = userIds.filter(id => id && !userInfoMap[id] && !fetchingIds.current.has(id))
    if (toFetch.length === 0) return
    toFetch.forEach(id => fetchingIds.current.add(id))
    const results = await Promise.allSettled(toFetch.map(id => userService.getById(id)))
    const updates: Record<string, UserInfo> = {}
    results.forEach((r, i) => {
      updates[toFetch[i]] = r.status === 'fulfilled' && r.value
        ? { name: r.value.name || r.value.username || '—', phone: r.value.phone || null }
        : { name: '—', phone: null }
      fetchingIds.current.delete(toFetch[i])
    })
    setUserInfoMap(prev => ({ ...prev, ...updates }))
  }

  useEffect(() => { load(1) }, [])

  useEffect(() => {
    const ids = (riskyUsers?.items ?? []).map((u: UserRiskProfile) => u.user_id).filter(Boolean)
    if (ids.length > 0) loadUserInfo([...new Set(ids)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskyUsers])

  const handleApplyFilters = () => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    fetchRiskyUsers(buildParams(1))
  }

  const handleReset = () => {
    setSearch(''); setStatusFilter(''); setMinRisk(0); setCurrentPage(1)
    setSelectedIds(new Set())
    fetchRiskyUsers({ page: 1, limit: pageSize })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedIds(new Set())
    fetchRiskyUsers(buildParams(page))
  }

  // -- Bulk actions --

  const bulkAction = async (
    label: string,
    fn: (userId: string) => Promise<any>,
    confirmText?: string,
  ) => {
    if (selectedIds.size === 0) return
    if (confirmText && !window.confirm(confirmText)) return
    setBulkLoading(true)
    try {
      await Promise.all([...selectedIds].map(id => fn(id)))
      toast.success(`${label}: ${selectedIds.size} пользователей`)
      setSelectedIds(new Set())
      load(currentPage)
    } catch {
      toast.error('Ошибка при массовом действии')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkWatchlist = () =>
    bulkAction('Добавлено в watchlist', id => securityService.setWatchlist(id, true, 'admin'))

  const handleBulkFreezePoints = () =>
    bulkAction(
      'Очки заморожены',
      id => securityService.setPointsFrozen(id, true, 'admin'),
      `Заморозить очки для ${selectedIds.size} пользователей?`,
    )

  const handleBulkResetRisk = () =>
    bulkAction(
      'Risk Score сброшен',
      id => securityService.resetRiskScore(id, 'admin'),
      `Сбросить Risk Score для ${selectedIds.size} пользователей?`,
    )

  const handleBulkBlock = () =>
    bulkAction(
      'Заблокированы',
      id => securityService.blockUser(id, { reason: 'Массовая блокировка администратором' }),
      `Заблокировать ${selectedIds.size} пользователей? Это действие необратимо.`,
    )

  const items: UserRiskProfile[] = riskyUsers?.items ?? []
  const total = riskyUsers?.total ?? 0
  const totalPages = Math.ceil(total / pageSize) || 1
  const allSelected = items.length > 0 && items.every(u => selectedIds.has(u.user_id))
  const someSelected = selectedIds.size > 0
  const activeFiltersCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (minRisk > 0 ? 1 : 0)

  const tabs = [
    { label: 'События',      path: '/security' },
    { label: 'Пользователи', path: '/security/users-list' },
    { label: 'Уведомления',  path: '/security/notifications' },
    { label: 'Политики',     path: '/security/policy' },
  ]

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); items.forEach(u => n.delete(u.user_id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); items.forEach(u => n.add(u.user_id)); return n })
    }
  }

  const toggleOne = (userId: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(userId) ? n.delete(userId) : n.add(userId)
      return n
    })
  }

  return (
    <ListContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          Безопасность
          {total > 0 && <span className="text-sm font-normal text-gray-400">({total} профилей)</span>}
        </h1>
        <Button variant="secondary" onClick={() => load(currentPage)} disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
          {loading ? 'Загрузка...' : 'Обновить'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 -mt-2 mb-4">
        {tabs.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === tab.path
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-600">Фильтры</span>
          {activeFiltersCount > 0 && (
            <button onClick={handleReset} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Сбросить ({activeFiltersCount})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
            placeholder="Поиск по UUID..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={minRisk} onChange={e => setMinRisk(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            {MIN_RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>Применить</Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-blue-800 mr-1">Выбрано: {selectedIds.size}</span>
          <Button variant="secondary" size="sm" disabled={bulkLoading} onClick={handleBulkWatchlist}
            icon={<Eye className="h-3.5 w-3.5 text-purple-600" />}>
            Watchlist
          </Button>
          <Button variant="secondary" size="sm" disabled={bulkLoading} onClick={handleBulkFreezePoints}
            icon={<Snowflake className="h-3.5 w-3.5 text-blue-600" />}>
            Заморозить очки
          </Button>
          <Button variant="secondary" size="sm" disabled={bulkLoading} onClick={handleBulkResetRisk}
            icon={<RotateCcw className="h-3.5 w-3.5 text-gray-600" />}>
            Сбросить риск
          </Button>
          <Button variant="danger" size="sm" disabled={bulkLoading} onClick={handleBulkBlock}
            icon={<Ban className="h-3.5 w-3.5" />}>
            Заблокировать
          </Button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-blue-500 hover:underline flex items-center gap-1">
            <X className="h-3 w-3" /> Сбросить выбор
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  title="Выбрать всех на странице"
                  className="rounded border-gray-300 cursor-pointer" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Пользователь</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Статус</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Risk Score</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Флаги</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Последняя активность</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">События</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Загрузка...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Профили риска не найдены
                </td>
              </tr>
            ) : items.map((user: UserRiskProfile) => {
              const isSelected = selectedIds.has(user.user_id)
              const info = userInfoMap[user.user_id]

              return (
                <tr key={user.id}
                  className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>

                  {/* Checkbox */}
                  <td className="px-3 py-3 w-8">
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleOne(user.user_id)}
                      className="rounded border-gray-300 cursor-pointer" />
                  </td>

                  {/* User: name + phone + UUID */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5 cursor-pointer"
                      onClick={() => navigate(`/security/users/${user.user_id}`)}
                      title={user.user_id}>
                      {info ? (
                        <>
                          <span className="text-xs font-semibold text-gray-800 leading-tight">{info.name}</span>
                          {info.phone && (
                            <span className="text-xs text-gray-500 font-mono leading-tight">{info.phone}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Загрузка…</span>
                      )}
                      <span className="text-xs text-blue-400 font-mono leading-tight">
                        {user.user_id.slice(0, 8)}…
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">{riskStatusBadge(user.status)}</td>

                  {/* Risk score */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.current_risk_score >= 75 ? 'bg-red-100 text-red-800' :
                      user.current_risk_score >= 50 ? 'bg-orange-100 text-orange-800' :
                      user.current_risk_score >= 25 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.current_risk_score}
                    </span>
                  </td>

                  {/* Flags */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {user.is_watchlisted && (
                        <span title="Watchlist" className="text-purple-500"><Eye className="h-3.5 w-3.5" /></span>
                      )}
                      {user.points_frozen && (
                        <span title="Очки заморожены" className="text-blue-500"><Snowflake className="h-3.5 w-3.5" /></span>
                      )}
                      {user.referral_disabled && (
                        <span title="Реферал отключён" className="text-gray-400"><CircleSlash className="h-3.5 w-3.5" /></span>
                      )}
                      {!user.is_watchlisted && !user.points_frozen && !user.referral_disabled && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Last activity */}
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(user.last_suspicious_activity_at)}
                  </td>

                  {/* Total events */}
                  <td className="px-3 py-3 text-xs text-gray-600 tabular-nums">
                    {user.total_suspicious_events}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <Button variant="ghost" size="sm"
                      onClick={() => navigate(`/security/users/${user.user_id}`)}
                      icon={<Shield className="h-4 w-4 text-gray-500" />}
                      title="Открыть профиль риска" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} из {total}
            </div>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => handlePageChange(1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">«</button>
              <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                return (
                  <button key={page} onClick={() => handlePageChange(page)}
                    className={`px-2.5 py-1 text-xs rounded border ${page === currentPage ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-100'}`}>
                    {page}
                  </button>
                )
              })}
              <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">›</button>
              <button disabled={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">»</button>
            </div>
          </div>
        )}
      </div>
    </ListContainer>
  )
}

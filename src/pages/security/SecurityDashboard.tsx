import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSecurityStore } from '@/stores/securityStore'
import { securityService, userService } from '@/services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  RefreshCw,
  Shield,
  User,
  X,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'

const EVENT_TYPE_LABELS: Record<string, string> = {
  rapid_points_farm: 'Накрутка очков',
  concurrent_submission: 'Конкурентная отправка',
  repeated_attempt: 'Повтор попытки',
  suspicious_login: 'Подозрительный вход',
  brute_force: 'Перебор кодов',
  bot_speed_answers: 'Скорость бота',
  pattern_answers: 'Шаблонные ответы',
  login_success: 'Вход',
  login_failed: 'Неудачный вход',
  admin_action: 'Действие администратора',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыто',
  reviewed: 'Проверено',
  false_positive: 'Ложная тревога',
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'open', label: 'Открытые' },
  { value: 'reviewed', label: 'Проверенные' },
  { value: 'false_positive', label: 'Ложные тревоги' },
]

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: 'rapid_points_farm', label: 'Накрутка очков' },
  { value: 'bot_speed_answers', label: 'Скорость бота' },
  { value: 'pattern_answers', label: 'Шаблонные ответы' },
  { value: 'repeated_attempt', label: 'Повтор попытки' },
  { value: 'suspicious_login', label: 'Подозрительный вход' },
  { value: 'login_failed', label: 'Неудачный вход' },
  { value: 'brute_force', label: 'Перебор кодов' },
  { value: 'admin_action', label: 'Действие администратора' },
]

const MIN_RISK_OPTIONS = [
  { value: 0, label: 'Любой риск' },
  { value: 25, label: 'Риск ≥ 25' },
  { value: 50, label: 'Риск ≥ 50' },
  { value: 75, label: 'Риск ≥ 75' },
]

const COL_WIDTHS_KEY = 'security_events_col_widths_v1'
// [checkbox, date, user, ip, type, risk, reason, status, actions]
const DEFAULT_COL_WIDTHS = [32, 140, 160, 110, 130, 70, 160, 110, 100]
const COL_HEADERS = ['Дата / время', 'Пользователь', 'IP', 'Тип события', 'Risk', 'Причина', 'Статус', 'Действия']

interface UserInfo {
  name: string
  phone: string | null
}

export const SecurityDashboard: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { overview, events, loading, error, fetchOverview, fetchEvents, blockUser } = useSecurityStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [minRisk, setMinRisk] = useState(0)
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // User info cache: user_id → {name, phone}
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({})
  const fetchingUserIds = useRef<Set<string>>(new Set())

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Resizable columns (persisted)
  const [colWidths, setColWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_COL_WIDTHS.length) return parsed
      }
    } catch {}
    return [...DEFAULT_COL_WIDTHS]
  })
  const colWidthsRef = useRef(colWidths)
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null)

  const buildParams = (page = currentPage) => ({
    page,
    limit: pageSize,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(eventTypeFilter ? { event_type: eventTypeFilter } : {}),
    ...(minRisk > 0 ? { min_risk: minRisk } : {}),
    ...(search ? (() => {
      if (/^\d{1,3}\.\d{1,3}/.test(search)) return { ip: search }
      if (/^[0-9a-f-]{8,}$/i.test(search)) return { user_id: search }
      return { device_id: search }
    })() : {}),
    ...(onlyUnreviewed ? { status: 'open' } : {}),
  })

  const loadUserInfo = async (userIds: string[]) => {
    const toFetch = userIds.filter(id => id && !userInfoMap[id] && !fetchingUserIds.current.has(id))
    if (toFetch.length === 0) return
    toFetch.forEach(id => fetchingUserIds.current.add(id))
    const results = await Promise.allSettled(toFetch.map(id => userService.getById(id)))
    const updates: Record<string, UserInfo> = {}
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        updates[toFetch[i]] = { name: r.value.name || r.value.username || '—', phone: r.value.phone || null }
      } else {
        updates[toFetch[i]] = { name: '—', phone: null }
      }
      fetchingUserIds.current.delete(toFetch[i])
    })
    setUserInfoMap(prev => ({ ...prev, ...updates }))
  }

  const load = (page = 1) => {
    fetchOverview()
    fetchEvents(buildParams(page))
    setSelectedIds(new Set())
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync colWidths ref so resize handlers see latest value without stale closures
  useEffect(() => { colWidthsRef.current = colWidths }, [colWidths])

  // When events change, load user info for visible rows
  useEffect(() => {
    const ids = (events?.items ?? [])
      .map((e: any) => e.user_id)
      .filter(Boolean) as string[]
    if (ids.length > 0) loadUserInfo([...new Set(ids)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  const handleApplyFilters = () => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    fetchOverview()
    fetchEvents(buildParams(1))
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setEventTypeFilter('')
    setMinRisk(0)
    setOnlyUnreviewed(false)
    setCurrentPage(1)
    setSelectedIds(new Set())
    fetchOverview()
    fetchEvents({ page: 1, limit: pageSize })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedIds(new Set())
    fetchEvents(buildParams(page))
  }

  const handleResizeStart = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault()
    resizingRef.current = { colIdx, startX: e.clientX, startW: colWidthsRef.current[colIdx] }
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const delta = ev.clientX - resizingRef.current.startX
      const newW = Math.max(50, resizingRef.current.startW + delta)
      setColWidths(prev => { const next = [...prev]; next[resizingRef.current!.colIdx] = newW; return next })
    }
    const onUp = () => {
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidthsRef.current))
      resizingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleBlockUser = async (userId: string) => {
    const reason = window.prompt('Причина блокировки:')
    if (reason === null) return
    try {
      await blockUser(userId, { reason: reason || 'Заблокировано администратором' })
      toast.success('Пользователь заблокирован')
      load(currentPage)
    } catch {
      toast.error('Не удалось заблокировать пользователя')
    }
  }

  // Single event actions
  const handleMarkReviewed = async (eventId: number) => {
    try {
      await securityService.markEventReviewed(eventId)
      toast.success('Отмечено как проверенное')
      load(currentPage)
    } catch {
      toast.error('Не удалось отметить событие')
    }
  }

  // Bulk actions
  const handleBulkMarkReviewed = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await Promise.all([...selectedIds].map(id => securityService.markEventReviewed(id)))
      toast.success(`Отмечено ${selectedIds.size} событий`)
      setSelectedIds(new Set())
      load(currentPage)
    } catch {
      toast.error('Ошибка при массовом обновлении')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkFalsePositive = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Отметить ${selectedIds.size} событий как ложные тревоги?`)) return
    setBulkLoading(true)
    try {
      await Promise.all([...selectedIds].map(id => securityService.markEventFalsePositive(id)))
      toast.success(`${selectedIds.size} событий отмечено как ложные тревоги`)
      setSelectedIds(new Set())
      load(currentPage)
    } catch {
      toast.error('Ошибка при массовом обновлении')
    } finally {
      setBulkLoading(false)
    }
  }

  const items = events?.items ?? []
  const total = events?.total ?? 0
  const totalPages = Math.ceil(total / pageSize) || 1

  const openItems = items.filter((e: any) => e.status === 'open')
  const allOpenSelected = openItems.length > 0 && openItems.every((e: any) => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allOpenSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        openItems.forEach((e: any) => next.delete(e.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        openItems.forEach((e: any) => next.add(e.id))
        return next
      })
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeFiltersCount =
    (search ? 1 : 0) + (statusFilter ? 1 : 0) + (eventTypeFilter ? 1 : 0) +
    (minRisk > 0 ? 1 : 0) + (onlyUnreviewed ? 1 : 0)

  const tabs = [
    { label: 'События',      path: '/security' },
    { label: 'Пользователи', path: '/security/users-list' },
    { label: 'Уведомления',  path: '/security/notifications' },
    { label: 'Политики',     path: '/security/policy' },
  ]

  return (
    <ListContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          Безопасность
          {total > 0 && <span className="text-sm font-normal text-gray-400">({total} событий)</span>}
        </h1>
        <Button
          variant="secondary"
          onClick={() => load(currentPage)}
          disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          {loading ? 'Загрузка...' : 'Обновить'}
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 -mt-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === tab.path
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Подозрит. польз. 24ч', value: overview?.suspicious_users_24h ?? '—', color: (overview?.suspicious_users_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700' },
          { label: 'Подозрит. событий 24ч', value: overview?.suspicious_events_24h ?? '—', color: (overview?.suspicious_events_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700' },
          { label: 'Заблокированные', value: overview?.blocked_accounts ?? '—', color: (overview?.blocked_accounts ?? 0) > 0 ? 'text-red-600' : 'text-gray-700' },
          { label: 'Ограниченные', value: overview?.restricted_accounts ?? '—', color: (overview?.restricted_accounts ?? 0) > 0 ? 'text-orange-600' : 'text-gray-700' },
          { label: 'Открытые события', value: overview?.open_events ?? '—', color: (overview?.open_events ?? 0) > 0 ? 'text-blue-600' : 'text-gray-700' },
          { label: 'Подозрит. очки 24ч', value: overview?.suspicious_points_24h ?? '—', color: (overview?.suspicious_points_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-600">Фильтры</span>
          {activeFiltersCount > 0 && (
            <button onClick={handleResetFilters} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Сбросить ({activeFiltersCount})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
            placeholder="User ID / IP / Device ID..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            {EVENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={minRisk} onChange={e => setMinRisk(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            {MIN_RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={onlyUnreviewed} onChange={e => setOnlyUnreviewed(e.target.checked)}
              className="rounded border-gray-300" />
            Только открытые
          </label>
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>Применить</Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            Выбрано: {selectedIds.size}
          </span>
          <Button variant="secondary" size="sm" onClick={handleBulkMarkReviewed} disabled={bulkLoading}
            icon={<CheckCircle className="h-3.5 w-3.5 text-green-600" />}>
            Отметить проверенными
          </Button>
          <Button variant="secondary" size="sm" onClick={handleBulkFalsePositive} disabled={bulkLoading}
            icon={<Shield className="h-3.5 w-3.5 text-gray-500" />}>
            Ложные тревоги
          </Button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-blue-500 hover:underline flex items-center gap-1">
            <X className="h-3 w-3" /> Сбросить выбор
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) + 'px' }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3" style={{ width: colWidths[0] + 'px' }}>
                <input
                  type="checkbox"
                  checked={allOpenSelected}
                  onChange={toggleSelectAll}
                  title="Выбрать все открытые на странице"
                  className="rounded border-gray-300 cursor-pointer"
                />
              </th>
              {COL_HEADERS.map((label, i) => (
                <th
                  key={i}
                  className="px-3 py-3 text-left font-medium text-gray-500 text-xs relative select-none"
                  style={{ width: colWidths[i + 1] + 'px' }}
                >
                  <span className="block truncate pr-2">{label}</span>
                  <div
                    onMouseDown={e => handleResizeStart(e, i + 1)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-300 z-10"
                    title="Тянуть для изменения ширины"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  Подозрительных событий не найдено
                </td>
              </tr>
            ) : items.map((event: any) => {
              const isSelected = selectedIds.has(event.id)
              const isOpen = event.status === 'open'
              const userInfo = event.user_id ? userInfoMap[event.user_id] : null

              return (
                <tr
                  key={event.id}
                  className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-3 w-8">
                    {isOpen && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(event.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                    {formatDateTime(event.created_at)}
                  </td>

                  {/* User: name + phone grouped */}
                  <td className="px-3 py-3">
                    <div
                      className="flex flex-col gap-0.5 cursor-pointer"
                      onClick={() => navigate(`/security/users/${event.user_id}`)}
                      title={event.user_id}
                    >
                      {userInfo ? (
                        <>
                          <span className="text-xs font-medium text-gray-800 leading-tight">
                            {userInfo.name}
                          </span>
                          {userInfo.phone && (
                            <span className="text-xs text-gray-400 font-mono leading-tight">
                              {userInfo.phone}
                            </span>
                          )}
                          <span className="text-xs text-blue-400 font-mono leading-tight truncate max-w-[96px]">
                            {event.user_id ? event.user_id.slice(0, 8) + '…' : '—'}
                          </span>
                        </>
                      ) : event.user_id ? (
                        <span className="text-xs text-blue-500 font-mono">
                          {event.user_id.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* IP */}
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                    {event.ip_address || '—'}
                  </td>

                  {/* Event type */}
                  <td className="px-3 py-3">
                    <Badge type="info">
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                  </td>

                  {/* Risk score */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.risk_score >= 75 ? 'bg-red-100 text-red-800' :
                      event.risk_score >= 50 ? 'bg-orange-100 text-orange-800' :
                      event.risk_score >= 25 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {event.risk_score}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="px-3 py-3 text-gray-600 text-xs max-w-[160px]">
                    <span title={event.reason ?? ''} className="truncate block">{event.reason || '—'}</span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <Badge type={
                      event.status === 'open' ? 'warning' :
                      event.status === 'reviewed' ? 'success' : 'secondary'
                    }>
                      {STATUS_LABELS[event.status] ?? event.status}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="sm"
                        onClick={() => navigate(`/security/users/${event.user_id}`)}
                        icon={<User className="h-4 w-4" />} title="Профиль риска" />
                      {isOpen && (
                        <Button variant="ghost" size="sm"
                          onClick={() => handleMarkReviewed(event.id)}
                          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                          title="Отметить проверенным" />
                      )}
                      <Button variant="ghost" size="sm"
                        onClick={() => handleBlockUser(event.user_id)}
                        icon={<Ban className="h-4 w-4 text-red-500" />}
                        title="Заблокировать пользователя" />
                    </div>
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

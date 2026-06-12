import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecurityStore } from '@/stores/securityStore'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Eye,
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

const riskBadgeType = (score: number): 'success' | 'warning' | 'error' | 'info' => {
  if (score < 25) return 'success'
  if (score < 50) return 'warning'
  if (score < 75) return 'warning'
  return 'error'
}

const riskBadgeClass = (score: number): string => {
  if (score < 25) return ''
  if (score < 50) return ''
  if (score < 75) return 'bg-orange-100 text-orange-800'
  return ''
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
  { value: 'concurrent_submission', label: 'Конкурентная отправка' },
  { value: 'repeated_attempt', label: 'Повтор попытки' },
  { value: 'suspicious_login', label: 'Подозрительный вход' },
  { value: 'brute_force', label: 'Перебор кодов' },
]

const MIN_RISK_OPTIONS = [
  { value: 0, label: 'Любой риск' },
  { value: 25, label: 'Риск ≥ 25' },
  { value: 50, label: 'Риск ≥ 50' },
  { value: 75, label: 'Риск ≥ 75' },
]

export const SecurityDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { overview, events, loading, error, fetchOverview, fetchEvents, markEventReviewed, blockUser } = useSecurityStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [minRisk, setMinRisk] = useState(0)
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  const buildParams = (page = currentPage) => ({
    page,
    limit: pageSize,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(eventTypeFilter ? { event_type: eventTypeFilter } : {}),
    ...(minRisk > 0 ? { min_risk: minRisk } : {}),
    ...(search ? (() => {
      // Detect what search is: UUID-like = user_id, IP pattern = ip, else device_id
      if (/^\d{1,3}\.\d{1,3}/.test(search)) return { ip: search }
      if (/^[0-9a-f-]{8,}$/i.test(search)) return { user_id: search }
      return { device_id: search }
    })() : {}),
    ...(onlyUnreviewed ? { status: 'open' } : {}),
  })

  const load = (page = 1) => {
    fetchOverview()
    fetchEvents(buildParams(page))
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApplyFilters = () => {
    setCurrentPage(1)
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
    fetchOverview()
    fetchEvents({ page: 1, limit: pageSize })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchEvents(buildParams(page))
  }

  const handleMarkReviewed = async (eventId: number) => {
    try {
      await markEventReviewed(eventId)
      toast.success('Событие отмечено как проверенное')
    } catch {
      toast.error('Не удалось отметить событие')
    }
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

  const items = events?.items ?? []
  const total = events?.total ?? 0
  const totalPages = Math.ceil(total / pageSize) || 1

  const activeFiltersCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (eventTypeFilter ? 1 : 0) +
    (minRisk > 0 ? 1 : 0) +
    (onlyUnreviewed ? 1 : 0)

  return (
    <ListContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          Безопасность
          {total > 0 && (
            <span className="text-sm font-normal text-gray-400">({total} событий)</span>
          )}
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

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          {
            label: 'Подозрит. пользователи 24ч',
            value: overview?.suspicious_users_24h ?? '—',
            color: (overview?.suspicious_users_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700',
          },
          {
            label: 'Подозрит. события 24ч',
            value: overview?.suspicious_events_24h ?? '—',
            color: (overview?.suspicious_events_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700',
          },
          {
            label: 'Заблокированные',
            value: overview?.blocked_accounts ?? '—',
            color: (overview?.blocked_accounts ?? 0) > 0 ? 'text-red-600' : 'text-gray-700',
          },
          {
            label: 'Ограниченные',
            value: overview?.restricted_accounts ?? '—',
            color: (overview?.restricted_accounts ?? 0) > 0 ? 'text-orange-600' : 'text-gray-700',
          },
          {
            label: 'Открытые события',
            value: overview?.open_events ?? '—',
            color: (overview?.open_events ?? 0) > 0 ? 'text-blue-600' : 'text-gray-700',
          },
          {
            label: 'Подозрит. очки 24ч',
            value: overview?.suspicious_points_24h ?? '—',
            color: (overview?.suspicious_points_24h ?? 0) > 0 ? 'text-amber-600' : 'text-gray-700',
          },
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
              <X className="h-3 w-3" /> Сбросить
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
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={eventTypeFilter}
            onChange={e => setEventTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {EVENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={minRisk}
            onChange={e => setMinRisk(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {MIN_RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyUnreviewed}
              onChange={e => setOnlyUnreviewed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Только непроверенные
          </label>
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>
            Применить
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Дата / время</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Device ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Тип события</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Risk Score</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Причина</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Действия</th>
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
            ) : items.map(event => (
              <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                  {formatDateTime(event.created_at)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/users/${event.user_id}`)}
                    className="text-blue-600 hover:underline font-mono text-xs truncate max-w-[100px] block"
                    title={event.user_id}
                  >
                    {event.user_id.length > 12 ? `${event.user_id.slice(0, 8)}…` : event.user_id}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {event.ip_address || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {event.device_id
                    ? <span title={event.device_id}>{event.device_id.length > 10 ? `${event.device_id.slice(0, 8)}…` : event.device_id}</span>
                    : '—'
                  }
                </td>
                <td className="px-4 py-3">
                  <Badge type="info">
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.risk_score >= 75 ? 'bg-red-100 text-red-800' :
                    event.risk_score >= 50 ? 'bg-orange-100 text-orange-800' :
                    event.risk_score >= 25 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {event.risk_score}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                  <span title={event.reason ?? ''} className="truncate block">
                    {event.reason || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge type={
                    event.status === 'open' ? 'warning' :
                    event.status === 'reviewed' ? 'success' :
                    'secondary'
                  }>
                    {STATUS_LABELS[event.status] ?? event.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/security/users/${event.user_id}`)}
                      icon={<User className="h-4 w-4" />}
                      title="Профиль риска"
                    />
                    {event.status === 'open' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkReviewed(event.id)}
                        icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                        title="Отметить проверенным"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockUser(event.user_id)}
                      icon={<Ban className="h-4 w-4 text-red-500" />}
                      title="Заблокировать пользователя"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Показано {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} из {total}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >«</button>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-2.5 py-1 text-xs rounded border ${page === currentPage ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-100'}`}
                  >{page}</button>
                )
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >›</button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </ListContainer>
  )
}

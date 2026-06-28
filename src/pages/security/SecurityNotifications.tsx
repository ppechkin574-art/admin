import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { securityService, userService } from '@/services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Ban, Bell, CheckCircle, Eye, RefreshCw, Shield, User, X,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'

const SOURCE_LABELS: Record<string, string> = {
  rapid_points_farm:     'Накрутка очков (быстрый экзамен)',
  bot_speed_answers:     'Скорость бота (<2с на ответ)',
  pattern_answers:       'Шаблонные ответы (≥80% одна позиция)',
  repeated_attempt:      'Повтор попытки',
  suspicious_login:      'Подозрительный вход (новый город)',
  brute_force:           'Брутфорс — перебор паролей',
  concurrent_submission: 'Конкурентная отправка',
  critical_risk_alert:   'Критический уровень риска (авто)',
}

type Urgency = 'critical' | 'high' | 'medium'

function urgencyOf(score: number): Urgency {
  if (score >= 80) return 'critical'
  if (score >= 65) return 'high'
  return 'medium'
}

function recommendation(score: number): string {
  if (score >= 80) return 'Требует блокировки — ожидает одобрения администратора'
  if (score >= 65) return 'Рекомендуется ограничить доступ (24ч – 7д)'
  return 'Рекомендуется добавить в Watchlist для мониторинга'
}

const URGENCY: Record<Urgency, { card: string; badge: string; label: string; dot: string; rec: string }> = {
  critical: { card: 'border-red-200 bg-red-50',    badge: 'bg-red-100 text-red-800',    label: 'Критический', dot: 'bg-red-500',    rec: 'bg-red-100 text-red-700' },
  high:     { card: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-800', label: 'Высокий',    dot: 'bg-orange-400', rec: 'bg-orange-100 text-orange-700' },
  medium:   { card: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800', label: 'Средний',   dot: 'bg-yellow-400', rec: 'bg-yellow-100 text-yellow-700' },
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  return `${Math.floor(hrs / 24)} д. назад`
}

interface UserInfo { name: string; phone: string | null }

const TABS = [
  { label: 'События',      path: '/security' },
  { label: 'Пользователи', path: '/security/users-list' },
  { label: 'Уведомления',  path: '/security/notifications' },
  { label: 'Политики',     path: '/security/policy' },
]

export const SecurityNotifications: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [events,     setEvents]     = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({})
  const [actioning,  setActioning]  = useState<Record<number, boolean>>({})
  const fetchingRef = useRef<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await securityService.getEvents({ status: 'open', min_risk: 50, limit: 100, page: 1 })
      const items = (res?.items ?? []).sort((a: any, b: any) => b.risk_score - a.risk_score)
      setEvents(items)
      const ids = [...new Set<string>(items.map((e: any) => e.user_id).filter(Boolean))]
      loadUserInfo(ids)
    } catch {
      toast.error('Не удалось загрузить уведомления')
    } finally {
      setLoading(false)
    }
  }

  const loadUserInfo = async (ids: string[]) => {
    const toFetch = ids.filter(id => id && !userInfoMap[id] && !fetchingRef.current.has(id))
    if (!toFetch.length) return
    toFetch.forEach(id => fetchingRef.current.add(id))
    const results = await Promise.allSettled(toFetch.map(id => userService.getById(id)))
    const updates: Record<string, UserInfo> = {}
    results.forEach((r, i) => {
      updates[toFetch[i]] = r.status === 'fulfilled' && r.value
        ? { name: r.value.name || r.value.username || '—', phone: r.value.phone || null }
        : { name: '—', phone: null }
      fetchingRef.current.delete(toFetch[i])
    })
    setUserInfoMap(prev => ({ ...prev, ...updates }))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (eventId: number, fn: () => Promise<void>, successMsg: string) => {
    setActioning(p => ({ ...p, [eventId]: true }))
    try {
      await fn()
      toast.success(successMsg)
      setEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err: any) {
      if (err?.message !== 'cancelled') toast.error('Ошибка: ' + successMsg)
    } finally {
      setActioning(p => { const n = { ...p }; delete n[eventId]; return n })
    }
  }

  const criticalCount = events.filter(e => e.risk_score >= 80).length
  const totalCount    = events.length

  return (
    <ListContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500" />
          Уведомления администратора
          {criticalCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {criticalCount} критических
            </span>
          )}
        </h1>
        <Button variant="secondary" onClick={load} disabled={loading}
          icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
          {loading ? 'Загрузка...' : 'Обновить'}
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 -mt-2 mb-4">
        {TABS.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              location.pathname === tab.path
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
            {tab.path === '/security/notifications' && totalCount > 0 && (
              <span className="absolute -top-0.5 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Policy banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
        <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>Политика:</strong> блокировка выполняется <strong>только вручную</strong> администратором после проверки.
          Система не блокирует автоматически. Ниже — события Risk ≥ 50, ожидающие вашего решения.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
          <p className="text-sm font-medium text-gray-600">Нет событий, требующих внимания</p>
          <p className="text-xs mt-1">Все открытые события с Risk ≥ 50 проверены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const urgency  = urgencyOf(event.risk_score)
            const style    = URGENCY[urgency]
            const userInfo = event.user_id ? userInfoMap[event.user_id] : null
            const busy     = !!actioning[event.id]

            return (
              <div key={event.id} className={`border rounded-lg p-4 ${style.card}`}>
                {/* Row 1: urgency + score + time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="text-sm font-bold text-gray-800">Risk Score: {event.risk_score}</span>
                  </div>
                  <span className="text-xs text-gray-400">{event.created_at ? timeAgo(event.created_at) : '—'}</span>
                </div>

                {/* Row 2: user + source */}
                <div className="flex flex-wrap gap-6 mb-3">
                  {/* User */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Пользователь</p>
                      {userInfo
                        ? <>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{userInfo.name}</p>
                            {userInfo.phone && <p className="text-xs text-gray-500 font-mono leading-tight">{userInfo.phone}</p>}
                          </>
                        : <p className="text-xs text-gray-500 font-mono">{event.user_id?.slice(0, 16)}…</p>
                      }
                      <p className="text-xs text-blue-400 font-mono mt-0.5">{event.user_id?.slice(0, 8)}…</p>
                    </div>
                  </div>

                  {/* Source */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Источник (детектор)</p>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">
                        {SOURCE_LABELS[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                    {event.reason && (
                      <p className="text-xs text-gray-500 max-w-xs" title={event.reason}>{event.reason}</p>
                    )}
                    {event.ip_address && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">IP: {event.ip_address}</p>
                    )}
                  </div>
                </div>

                {/* Recommendation bar */}
                <div className={`rounded px-3 py-2 mb-3 text-xs font-medium flex items-center gap-2 ${style.rec}`}>
                  <span>⚡</span>
                  <span>{recommendation(event.risk_score)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {event.risk_score >= 80 && (
                    <button disabled={busy}
                      onClick={() => act(event.id, async () => {
                        const reason = window.prompt('Укажите причину блокировки:')
                        if (reason === null) throw new Error('cancelled')
                        await securityService.blockUser(event.user_id, { reason: reason || 'Заблокировано по решению администратора' })
                        await securityService.markEventReviewed(event.id)
                      }, 'Пользователь заблокирован')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                      <Ban className="h-3.5 w-3.5" /> Одобрить блокировку
                    </button>
                  )}

                  {event.risk_score >= 65 && (
                    <button disabled={busy}
                      onClick={() => act(event.id, async () => {
                        const reason = window.prompt('Причина ограничения (или Enter для стандартной):')
                        if (reason === null) throw new Error('cancelled')
                        await securityService.restrictUser(event.user_id, { reason: reason || 'Ограничено администратором' })
                        await securityService.markEventReviewed(event.id)
                      }, 'Доступ ограничен')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50">
                      <AlertTriangle className="h-3.5 w-3.5" /> Ограничить
                    </button>
                  )}

                  <button disabled={busy}
                    onClick={() => act(event.id, async () => {
                      await securityService.setWatchlist(event.user_id, true, 'admin')
                      await securityService.markEventReviewed(event.id)
                    }, 'Добавлено в Watchlist')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 text-gray-700">
                    <Eye className="h-3.5 w-3.5" /> Watchlist
                  </button>

                  <button disabled={busy}
                    onClick={() => act(event.id,
                      () => securityService.markEventFalsePositive(event.id).then(() => {}),
                      'Отмечено как ложная тревога')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 text-gray-700">
                    <X className="h-3.5 w-3.5" /> Ложная тревога
                  </button>

                  <button disabled={busy}
                    onClick={() => act(event.id,
                      () => securityService.markEventReviewed(event.id).then(() => {}),
                      'Отмечено как проверенное')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 text-gray-700">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" /> Проверено
                  </button>

                  <button onClick={() => navigate(`/security/users/${event.user_id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:underline ml-auto">
                    <User className="h-3.5 w-3.5" /> Профиль →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ListContainer>
  )
}

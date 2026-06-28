import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { securityService } from '@/services/api'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Gift,
  GiftOff,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldOff,
  Snowflake,
  UserX,
} from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import type { FraudEvent, UserRiskProfile } from '@/stores/securityStore'

const EVENT_TYPE_LABELS: Record<string, string> = {
  rapid_points_farm: 'Накрутка очков',
  concurrent_submission: 'Конкурентная отправка',
  repeated_attempt: 'Повтор попытки',
  suspicious_login: 'Подозрительный вход',
  brute_force: 'Перебор кодов',
  bot_speed_answers: 'Скорость бота',
  pattern_answers: 'Шаблонные ответы',
  login_success: 'Вход в систему',
  login_failed: 'Неудачный вход',
  admin_action: 'Действие администратора',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыто',
  reviewed: 'Проверено',
  false_positive: 'Ложная тревога',
}

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
    case 'watched': return <Badge type="warning">Наблюдение</Badge>
    case 'normal': return <Badge type="success">Норма</Badge>
    default: return <Badge type="secondary">{status}</Badge>
  }
}

interface PointsHistoryItem {
  id: number
  user_id: string
  points_delta: number
  points_before: number
  points_after: number
  source_id: string | null
  source_type: string | null
  is_suspicious: boolean
  created_at: string
}

export const SecurityUserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserRiskProfile | null>(null)
  const [events, setEvents] = useState<FraudEvent[]>([])
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([])
  const [bruteForce, setBruteForce] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [eventsPage, setEventsPage] = useState(1)
  const [eventsTotal, setEventsTotal] = useState(0)
  const [pointsPage, setPointsPage] = useState(1)
  const [pointsTotal, setPointsTotal] = useState(0)
  const pageSize = 20

  const loadData = async (ePage = eventsPage, pPage = pointsPage) => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [profileData, eventsData, pointsData, bfData] = await Promise.all([
        securityService.getUserRiskProfile(userId),
        securityService.getUserActivity(userId, { page: ePage, limit: pageSize }),
        securityService.getUserPointsHistory(userId, { page: pPage, limit: pageSize }),
        securityService.getBruteForceStatus(userId).catch(() => null),
      ])
      setProfile(profileData)
      setEvents(eventsData?.items ?? eventsData ?? [])
      setEventsTotal(eventsData?.total ?? 0)
      setPointsHistory(pointsData?.items ?? pointsData ?? [])
      setPointsTotal(pointsData?.total ?? 0)
      setBruteForce(bfData?.keycloak_brute_force ?? null)
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleRestrict = async () => {
    if (!userId) return
    const reason = window.prompt('Причина ограничения:')
    if (reason === null) return
    const until = window.prompt('До какой даты (YYYY-MM-DD, оставьте пустым для бессрочного):')
    try {
      await securityService.restrictUser(userId, {
        reason: reason || 'Ограничено администратором',
        ...(until ? { until } : {}),
      })
      toast.success('Пользователь ограничен')
      loadData()
    } catch {
      toast.error('Не удалось ограничить пользователя')
    }
  }

  const handleBlock = async () => {
    if (!userId) return
    const reason = window.prompt('Причина блокировки:')
    if (reason === null) return
    try {
      await securityService.blockUser(userId, { reason: reason || 'Заблокировано администратором' })
      toast.success('Пользователь заблокирован')
      loadData()
    } catch {
      toast.error('Не удалось заблокировать пользователя')
    }
  }

  const handleUnrestrict = async () => {
    if (!userId) return
    if (!window.confirm('Снять ограничение с пользователя?')) return
    try {
      await securityService.unrestrictUser(userId)
      toast.success('Ограничение снято')
      loadData()
    } catch {
      toast.error('Не удалось снять ограничение')
    }
  }

  const handleMarkReviewed = async (eventId: number) => {
    try {
      await securityService.markEventReviewed(eventId)
      toast.success('Событие отмечено как проверенное')
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'reviewed' } : e))
    } catch {
      toast.error('Не удалось отметить событие')
    }
  }

  const handleMarkFalsePositive = async (eventId: number) => {
    if (!window.confirm('Отметить как ложное срабатывание?')) return
    try {
      await securityService.markEventFalsePositive(eventId)
      toast.success('Отмечено как ложная тревога')
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'false_positive' } : e))
    } catch {
      toast.error('Не удалось обновить статус события')
    }
  }

  const handleToggleWatchlist = async () => {
    if (!userId || !profile) return
    const next = !profile.is_watchlisted
    if (!window.confirm(next ? 'Добавить в watchlist?' : 'Убрать из watchlist?')) return
    try {
      await securityService.setWatchlist(userId, next, 'admin')
      toast.success(next ? 'Добавлен в watchlist' : 'Убран из watchlist')
      setProfile(p => p ? { ...p, is_watchlisted: next } : p)
    } catch {
      toast.error('Не удалось изменить watchlist')
    }
  }

  const handleTogglePointsFrozen = async () => {
    if (!userId || !profile) return
    const next = !profile.points_frozen
    if (!window.confirm(next ? 'Заморозить начисление очков?' : 'Разморозить очки?')) return
    try {
      await securityService.setPointsFrozen(userId, next, 'admin')
      toast.success(next ? 'Очки заморожены' : 'Очки разморожены')
      setProfile(p => p ? { ...p, points_frozen: next } : p)
    } catch {
      toast.error('Не удалось изменить заморозку очков')
    }
  }

  const handleToggleReferralDisabled = async () => {
    if (!userId || !profile) return
    const next = !profile.referral_disabled
    if (!window.confirm(next ? 'Отключить реферальные вознаграждения?' : 'Включить реферальные вознаграждения?')) return
    try {
      await securityService.setReferralDisabled(userId, next, 'admin')
      toast.success(next ? 'Реферальные вознаграждения отключены' : 'Реферальные вознаграждения включены')
      setProfile(p => p ? { ...p, referral_disabled: next } : p)
    } catch {
      toast.error('Не удалось изменить реферальные вознаграждения')
    }
  }

  const handleResetRiskScore = async () => {
    if (!userId) return
    if (!window.confirm('Сбросить risk score до 0? Это не снимает блокировку и не удаляет события.')) return
    try {
      await securityService.resetRiskScore(userId, 'admin')
      toast.success('Risk score сброшен')
      loadData()
    } catch {
      toast.error('Не удалось сбросить risk score')
    }
  }

  const eventsTotalPages = Math.ceil(eventsTotal / pageSize) || 1
  const pointsTotalPages = Math.ceil(pointsTotal / pageSize) || 1

  if (loading && !profile) {
    return (
      <ListContainer>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Загрузка...
        </div>
      </ListContainer>
    )
  }

  return (
    <ListContainer>
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/security')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Назад
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* User header */}
      {profile && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <h1 className="text-lg font-semibold text-gray-900">
                  Профиль риска
                </h1>
              </div>
              <div className="text-sm text-gray-500 font-mono mb-3">{userId}</div>
              <div className="flex items-center gap-3 flex-wrap">
                {riskStatusBadge(profile.status)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.current_risk_score >= 75 ? 'bg-red-100 text-red-800' :
                  profile.current_risk_score >= 50 ? 'bg-orange-100 text-orange-800' :
                  profile.current_risk_score >= 25 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  Risk: {profile.current_risk_score}
                </span>
                {profile.is_watchlisted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Eye className="h-3 w-3" /> Watchlist
                  </span>
                )}
                {profile.points_frozen && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Snowflake className="h-3 w-3" /> Очки заморожены
                  </span>
                )}
                {profile.referral_disabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    <GiftOff className="h-3 w-3" /> Реферал откл.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadData()}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Обновить
              </Button>
            </div>
          </div>

          {/* Risk profile details */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Статус</div>
              <div className="text-sm font-medium text-gray-800">{profile.status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Risk Score</div>
              <div className="text-sm font-medium text-gray-800">{profile.current_risk_score}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Последняя активность</div>
              <div className="text-sm font-medium text-gray-800">{formatDateTime(profile.last_suspicious_activity_at)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Всего событий</div>
              <div className="text-sm font-medium text-gray-800">{profile.total_suspicious_events}</div>
            </div>
            {profile.restricted_until && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Ограничен до</div>
                <div className="text-sm font-medium text-orange-700">{formatDateTime(profile.restricted_until)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {profile && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            Административные действия
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Watchlist */}
            <div className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${profile.is_watchlisted ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {profile.is_watchlisted ? <Eye className="h-4 w-4 text-purple-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                <div>
                  <div className="text-xs font-medium text-gray-700">Watchlist</div>
                  <div className="text-xs text-gray-400">{profile.is_watchlisted ? 'В списке наблюдения' : 'Не наблюдается'}</div>
                </div>
              </div>
              <Button variant={profile.is_watchlisted ? 'secondary' : 'outline'} size="sm" onClick={handleToggleWatchlist}>
                {profile.is_watchlisted ? 'Убрать' : 'Добавить'}
              </Button>
            </div>

            {/* Freeze points */}
            <div className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${profile.points_frozen ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Snowflake className={`h-4 w-4 ${profile.points_frozen ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs font-medium text-gray-700">Очки лидерборда</div>
                  <div className="text-xs text-gray-400">{profile.points_frozen ? 'Заморожены' : 'Начисляются'}</div>
                </div>
              </div>
              <Button variant={profile.points_frozen ? 'secondary' : 'outline'} size="sm" onClick={handleTogglePointsFrozen}>
                {profile.points_frozen ? 'Разморозить' : 'Заморозить'}
              </Button>
            </div>

            {/* Referral */}
            <div className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${profile.referral_disabled ? 'border-gray-300 bg-gray-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {profile.referral_disabled ? <GiftOff className="h-4 w-4 text-gray-500" /> : <Gift className="h-4 w-4 text-gray-400" />}
                <div>
                  <div className="text-xs font-medium text-gray-700">Реферальные бонусы</div>
                  <div className="text-xs text-gray-400">{profile.referral_disabled ? 'Отключены' : 'Активны'}</div>
                </div>
              </div>
              <Button variant={profile.referral_disabled ? 'secondary' : 'outline'} size="sm" onClick={handleToggleReferralDisabled}>
                {profile.referral_disabled ? 'Включить' : 'Отключить'}
              </Button>
            </div>
          </div>

          {/* Danger actions */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetRiskScore}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              Сбросить Risk Score
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestrict}
              icon={<UserX className="h-4 w-4" />}
            >
              Ограничить
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBlock}
              icon={<Ban className="h-4 w-4" />}
            >
              Заблокировать
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUnrestrict}
              icon={<ShieldOff className="h-4 w-4" />}
            >
              Снять ограничение
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/users/${userId}`)}
              icon={<ExternalLink className="h-4 w-4" />}
            >
              Профиль пользователя
            </Button>
          </div>
        </div>
      )}

      {/* Keycloak Brute-Force Status */}
      {bruteForce !== null && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🔐 Keycloak — Brute Force Detection</span>
            {bruteForce.disabled && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                АККАУНТ ЗАБЛОКИРОВАН KEYCLOAK
              </span>
            )}
          </h3>
          {Object.keys(bruteForce).length === 0 ? (
            <p className="text-sm text-gray-400">Нет данных о попытках входа (brute-force protection не активирован или попыток не было)</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Неудачных попыток</div>
                <div className={`text-sm font-bold ${bruteForce.numFailures > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {bruteForce.numFailures ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Статус</div>
                <div className={`text-sm font-bold ${bruteForce.disabled ? 'text-red-600' : 'text-green-600'}`}>
                  {bruteForce.disabled ? 'Заблокирован' : 'Активен'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Последний IP</div>
                <div className="text-sm font-medium text-gray-800">{bruteForce.lastIPFailure || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Последняя ошибка</div>
                <div className="text-sm font-medium text-gray-800">
                  {bruteForce.lastFailure ? new Date(bruteForce.lastFailure).toLocaleString('ru') : '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fraud events table */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          История подозрительных событий
          {eventsTotal > 0 && <span className="text-sm font-normal text-gray-400">({eventsTotal})</span>}
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Дата / время</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Тип события</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Endpoint</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Risk Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Причина</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Статус</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-1" />
                    Загрузка...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Событий не найдено
                  </td>
                </tr>
              ) : events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                    {formatDateTime(event.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge type="info">
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[140px]" title={event.endpoint ?? ''}>
                    {event.endpoint || '—'}
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
                    <span title={event.reason ?? ''} className="truncate block">{event.reason || '—'}</span>
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
                    <div className="flex items-center gap-1">
                      {event.status === 'open' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkReviewed(event.id)}
                            icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                            title="Отметить проверенным"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkFalsePositive(event.id)}
                            icon={<Shield className="h-4 w-4 text-gray-400" />}
                            title="Ложная тревога"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {eventsTotal > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {(eventsPage - 1) * pageSize + 1}–{Math.min(eventsPage * pageSize, eventsTotal)} из {eventsTotal}
              </div>
              <div className="flex items-center gap-1">
                <button disabled={eventsPage === 1} onClick={() => { setEventsPage(1); loadData(1, pointsPage) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">«</button>
                <button disabled={eventsPage === 1} onClick={() => { setEventsPage(p => p - 1); loadData(eventsPage - 1, pointsPage) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">‹</button>
                <button disabled={eventsPage === eventsTotalPages} onClick={() => { setEventsPage(p => p + 1); loadData(eventsPage + 1, pointsPage) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">›</button>
                <button disabled={eventsPage === eventsTotalPages} onClick={() => { setEventsPage(eventsTotalPages); loadData(eventsTotalPages, pointsPage) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Points history table */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          История начисления очков
          {pointsTotal > 0 && <span className="text-sm font-normal text-gray-400 ml-2">({pointsTotal})</span>}
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Дата / время</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Тип</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Очков</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">До</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">После</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Источник</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-1" />
                    Загрузка...
                  </td>
                </tr>
              ) : pointsHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    История очков не найдена
                  </td>
                </tr>
              ) : pointsHistory.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.is_suspicious ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.source_type || '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    <span className={item.points_delta >= 0 ? 'text-green-700' : 'text-red-600'}>
                      {item.points_delta >= 0 ? `+${item.points_delta}` : item.points_delta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{item.points_before}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums text-xs font-medium">{item.points_after}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.source_id || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {item.is_suspicious && (
                      <span title="Подозрительное начисление">
                        <AlertTriangle className="h-4 w-4 text-amber-500 inline" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pointsTotal > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {(pointsPage - 1) * pageSize + 1}–{Math.min(pointsPage * pageSize, pointsTotal)} из {pointsTotal}
              </div>
              <div className="flex items-center gap-1">
                <button disabled={pointsPage === 1} onClick={() => { setPointsPage(1); loadData(eventsPage, 1) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">«</button>
                <button disabled={pointsPage === 1} onClick={() => { setPointsPage(p => p - 1); loadData(eventsPage, pointsPage - 1) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">‹</button>
                <button disabled={pointsPage === pointsTotalPages} onClick={() => { setPointsPage(p => p + 1); loadData(eventsPage, pointsPage + 1) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">›</button>
                <button disabled={pointsPage === pointsTotalPages} onClick={() => { setPointsPage(pointsTotalPages); loadData(eventsPage, pointsTotalPages) }}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100">»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ListContainer>
  )
}

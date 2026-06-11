import React, { useEffect, useRef, useState } from 'react'
import {
    Activity,
    BarChart3,
    Crown,
    DollarSign,
    Flame,
    GraduationCap,
    Globe,
    Smartphone,
    TrendingUp,
    Users as UsersIcon,
    Zap,
} from 'lucide-react'
import { analyticsService } from '@/services/api'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import toast from 'react-hot-toast'

// Marketing dashboard.
//
// Composition rule of thumb: each section calls one analytics endpoint
// (or the cached users list) and falls back gracefully on missing data.
// `any` is used liberally because the backend `response_model`s aren't
// declared for these routes — typing them on the frontend would just
// freeze us out of any future server-side schema tweak. Inputs here
// are guarded with `?? 0`/`?? '—'` everywhere, so a missing field
// renders a placeholder, never a crash.
//
// Render order matches a marketer's mental funnel: top-line KPIs →
// acquisition → activation/retention → revenue → audience → content
// effectiveness. KPI cards mirror the metrics a CMO opens in the
// morning before deciding whether to push more spend on the channel.

interface KpiCardProps {
    label: string
    value: string | number
    hint?: string
    info?: string
    icon: React.ComponentType<{ className?: string }>
    accent?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal'
}

const ACCENT_BG: Record<NonNullable<KpiCardProps['accent']>, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
    teal: 'bg-teal-50 text-teal-700',
}

// Small "i" chip next to a metric label. A filled gray circle (clearly
// visible on the white cards, unlike a faint outline icon). Click toggles a
// popover explaining the metric; closes on a second click or a click outside.
// inline-flex + align-middle + ml-1 so it sits right after the label text
// (incl. wrapped 2-line labels) instead of floating vertically-centered.
const InfoHint: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)
    useEffect(() => {
        if (!open) return
        const onDocClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])
    return (
        <span ref={ref} className="relative ml-1 inline-flex align-middle normal-case">
            <button
                type="button"
                aria-label="Что это"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((o) => !o)
                }}
                className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold leading-none text-gray-600 transition-colors hover:bg-gray-300 hover:text-gray-800"
            >
                i
            </button>
            {open && (
                <span className="absolute left-0 top-7 z-30 w-56 rounded-lg bg-gray-900 p-2.5 text-xs font-normal normal-case leading-snug text-white shadow-lg">
                    {text}
                </span>
            )}
        </span>
    )
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, hint, info, icon: Icon, accent = 'blue' }) => (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between">
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">
                {label}
                {info && <InfoHint text={info} />}
            </span>
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {hint && <span className="text-xs text-gray-400 mt-1">{hint}</span>}
        </div>
        <div className={`rounded-xl p-2.5 ${ACCENT_BG[accent]}`}>
            <Icon className="h-5 w-5" />
        </div>
    </div>
)

const Section: React.FC<{
    title: string
    description?: string
    info?: string
    icon?: React.ComponentType<{ className?: string }>
    children: React.ReactNode
}> = ({ title, description, info, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
            {Icon && (
                <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <div>
                <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                    {info && <InfoHint text={info} />}
                </h3>
                {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
        </div>
        {children}
    </div>
)

// Reusable horizontal bar without bringing in a chart lib. Width is
// driven off `percent` (0..100). Accepts optional `valueLabel` so we
// can render an absolute count next to the bar, which is what
// distribution sections (audience, devices, etc.) actually need.
const HBar: React.FC<{
    label: string
    percent: number
    valueLabel?: string
    accent?: string
}> = ({ label, percent, valueLabel, accent = 'bg-blue-500' }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm">
            <span className="text-gray-700">{label}</span>
            <span className="text-gray-500 tabular-nums">
                {valueLabel ?? `${percent.toFixed(1)}%`}
            </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
                className={`h-full ${accent} rounded-full`}
                style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
            />
        </div>
    </div>
)

const formatNumber = (n: number | undefined | null): string => {
    if (n == null) return '—'
    return new Intl.NumberFormat('ru-RU').format(n)
}

const formatMoney = (n: number | undefined | null): string => {
    if (n == null) return '—'
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(n)
}

const monthLabel = (monthStart: string): string => {
    // Backend returns month_start as either 'YYYY-MM-01' or 'YYYY-MM'.
    // Render as 'мес. YYYY' in Russian using the toLocaleString helper.
    try {
        const d = monthStart.length === 7 ? `${monthStart}-01` : monthStart
        return new Date(d).toLocaleString('ru-RU', {
            month: 'short',
            year: '2-digit',
        })
    } catch {
        return monthStart
    }
}

// Group registration counts (from retention.retention_rate_by_month)
// by ISO month string. We don't have a daily series for new users
// out-of-the-box, so we surface monthly totals — which is what the
// marketing team would chart over a 6–12-month horizon anyway.
const useMarketingData = () => {
    const [activity, setActivity] = useState<any | null>(null)
    const [retention, setRetention] = useState<any | null>(null)
    const [efficienty, setEfficienty] = useState<any | null>(null)
    const [payments, setPayments] = useState<any | null>(null)
    const [topClients, setTopClients] = useState<any[]>([])
    const [audience, setAudience] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)

    const refetch = React.useCallback(async () => {
        setLoading(true)
        try {
            // Fan out — no point waiting serially when each endpoint is
            // independent. Failures on individual endpoints are isolated
            // (Promise.allSettled), so one broken section won't blank the
            // whole page.
            //
            // Audience now comes from the dedicated marketing-safe
            // /admin/analytics/audience aggregate (counts only, no PII)
            // instead of pulling the whole /admin/users page — the old
            // path was both wrong (paginated) and 403 for marketing-role
            // tokens.
            const [a, r, e, p, t, au] = await Promise.allSettled([
                analyticsService.activity(),
                analyticsService.retention(),
                analyticsService.efficienty(),
                analyticsService.paymentsInfo(),
                analyticsService.topClients(false),
                analyticsService.getAudience(),
            ])
            if (a.status === 'fulfilled') setActivity(a.value)
            if (r.status === 'fulfilled') setRetention(r.value)
            if (e.status === 'fulfilled') setEfficienty(e.value)
            if (p.status === 'fulfilled') setPayments(p.value)
            if (t.status === 'fulfilled') setTopClients(t.value || [])
            if (au.status === 'fulfilled') setAudience(au.value)
            const failed = [a, r, e, p, t, au].filter(x => x.status === 'rejected')
            if (failed.length === 6) toast.error('Не удалось загрузить аналитику')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refetch()
    }, [refetch])

    return { activity, retention, efficienty, payments, topClients, audience, loading, refetch }
}

export const MarketingDashboard: React.FC = () => {
    const { activity, retention, efficienty, payments, topClients, audience, loading, refetch } =
        useMarketingData()

    // Audience views now read the marketing-safe /admin/analytics/audience
    // aggregate (counts only, no PII) — server-computed over ALL Keycloak
    // users and Redis-cached, instead of the old client-side roll-up over
    // the paginated /admin/users page (wrong totals + 403 for marketing).
    // The backend returns by_role / by_plan / by_grade as [{name,count}];
    // we fold them into name→count maps the existing panels already expect.
    const audienceStats = React.useMemo(() => {
        const fold = (rows: Array<{ name: string; count: number }> | undefined) => {
            const out: Record<string, number> = {}
            for (const row of rows ?? []) out[row.name] = row.count
            return out
        }

        const byRole = fold(audience?.by_role)
        const byPlan = fold(audience?.by_plan)
        const byGrade = fold(audience?.by_grade)

        const total = audience?.total ?? 0
        const proCount = byPlan['PRO'] ?? 0

        return { total, proCount, byRole, byPlan, byGrade }
    }, [audience])

    const dauValue = React.useMemo(() => {
        if (!activity?.dau || activity.dau.length === 0) return 0
        const last = activity.dau[activity.dau.length - 1]
        return last?.value ?? 0
    }, [activity])

    const mauValue = React.useMemo(() => {
        if (!activity?.mau || activity.mau.length === 0) return 0
        const last = activity.mau[activity.mau.length - 1]
        return last?.value ?? 0
    }, [activity])

    const stickiness = React.useMemo(() => {
        if (!activity?.dau_mau_ratio) return 0
        // Backend gives ratio (0..1), display as percent
        return Number((activity.dau_mau_ratio * 100).toFixed(1))
    }, [activity])

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Маркетинг</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Acquisition · Activation · Retention · Revenue · Audience
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={refetch}
                    disabled={loading}
                    icon={<TrendingUp className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                    {loading ? 'Загрузка...' : 'Обновить'}
                </Button>
            </div>

            {/* TIER 1 — KPI cards (6 most-watched numbers) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard
                    label="Всего юзеров"
                    value={formatNumber(audience?.total ?? audienceStats.total)}
                    info="Все зарегистрированные пользователи (из Keycloak)."
                    icon={UsersIcon}
                    accent="blue"
                />
                <KpiCard
                    label="Новые за 7 дн."
                    value={formatNumber(activity?.new_users_7d ?? null)}
                    hint="Первый запуск за 7 дней"
                    info="Пользователи, впервые открывшие приложение за последние 7 дней."
                    icon={Zap}
                    accent="green"
                />
                <KpiCard
                    label="DAU"
                    value={formatNumber(dauValue)}
                    hint="Daily Active Users"
                    info="Daily Active Users — уникальные пользователи, заходившие за день."
                    icon={Activity}
                    accent="purple"
                />
                <KpiCard
                    label="MAU"
                    value={formatNumber(mauValue)}
                    hint="Monthly Active Users"
                    info="Monthly Active Users — уникальные пользователи за месяц."
                    icon={BarChart3}
                    accent="teal"
                />
                <KpiCard
                    label="Stickiness"
                    value={`${stickiness}%`}
                    hint="DAU/MAU ratio"
                    info="DAU / MAU — как часто активные пользователи возвращаются. Выше % = «прилипчивее»."
                    icon={Flame}
                    accent="orange"
                />
                <KpiCard
                    label="PRO подписки"
                    value={formatNumber(audienceStats.proCount)}
                    hint="Активные тарифы PRO"
                    info="Пользователи с активным PRO-тарифом."
                    icon={Crown}
                    accent="pink"
                />
            </div>

            {/* SECTION: Acquisition & Retention */}
            <Section
                title="Регистрации и удержание"
                description="Сколько новых юзеров приходят и как долго остаются"
                info="«Регистрация» = первый вход в приложение (первый app_opened). Удержание показывает, как долго юзеры остаются после первого входа."
                icon={TrendingUp}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Регистрации по месяцам
                            <InfoHint text="Сколько пользователей впервые зашли в приложение в каждый месяц." />
                        </h4>
                        {retention?.retention_rate_by_month?.length ? (
                            <div className="space-y-2">
                                {retention.retention_rate_by_month
                                    .slice(-6)
                                    .map((m: any, i: number) => {
                                        const max = Math.max(
                                            ...retention.retention_rate_by_month.map(
                                                (mm: any) => mm.registrations || 0,
                                            ),
                                            1,
                                        )
                                        const percent = ((m.registrations || 0) / max) * 100
                                        return (
                                            <HBar
                                                key={i}
                                                label={monthLabel(m.month_start)}
                                                percent={percent}
                                                valueLabel={formatNumber(m.registrations)}
                                                accent="bg-blue-500"
                                            />
                                        )
                                    })}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Нет данных</div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Retention
                            <InfoHint text="% пользователей, вернувшихся через 1 день / 1 неделю / 1 месяц после первого входа." />
                        </h4>
                        <div className="space-y-3">
                            <HBar
                                label="День 1 (D1)"
                                percent={(retention?.d1 ?? 0) * 100}
                                accent="bg-green-500"
                            />
                            <HBar
                                label="Неделя 1 (W1)"
                                percent={(retention?.w1 ?? 0) * 100}
                                accent="bg-green-500"
                            />
                            <HBar
                                label="Месяц 1 (M1)"
                                percent={(retention?.m1 ?? 0) * 100}
                                accent="bg-green-500"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            % юзеров, вернувшихся в день 1 / неделю 1 / месяц 1 после регистрации
                        </p>
                    </div>
                </div>
            </Section>

            {/* SECTION: Revenue */}
            <Section
                title="Доходы"
                description="Платежи и топ-клиенты"
                info="Доход со store-оплат: Apple IAP + Google Play, за вычетом комиссии стора (Apple −30%, Google −15%). FreedomPay не учитывается."
                icon={DollarSign}
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                        <span className="text-xs text-gray-500 uppercase">
                            Всего
                            <InfoHint text="Суммарный доход (net) со store-оплат за вычетом комиссии стора." />
                        </span>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {formatMoney(payments?.info?.total_amount)}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                        <span className="text-xs text-gray-500 uppercase">
                            Платежей
                            <InfoHint text="Число успешных оплат (Apple + Google Play)." />
                        </span>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {formatNumber(payments?.info?.total_payments)}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                        <span className="text-xs text-gray-500 uppercase">
                            Платящих
                            <InfoHint text="Уникальные платящие пользователи." />
                        </span>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {formatNumber(payments?.info?.unique_users)}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                        <span className="text-xs text-gray-500 uppercase">
                            Средний чек
                            <InfoHint text="Средняя сумма одной оплаты (net)." />
                        </span>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {formatMoney(payments?.info?.avg_amount)}
                        </div>
                    </div>
                </div>

                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Топ клиенты
                    <InfoHint text="Пользователи с наибольшей суммой оплат (net) за всё время." />
                </h4>
                {topClients?.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 uppercase border-b">
                                <tr>
                                    <th className="text-left py-2 px-3">#</th>
                                    <th className="text-left py-2 px-3">Имя</th>
                                    <th className="text-left py-2 px-3">Email</th>
                                    <th className="text-right py-2 px-3">Платежей</th>
                                    <th className="text-right py-2 px-3">Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topClients.slice(0, 10).map((c: any, i: number) => (
                                    <tr key={c.user_id || i} className="border-b border-gray-100 last:border-0">
                                        <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                        <td className="py-2 px-3 font-medium text-gray-900">
                                            {c.user_fio || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-gray-600">{c.email || '—'}</td>
                                        <td className="py-2 px-3 text-right tabular-nums">
                                            {formatNumber(c.total_payments)}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                                            {formatMoney(c.total_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">Нет данных по платящим юзерам</div>
                )}
            </Section>

            {/* SECTION: Audience breakdown */}
            <Section
                title="Аудитория"
                description="Кто пользуется приложением"
                info="Состав текущих зарегистрированных пользователей по ролям, тарифам и классам."
                icon={UsersIcon}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            По ролям
                            <InfoHint text="Распределение пользователей по ролям (ученик / родитель / учитель…)." />
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(audienceStats.byRole)
                                .sort(([, a], [, b]) => b - a)
                                .map(([role, count]) => {
                                    const percent = audienceStats.total
                                        ? (count / audienceStats.total) * 100
                                        : 0
                                    const labels: Record<string, string> = {
                                        child: 'Ученики',
                                        parent: 'Родители',
                                        teacher: 'Учителя',
                                        admin: 'Админы',
                                        user: 'Прочие',
                                    }
                                    return (
                                        <HBar
                                            key={role}
                                            label={labels[role] || role}
                                            percent={percent}
                                            valueLabel={`${count} (${percent.toFixed(0)}%)`}
                                            accent="bg-purple-500"
                                        />
                                    )
                                })}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            По тарифам
                            <InfoHint text="Распределение по тарифам (FREE / PRO)." />
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(audienceStats.byPlan)
                                .sort(([, a], [, b]) => b - a)
                                .map(([plan, count]) => {
                                    const percent = audienceStats.total
                                        ? (count / audienceStats.total) * 100
                                        : 0
                                    return (
                                        <HBar
                                            key={plan}
                                            label={plan}
                                            percent={percent}
                                            valueLabel={`${count} (${percent.toFixed(0)}%)`}
                                            accent={plan === 'PRO' ? 'bg-pink-500' : 'bg-gray-400'}
                                        />
                                    )
                                })}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            По классам
                            <InfoHint text="Распределение по классам (9–11). «не указан» — кто зарегистрировался до запуска поля «класс»." />
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(audienceStats.byGrade)
                                .sort(([a], [b]) => {
                                    // Sort numeric grades ascending, "не указан" last.
                                    const numA = parseInt(a)
                                    const numB = parseInt(b)
                                    if (isNaN(numA)) return 1
                                    if (isNaN(numB)) return -1
                                    return numA - numB
                                })
                                .map(([grade, count]) => {
                                    const percent = audienceStats.total
                                        ? (count / audienceStats.total) * 100
                                        : 0
                                    return (
                                        <HBar
                                            key={grade}
                                            label={grade}
                                            percent={percent}
                                            valueLabel={`${count}`}
                                            accent="bg-teal-500"
                                        />
                                    )
                                })}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            «не указан» — юзеры зарегистрированные до пуска поля «класс»
                        </p>
                    </div>
                </div>

                {/* Devices / OS / Locations from activity endpoint */}
                {activity && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Smartphone className="h-4 w-4" /> Устройства
                            </h4>
                            <div className="space-y-2">
                                {activity.user_devices?.length
                                    ? activity.user_devices.slice(0, 5).map((d: any, i: number) => (
                                          <HBar
                                              key={i}
                                              label={d.device || '—'}
                                              percent={d.percent ?? 0}
                                              accent="bg-indigo-500"
                                          />
                                      ))
                                    : <span className="text-sm text-gray-400">Нет данных</span>}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> ОС
                            </h4>
                            <div className="space-y-2">
                                {activity.os_versions?.length
                                    ? activity.os_versions.slice(0, 5).map((o: any, i: number) => (
                                          <HBar
                                              key={i}
                                              label={o.os || '—'}
                                              percent={o.percent ?? 0}
                                              accent="bg-cyan-500"
                                          />
                                      ))
                                    : <span className="text-sm text-gray-400">Нет данных</span>}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Globe className="h-4 w-4" /> География
                            </h4>
                            <div className="space-y-2">
                                {activity.user_locations?.length
                                    ? activity.user_locations.slice(0, 5).map((l: any, i: number) => (
                                          <HBar
                                              key={i}
                                              label={
                                                  l.city
                                                      ? `${l.city}${l.country ? `, ${l.country}` : ''}`
                                                      : l.country || '—'
                                              }
                                              percent={l.percent ?? 0}
                                              accent="bg-yellow-500"
                                          />
                                      ))
                                    : <span className="text-sm text-gray-400">Нет данных</span>}
                            </div>
                        </div>
                    </div>
                )}
            </Section>

            {/* SECTION: Content effectiveness */}
            <Section
                title="Эффективность контента"
                description="Что юзеры реально проходят и где спотыкаются"
                icon={GraduationCap}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">ЕНТ</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3">
                                <span className="text-xs text-gray-500 uppercase">Попыток</span>
                                <div className="text-lg font-bold text-gray-900 mt-0.5">
                                    {formatNumber(efficienty?.ent?.total_attempts)}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                                <span className="text-xs text-gray-500 uppercase">Ср. балл</span>
                                <div className="text-lg font-bold text-gray-900 mt-0.5">
                                    {efficienty?.ent?.avg_score != null
                                        ? Number(efficienty.ent.avg_score).toFixed(1)
                                        : '—'}
                                </div>
                            </div>
                        </div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">
                            Популярные предметы
                        </h5>
                        {efficienty?.ent?.popular_subjects?.length ? (
                            <div className="space-y-1">
                                {efficienty.ent.popular_subjects.slice(0, 5).map((s: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex justify-between text-sm border-b border-gray-100 py-1.5 last:border-0"
                                    >
                                        <span className="text-gray-700">{s.name}</span>
                                        <Badge type="secondary">{formatNumber(s.attempts)}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400">Нет данных</span>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Тренажёр</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3">
                                <span className="text-xs text-gray-500 uppercase">Попыток</span>
                                <div className="text-lg font-bold text-gray-900 mt-0.5">
                                    {formatNumber(efficienty?.trainer?.total_attempts)}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                                <span className="text-xs text-gray-500 uppercase">Ср. балл</span>
                                <div className="text-lg font-bold text-gray-900 mt-0.5">
                                    {efficienty?.trainer?.avg_score != null
                                        ? Number(efficienty.trainer.avg_score).toFixed(1)
                                        : '—'}
                                </div>
                            </div>
                        </div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">
                            Сложные темы (% ошибок)
                        </h5>
                        {efficienty?.trainer?.hard_topics?.length ? (
                            <div className="space-y-1">
                                {efficienty.trainer.hard_topics.slice(0, 5).map((t: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex justify-between text-sm border-b border-gray-100 py-1.5 last:border-0"
                                    >
                                        <span className="text-gray-700">{t.name}</span>
                                        <Badge type="error">{t.mistake_percent}%</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400">Нет данных</span>
                        )}
                    </div>
                </div>
            </Section>
        </div>
    )
}

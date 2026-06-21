import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, Smartphone, Apple, RefreshCw, Receipt } from 'lucide-react'
import { analyticsService } from '@/services/api'
import Button from '@/components/common/Button'

interface GatewayRow {
    gateway: string
    count: number
    total_amount: number | string
}

const WINDOWS: { label: string; hours: number }[] = [
    { label: '7 дней', hours: 168 },
    { label: '30 дней', hours: 720 },
    { label: '90 дней', hours: 2160 },
    { label: 'Год', hours: 8760 },
]

const GATEWAY_META: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
    google_play: { label: 'Google Play', icon: Smartphone, accent: 'bg-green-50 text-green-700' },
    apple: { label: 'App Store (Apple)', icon: Apple, accent: 'bg-gray-50 text-gray-700' },
}

const fmtMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v) + ' ₸'

// ───────────────── iOS IAP events (попытки / успех / провал) ─────────────────

type IapItem = {
    id: number
    created_at: string | null
    event_type: string
    status: string
    user_id: string | null
    user_name: string | null
    user_phone: string | null
    product_id: string | null
    transaction_id: string | null
    amount: number | null
    environment: string | null
    detail: string | null
}

const IAP_STATUS: Record<string, { label: string; cls: string }> = {
    success: { label: 'успех', cls: 'bg-green-50 text-green-700' },
    failed: { label: 'провал', cls: 'bg-red-50 text-red-700' },
    flagged: { label: 'флаг', cls: 'bg-amber-50 text-amber-700' },
}

const IAP_EVENT: Record<string, string> = {
    purchase: 'Покупка',
    renew: 'Продление',
    expire: 'Подписка истекла',
    refund: 'Возврат',
    revoke: 'Отзыв',
    verify_rejected: 'Чек отклонён',
    activate_failed: 'Ошибка активации',
    shared_account: 'Чек на чужом аккаунте',
}

const IAP_DAYS = [
    { label: '7 дней', days: 7 },
    { label: '30 дней', days: 30 },
    { label: '90 дней', days: 90 },
]

const fmtDateTime = (s: string | null) =>
    s
        ? new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
        : '—'

const IapEventsSection: React.FC = () => {
    const [summary, setSummary] = useState({ total: 0, success: 0, failed: 0, flagged: 0 })
    const [items, setItems] = useState<IapItem[]>([])
    const [statusFilter, setStatusFilter] = useState('')
    const [days, setDays] = useState(30)
    // Which store's IAP events to show. Backend `subscription_event_log` tags
    // rows with platform="apple" (App Store) or platform="google" (Google Play),
    // and the /admin/payments/iap-events endpoint filters on this value.
    const [platform, setPlatform] = useState('apple')
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await analyticsService.iapEvents({
                platform,
                status: statusFilter || undefined,
                days,
                limit: 100,
            })
            setSummary(res?.summary ?? { total: 0, success: 0, failed: 0, flagged: 0 })
            setItems(res?.items ?? [])
        } catch {
            setSummary({ total: 0, success: 0, failed: 0, flagged: 0 })
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [statusFilter, days, platform])

    useEffect(() => {
        void load()
    }, [load])

    const cards = [
        { key: '', label: 'Всего событий', value: summary.total, cls: 'text-gray-900' },
        { key: 'success', label: 'Успешных', value: summary.success, cls: 'text-green-700' },
        { key: 'failed', label: 'Провалов', value: summary.failed, cls: 'text-red-700' },
        { key: 'flagged', label: 'Флаги (шеринг)', value: summary.flagged, cls: 'text-amber-700' },
    ]

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-indigo-600" />
                        IAP оплаты — события · {platform === 'apple' ? 'App Store' : 'Google Play'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Покупки, продления, возвраты, отказы и проверки чека. Клик по карточке — фильтр.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                        <option value="apple">App Store (iOS)</option>
                        <option value="google">Google Play (Android)</option>
                    </select>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                        {IAP_DAYS.map((w) => (
                            <option key={w.days} value={w.days}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => void load()}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cards.map((c) => (
                    <button
                        key={c.label}
                        onClick={() => setStatusFilter(c.key)}
                        className={`text-left rounded-xl border p-3 transition ${
                            statusFilter === c.key
                                ? 'border-indigo-400 ring-1 ring-indigo-200'
                                : 'border-gray-100 hover:border-gray-200'
                        }`}
                    >
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                            {c.label}
                        </div>
                        <div className={`text-2xl font-bold mt-0.5 ${c.cls}`}>{c.value}</div>
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                            <th className="py-2 pr-3">Время</th>
                            <th className="py-2 pr-3">Пользователь</th>
                            <th className="py-2 pr-3">Событие</th>
                            <th className="py-2 pr-3">Статус</th>
                            <th className="py-2 pr-3">Сумма</th>
                            <th className="py-2 pr-3">Среда</th>
                            <th className="py-2 pr-3">Детали</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-gray-400">
                                    {loading ? 'Загрузка…' : 'Событий за период нет'}
                                </td>
                            </tr>
                        )}
                        {items.map((it) => {
                            const st = IAP_STATUS[it.status] ?? {
                                label: it.status,
                                cls: 'bg-gray-50 text-gray-600',
                            }
                            return (
                                <tr
                                    key={it.id}
                                    className="border-b border-gray-50 hover:bg-gray-50/50"
                                >
                                    <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                                        {fmtDateTime(it.created_at)}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <div className="font-medium text-gray-800">
                                            {it.user_name || '—'}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {it.user_phone || it.user_id || ''}
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3 text-gray-700">
                                        {IAP_EVENT[it.event_type] ?? it.event_type}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <span
                                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                                        >
                                            {st.label}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3 text-gray-700">
                                        {it.amount ? fmtMoney(it.amount) : '—'}
                                    </td>
                                    <td className="py-2 pr-3 text-xs text-gray-400">
                                        {it.environment || '—'}
                                    </td>
                                    <td
                                        className="py-2 pr-3 text-xs text-gray-400 max-w-[260px] truncate"
                                        title={it.detail || ''}
                                    >
                                        {it.detail || ''}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export const FinancePage: React.FC = () => {
    const [rows, setRows] = useState<GatewayRow[]>([])
    const [total, setTotal] = useState(0)
    const [hours, setHours] = useState(720)
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await analyticsService.paymentsByGateway(hours)
            setRows(res?.rows ?? [])
            setTotal(Number(res?.total_amount ?? 0))
        } catch {
            setRows([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [hours])

    useEffect(() => {
        load()
    }, [load])

    const byGateway = useMemo(() => {
        const map = new Map<string, { count: number; amount: number }>()
        for (const r of rows) {
            map.set(r.gateway, {
                count: r.count,
                amount: Number(r.total_amount) || 0,
            })
        }
        return (['google_play', 'apple'] as const)
            .map((g) => ({
                gateway: g,
                count: map.get(g)?.count ?? 0,
                amount: map.get(g)?.amount ?? 0,
            }))
    }, [rows])

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-indigo-600" />
                        Финансы — выручка по шлюзам
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Оплаченные подписки через Google Play и App Store за период. Суммы — <b>до</b> комиссии магазина.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                        {WINDOWS.map((w) => (
                            <option key={w.hours} value={w.hours}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                    <Button variant="secondary" className="gap-2" onClick={() => void load()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Total */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <span className="text-xs uppercase tracking-wide text-gray-500">
                    Всего выручка за период
                </span>
                <div className="text-4xl font-bold text-gray-900 mt-1">{fmtMoney(total)}</div>
            </div>

            {/* Per-gateway cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {byGateway.map((g) => {
                    const meta = GATEWAY_META[g.gateway]
                    if (!meta) return null
                    const Icon = meta.icon
                    const share = total > 0 ? Math.round((g.amount / total) * 100) : 0
                    return (
                        <div
                            key={g.gateway}
                            className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between"
                        >
                            <div>
                                <span className="text-xs uppercase tracking-wide text-gray-500">
                                    {meta.label}
                                </span>
                                <div className="text-3xl font-bold text-gray-900 mt-1">
                                    {fmtMoney(g.amount)}
                                </div>
                                <span className="text-sm text-gray-400">
                                    {g.count} платежей · {share}% выручки
                                </span>
                                {g.gateway === 'google_play' && g.amount > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        ≈ {fmtMoney(Math.round(g.amount * 0.85))} после комиссии Google (15%)
                                    </div>
                                )}
                                {g.gateway === 'apple' && g.amount > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        ≈ {fmtMoney(Math.round(g.amount * 0.70))} после комиссии Apple (30%)
                                    </div>
                                )}
                            </div>
                            <div className={`rounded-xl p-2.5 ${meta.accent}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* iOS IAP events — attempts / success / failed */}
            <IapEventsSection />

            <div className="text-xs text-gray-400 max-w-3xl">
                Точные выплаты Google (после комиссии) — Play Console → Financial reports.
                Apple — App Store Connect → Payments and Financial Reports.
            </div>
        </div>
    )
}

export default FinancePage

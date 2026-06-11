import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, Smartphone, CreditCard, RefreshCw, Apple, Search } from 'lucide-react'
import { analyticsService } from '@/services/api'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

// Finance overview: paid revenue split by payment gateway.
//
// Google Play purchases land in the `payments` table via the IAP verify +
// RTDN flows (gateway = google_play); everything else is FreedomPay. Amounts
// here are GROSS — Google's ~15% fee is taken before payout, so the actual
// bank figure for Google is lower (exact payout comes from Play Console /
// Google Payments Center, a later reconciliation phase).

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
    freedompay: { label: 'FreedomPay', icon: CreditCard, accent: 'bg-blue-50 text-blue-700' },
}

const fmtMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v) + ' ₸'

export const FinancePage: React.FC = () => {
    const [rows, setRows] = useState<GatewayRow[]>([])
    const [total, setTotal] = useState(0)
    const [hours, setHours] = useState(720)
    const [loading, setLoading] = useState(false)
    const [polling, setPolling] = useState(false)

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

    const pollPending = useCallback(async () => {
        setPolling(true)
        try {
            const res = await analyticsService.pollPendingPayments()
            toast(res.message, { duration: 6000 })
            // Auto-refresh after 90s to show results once background task finishes
            setTimeout(() => void load(), 90_000)
        } catch {
            toast.error('Ошибка при проверке платежей')
        } finally {
            setPolling(false)
        }
    }, [load])

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
        // Always show all gateway buckets. Hide apple if it has 0 and no entry.
        const allGateways = ['google_play', 'apple', 'freedompay']
        return allGateways
            .filter((g) => g !== 'apple' || map.has('apple'))
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
                        Оплаченные платежи (status=paid) за период. Google Play и FreedomPay в
                        одном месте. Суммы Google — <b>до</b> комиссии (~15% удерживает Google
                        перед выплатой).
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
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
                    <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => void pollPending()}
                        disabled={loading || polling}
                    >
                        <Search className={`h-4 w-4 ${polling ? 'animate-pulse' : ''}`} />
                        {polling ? 'Проверяем...' : 'Проверить FP платежи'}
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={() => void load()} disabled={loading || polling}>
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
                    const meta = GATEWAY_META[g.gateway] ?? {
                        label: g.gateway,
                        icon: Wallet,
                        accent: 'bg-gray-50 text-gray-700',
                    }
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
                                        ≈ {fmtMoney(Math.round(g.amount * 0.85))} после комиссии Google
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

            <div className="text-xs text-gray-400 max-w-3xl">
                Активации/покупки видны здесь и в разделе «Маркетинг». Точные выплаты Google
                (после комиссии) — в Play Console → Financial reports и payments.google.com.
                FreedomPay — в кабинете FreedomPay.
            </div>
        </div>
    )
}

export default FinancePage

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Activity,
    Gauge,
    Play,
    Pause,
    RefreshCw,
    Wifi,
    Server,
    AlertTriangle,
    CheckCircle2,
    Smartphone,
} from 'lucide-react'
import Button from '@/components/common/Button'
import { apiService } from '@/services/api'

// Synthetic API performance monitor.
//
// Goal: measure how fast content/pages come back the way a USER'S PHONE sees
// it — i.e. from a real client, over the public internet, hitting the same
// public backend URL the app uses. It deliberately does NOT measure from
// inside/near the backend (that hides the network cost). Here the operator's
// browser plays the role of the client: each probe is a real `fetch` to the
// public `VITE_API_BASE_URL` with the body fully downloaded, timed with
// performance.now(). The long-haul network leg (KZ → Singapore) dominates the
// number, which is exactly the part a phone pays too.
//
// This is the synthetic half. The faithful "real phones, real mobile network"
// numbers come from RUM (app telemetry) — a later phase that feeds this same
// dashboard.

const API_BASE: string = import.meta.env.VITE_API_BASE_URL

// Probes mirror the endpoints the app calls while loading its main screens.
// `auth` probes carry the operator's bearer token (a lumi-realm user), so the
// request path + processing match a phone's; we only care about latency.
interface Probe {
    name: string
    path: string
    auth: boolean
}

const PROBES: Probe[] = [
    { name: 'Health (база сети)', path: '/health', auth: false },
    { name: 'Профиль', path: '/auth/profile', auth: true },
    { name: 'Предметы', path: '/user/subjects', auth: true },
    { name: 'Прогресс тренажёров', path: '/user/progress/trainers/summary', auth: true },
    { name: 'Лидерборд (me)', path: '/leaderboard/me', auth: true },
    { name: 'Ежедневные тесты', path: '/user/daily-tests/subjects', auth: true },
    { name: 'Связки ЕНТ', path: '/user/ents/subject-combinations', auth: true },
]

interface Sample {
    t: number // epoch ms when measured
    ms: number // round-trip latency
    status: number // HTTP status (0 = network error)
    bytes: number // downloaded body size
}

type Samples = Record<string, Sample[]>

const WINDOW = 60 // keep last N samples per probe
const STORAGE_KEY = 'perf_monitor_samples_v1'

// ---- latency colour thresholds (ms), tuned for mobile UX ----
function latencyTone(ms: number): { text: string; bg: string; label: string } {
    if (ms < 500) return { text: 'text-green-700', bg: 'bg-green-50', label: 'быстро' }
    if (ms < 1000) return { text: 'text-lime-700', bg: 'bg-lime-50', label: 'ок' }
    if (ms < 2000) return { text: 'text-orange-700', bg: 'bg-orange-50', label: 'медленно' }
    return { text: 'text-red-700', bg: 'bg-red-50', label: 'очень медленно' }
}

function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
    return sorted[idx]
}

function fmtMs(ms: number): string {
    if (!ms) return '—'
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)} с` : `${Math.round(ms)} мс`
}

function fmtBytes(b: number): string {
    if (!b) return '—'
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
}

// Logs in via the PUBLIC /auth/login (web-app client) and returns an access
// token — the exact same client + token shape a phone uses. Measuring with a
// real student token (not the operator's admin token) is what makes this the
// true "phone path": admin accounts lack student data and would make some
// /user/* probes error in ways real users never see.
async function loginWebApp(login: string, password: string): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
            credentials: 'omit',
        })
        if (!res.ok) return null
        const data = await res.json()
        return data?.access_token ?? null
    } catch {
        return null
    }
}

// One probe = one real round-trip over the public path. Native fetch (not the
// app's axios instance) so a 401 here never triggers the global login-redirect.
async function runProbe(probe: Probe, token: string | null): Promise<Sample> {
    const headers: Record<string, string> = {}
    if (probe.auth && token) headers.Authorization = `Bearer ${token}`
    const start = performance.now()
    try {
        const res = await fetch(`${API_BASE}${probe.path}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
            credentials: 'omit',
        })
        // Fully download the body — "content return speed" includes transfer.
        const buf = await res.arrayBuffer()
        const ms = performance.now() - start
        return { t: Date.now(), ms, status: res.status, bytes: buf.byteLength }
    } catch {
        const ms = performance.now() - start
        return { t: Date.now(), ms, status: 0, bytes: 0 }
    }
}

// Tiny dependency-free SVG sparkline.
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number }> = ({
    data,
    width = 120,
    height = 28,
}) => {
    if (data.length < 2) return <svg width={width} height={height} />
    const max = Math.max(...data)
    const min = Math.min(...data)
    const span = max - min || 1
    const step = width / (data.length - 1)
    const pts = data
        .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
        .join(' ')
    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
    )
}

// Main latency-over-time chart (avg across auth probes per run).
const TrendChart: React.FC<{ points: { t: number; ms: number }[] }> = ({ points }) => {
    const width = 760
    const height = 200
    const pad = 32
    if (points.length < 2) {
        return (
            <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
                Накапливаем данные… запусти несколько замеров
            </div>
        )
    }
    const ys = points.map((p) => p.ms)
    const maxY = Math.max(...ys, 100)
    const stepX = (width - pad * 2) / (points.length - 1)
    const toX = (i: number) => pad + i * stepX
    const toY = (ms: number) => height - pad - (ms / maxY) * (height - pad * 2)
    const line = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.ms).toFixed(1)}`).join(' ')
    const gridLines = [0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f))
    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="text-indigo-500">
            {gridLines.map((g) => (
                <g key={g}>
                    <line
                        x1={pad}
                        x2={width - pad}
                        y1={toY(g)}
                        y2={toY(g)}
                        stroke="#eef2f7"
                        strokeWidth={1}
                    />
                    <text x={4} y={toY(g) + 4} fontSize={10} fill="#9ca3af">
                        {fmtMs(g)}
                    </text>
                </g>
            ))}
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} />
            {points.map((p, i) => (
                <circle key={i} cx={toX(i)} cy={toY(p.ms)} r={2} fill="currentColor" />
            ))}
        </svg>
    )
}

function loadSamples(): Samples {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as Samples) : {}
    } catch {
        return {}
    }
}

interface NetInfo {
    type?: string
    downlink?: number
    rtt?: number
}

// ---- RUM: real-user latency aggregated from the app's api_request events ----
interface RumRow {
    endpoint: string
    count: number
    p50_ms: number
    p95_ms: number
    avg_ms: number
    error_rate: number
}

const RUM_WINDOWS: { label: string; hours: number }[] = [
    { label: '1 час', hours: 1 },
    { label: '24 часа', hours: 24 },
    { label: '7 дней', hours: 168 },
]

const RumSection: React.FC = () => {
    const [rows, setRows] = useState<RumRow[]>([])
    const [total, setTotal] = useState(0)
    const [hours, setHours] = useState(24)
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const fetchRum = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiService.get('/admin/analytics/api-timing', { hours })
            setRows(res.data?.rows ?? [])
            setTotal(res.data?.total_samples ?? 0)
        } catch {
            setRows([])
            setTotal(0)
        } finally {
            setLoading(false)
            setLoaded(true)
        }
    }, [hours])

    useEffect(() => {
        fetchRum()
    }, [fetchRum])

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-indigo-600" />
                        Реальные данные с телефонов (RUM)
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Агрегировано из событий приложения · {total.toLocaleString()} замеров за окно
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                        {RUM_WINDOWS.map((w) => (
                            <option key={w.hours} value={w.hours}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                    <Button variant="secondary" className="gap-2" onClick={fetchRum} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                    {loaded
                        ? 'Пока нет данных с телефонов. Они появятся после релиза приложения с RUM-инструментовкой (Dio-интерцептор шлёт тайминги в /analytics/events).'
                        : 'Загрузка…'}
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="px-5 py-3 font-medium">Эндпоинт</th>
                            <th className="px-3 py-3 font-medium">Замеров</th>
                            <th className="px-3 py-3 font-medium">p50</th>
                            <th className="px-3 py-3 font-medium">p95</th>
                            <th className="px-3 py-3 font-medium">Среднее</th>
                            <th className="px-5 py-3 font-medium">Ошибки</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const tone = latencyTone(r.p95_ms)
                            return (
                                <tr key={r.endpoint} className="border-b border-gray-50 last:border-0">
                                    <td className="px-5 py-3 font-mono text-xs text-gray-700">
                                        {r.endpoint}
                                    </td>
                                    <td className="px-3 py-3 text-gray-500">{r.count.toLocaleString()}</td>
                                    <td className="px-3 py-3 text-gray-700">{fmtMs(r.p50_ms)}</td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-md font-semibold ${tone.bg} ${tone.text}`}
                                        >
                                            {fmtMs(r.p95_ms)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-700">{fmtMs(r.avg_ms)}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={
                                                r.error_rate > 0.02 ? 'text-red-600' : 'text-green-600'
                                            }
                                        >
                                            {(r.error_rate * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export const PerformanceDashboard: React.FC = () => {
    const [samples, setSamples] = useState<Samples>(() => loadSamples())
    const [running, setRunning] = useState(false)
    const [auto, setAuto] = useState(false)
    const [intervalSec, setIntervalSec] = useState(30)
    const [lastRun, setLastRun] = useState<number | null>(null)
    const [net, setNet] = useState<NetInfo>({})
    const timerRef = useRef<number | null>(null)

    // Test student account (web-app client) — the faithful phone path. When
    // set, probes authenticate as this account instead of the operator's admin
    // token. Credentials live only in this browser's localStorage (a low-value
    // test/reviewer account), never sent anywhere but the public /auth/login.
    const [testLogin, setTestLogin] = useState(
        () => localStorage.getItem('perf_test_login') ?? '',
    )
    const [testPassword, setTestPassword] = useState(
        () => localStorage.getItem('perf_test_password') ?? '',
    )
    const [tokenNote, setTokenNote] = useState<string>('')
    // Cached probe token (in memory) + soft expiry so we re-login periodically.
    const tokenRef = useRef<{ token: string; until: number } | null>(null)

    // Persist history so the trend survives reloads.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(samples))
        } catch {
            /* quota — ignore */
        }
    }, [samples])

    // Network hints (effective connection type) — context for the numbers.
    useEffect(() => {
        const c = (navigator as any).connection
        if (!c) return
        const update = () =>
            setNet({ type: c.effectiveType, downlink: c.downlink, rtt: c.rtt })
        update()
        c.addEventListener?.('change', update)
        return () => c.removeEventListener?.('change', update)
    }, [])

    // Resolve the bearer token for auth probes: prefer a fresh web-app token
    // for the configured test account (true phone path); else fall back to the
    // operator's admin token (still measures the network path, but admin
    // accounts can make some /user/* probes error — shown as a note).
    const resolveToken = useCallback(async (): Promise<string | null> => {
        if (testLogin && testPassword) {
            const cached = tokenRef.current
            if (cached && cached.until > Date.now()) return cached.token
            const token = await loginWebApp(testLogin, testPassword)
            if (token) {
                tokenRef.current = { token, until: Date.now() + 4 * 60 * 1000 }
                setTokenNote('путь web-app (тестовый аккаунт)')
                localStorage.setItem('perf_test_login', testLogin)
                localStorage.setItem('perf_test_password', testPassword)
                return token
            }
            setTokenNote('логин тестового аккаунта не удался — использую токен админки')
        } else {
            setTokenNote('токен админки (укажи тестовый аккаунт для пути web-app)')
        }
        return localStorage.getItem('token')
    }, [testLogin, testPassword])

    const runAll = useCallback(async () => {
        setRunning(true)
        try {
            const token = await resolveToken()
            const results = await Promise.all(
                PROBES.map(async (p) => ({ path: p.path, sample: await runProbe(p, token) })),
            )
            setSamples((prev) => {
                const next: Samples = { ...prev }
                for (const { path, sample } of results) {
                    const arr = [...(next[path] ?? []), sample]
                    next[path] = arr.slice(-WINDOW)
                }
                return next
            })
            setLastRun(Date.now())
        } finally {
            setRunning(false)
        }
    }, [resolveToken])

    // Auto-refresh loop.
    useEffect(() => {
        if (!auto) {
            if (timerRef.current) window.clearInterval(timerRef.current)
            timerRef.current = null
            return
        }
        runAll()
        timerRef.current = window.setInterval(runAll, intervalSec * 1000)
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current)
        }
    }, [auto, intervalSec, runAll])

    // ---- derived stats ----
    const stats = useMemo(() => {
        return PROBES.map((p) => {
            const arr = samples[p.path] ?? []
            const ok = arr.filter((s) => s.status >= 200 && s.status < 400)
            const latencies = ok.map((s) => s.ms)
            const last = arr[arr.length - 1]
            return {
                probe: p,
                count: arr.length,
                last,
                p50: percentile(latencies, 50),
                p95: percentile(latencies, 95),
                min: latencies.length ? Math.min(...latencies) : 0,
                errors: arr.length - ok.length,
                spark: arr.slice(-24).map((s) => s.ms),
            }
        })
    }, [samples])

    // Trend = average latency of auth probes per run (aligned by index tail).
    const trend = useMemo(() => {
        const authPaths = PROBES.filter((p) => p.auth).map((p) => p.path)
        const len = Math.max(0, ...authPaths.map((p) => (samples[p] ?? []).length))
        const points: { t: number; ms: number }[] = []
        for (let i = 0; i < len; i++) {
            const vals: number[] = []
            let t = 0
            for (const p of authPaths) {
                const arr = samples[p] ?? []
                const s = arr[arr.length - len + i]
                if (s && s.status >= 200 && s.status < 400) {
                    vals.push(s.ms)
                    t = s.t
                }
            }
            if (vals.length) points.push({ t, ms: vals.reduce((a, b) => a + b, 0) / vals.length })
        }
        return points.slice(-40)
    }, [samples])

    const overall = useMemo(() => {
        const lasts = stats.map((s) => s.last).filter(Boolean) as Sample[]
        const okLasts = lasts.filter((s) => s.status >= 200 && s.status < 400)
        const avg = okLasts.length
            ? okLasts.reduce((a, s) => a + s.ms, 0) / okLasts.length
            : 0
        const slowest = [...stats].sort((a, b) => (b.last?.ms ?? 0) - (a.last?.ms ?? 0))[0]
        const totalErrors = stats.reduce((a, s) => a + s.errors, 0)
        return { avg, slowest, totalErrors }
    }, [stats])

    const clearHistory = () => {
        setSamples({})
        localStorage.removeItem(STORAGE_KEY)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Gauge className="h-6 w-6 text-indigo-600" />
                        Скорость API (путь телефона)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Замер из этого браузера к публичному backend — тем же эндпоинтам, что
                        грузит приложение. Меряется полный round-trip с загрузкой тела (как
                        видит телефон), а не время на стороне сервера.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={intervalSec}
                        onChange={(e) => setIntervalSec(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        title="Интервал авто-замера"
                    >
                        <option value={15}>15 c</option>
                        <option value={30}>30 c</option>
                        <option value={60}>60 c</option>
                    </select>
                    <Button
                        variant={auto ? 'secondary' : 'primary'}
                        className="gap-2"
                        onClick={() => setAuto((v) => !v)}
                    >
                        {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {auto ? 'Авто: вкл' : 'Авто: выкл'}
                    </Button>
                    <Button variant="primary" className="gap-2" onClick={runAll} disabled={running}>
                        <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
                        Замерить
                    </Button>
                </div>
            </div>

            {/* Test account — measure as a real web-app student, not the admin */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Тестовый аккаунт (web-app):</span>
                <input
                    value={testLogin}
                    onChange={(e) => setTestLogin(e.target.value)}
                    placeholder="+7700..."
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40"
                />
                <input
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    type="password"
                    placeholder="пароль"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36"
                />
                <button
                    onClick={() => {
                        tokenRef.current = null
                        runAll()
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                    применить
                </button>
                {tokenNote && <span className="text-xs text-gray-400">· {tokenNote}</span>}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                            Средняя задержка
                        </span>
                        <div className={`text-3xl font-bold ${latencyTone(overall.avg).text}`}>
                            {fmtMs(overall.avg)}
                        </div>
                        <span className="text-xs text-gray-400">по последнему замеру</span>
                    </div>
                    <div className="rounded-xl p-2.5 bg-indigo-50 text-indigo-700">
                        <Activity className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                            Самый медленный
                        </span>
                        <div className="text-lg font-semibold text-gray-900 mt-1">
                            {overall.slowest?.probe.name ?? '—'}
                        </div>
                        <span className={`text-sm ${latencyTone(overall.slowest?.last?.ms ?? 0).text}`}>
                            {fmtMs(overall.slowest?.last?.ms ?? 0)}
                        </span>
                    </div>
                    <div className="rounded-xl p-2.5 bg-orange-50 text-orange-700">
                        <Server className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500">Сеть / ошибки</span>
                        <div className="text-lg font-semibold text-gray-900 mt-1 flex items-center gap-1.5">
                            <Wifi className="h-4 w-4 text-gray-400" />
                            {net.type ? net.type.toUpperCase() : 'n/a'}
                            {net.downlink ? ` · ${net.downlink} Mbps` : ''}
                        </div>
                        <span
                            className={`text-sm ${overall.totalErrors ? 'text-red-600' : 'text-green-600'}`}
                        >
                            {overall.totalErrors ? `${overall.totalErrors} ошибок` : 'без ошибок'}
                        </span>
                    </div>
                    <div className="rounded-xl p-2.5 bg-teal-50 text-teal-700">
                        {overall.totalErrors ? (
                            <AlertTriangle className="h-5 w-5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5" />
                        )}
                    </div>
                </div>
            </div>

            {/* Trend chart */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-gray-900">Динамика задержки (среднее по экранам)</h2>
                    <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600">
                        очистить историю
                    </button>
                </div>
                <TrendChart points={trend} />
            </div>

            {/* Per-endpoint table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="px-5 py-3 font-medium">Эндпоинт</th>
                            <th className="px-3 py-3 font-medium">Последний</th>
                            <th className="px-3 py-3 font-medium">p50</th>
                            <th className="px-3 py-3 font-medium">p95</th>
                            <th className="px-3 py-3 font-medium">Размер</th>
                            <th className="px-3 py-3 font-medium">Статус</th>
                            <th className="px-5 py-3 font-medium">Тренд</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s) => {
                            const tone = latencyTone(s.last?.ms ?? 0)
                            const isErr = s.last && (s.last.status === 0 || s.last.status >= 400)
                            return (
                                <tr key={s.probe.path} className="border-b border-gray-50 last:border-0">
                                    <td className="px-5 py-3">
                                        <div className="font-medium text-gray-900">{s.probe.name}</div>
                                        <div className="text-xs text-gray-400 font-mono">{s.probe.path}</div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-md font-semibold ${tone.bg} ${tone.text}`}
                                        >
                                            {fmtMs(s.last?.ms ?? 0)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-700">{fmtMs(s.p50)}</td>
                                    <td className="px-3 py-3 text-gray-700">{fmtMs(s.p95)}</td>
                                    <td className="px-3 py-3 text-gray-500">{fmtBytes(s.last?.bytes ?? 0)}</td>
                                    <td className="px-3 py-3">
                                        {s.last ? (
                                            <span
                                                className={isErr ? 'text-red-600' : 'text-green-600'}
                                            >
                                                {s.last.status === 0 ? 'сеть' : s.last.status}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className={`px-5 py-3 ${tone.text}`}>
                                        <Sparkline data={s.spark} />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* RUM — real-user data from phones */}
            <RumSection />

            {/* Methodology note */}
            <div className="text-xs text-gray-400 flex items-start gap-2 max-w-3xl">
                <Server className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                    Это синтетический замер из браузера оператора через публичный путь — хорошее
                    приближение, но не реальная мобильная сеть. Точные цифры с реальных телефонов
                    (по типу сети и регионам) добавит RUM-телеметрия из приложения — следующий этап,
                    данные придут в этот же дашборд.
                    {lastRun ? ` Последний замер: ${new Date(lastRun).toLocaleTimeString()}.` : ''}
                </p>
            </div>
        </div>
    )
}

export default PerformanceDashboard

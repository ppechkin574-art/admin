import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Languages,
    Download,
    Upload,
    RefreshCw,
    Trash2,
    Eye,
    Loader2,
    CheckCircle2,
    RotateCcw,
    Play,
    X,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Check,
} from 'lucide-react'
import {
    translationService,
    subjectService,
    CoverageRow,
    GlossaryRow,
    PreviewItem,
    QualityFlag,
    QualityFlagType,
    ReviewResult,
} from '@/services/api'
import Button from '@/components/common/Button'

// ─── Quality flag helpers ───────────────────────────────────────────────────

const FLAG_LABELS: Record<QualityFlagType, string> = {
    agreement: 'Согласование',
    government: 'Управление',
    morphological: 'Морфология',
    syntactic: 'Синтаксис',
    semantic: 'Смысловая',
    untranslatable: 'Не переведено',
}
const FLAG_COLORS: Record<QualityFlagType, string> = {
    agreement: 'decoration-amber-500',
    government: 'decoration-orange-500',
    morphological: 'decoration-red-500',
    syntactic: 'decoration-purple-500',
    semantic: 'decoration-rose-600',
    untranslatable: 'decoration-gray-500',
}
const FLAG_BADGE: Record<QualityFlagType, string> = {
    agreement: 'bg-amber-50 text-amber-700 border-amber-200',
    government: 'bg-orange-50 text-orange-700 border-orange-200',
    morphological: 'bg-red-50 text-red-700 border-red-200',
    syntactic: 'bg-purple-50 text-purple-700 border-purple-200',
    semantic: 'bg-rose-50 text-rose-700 border-rose-200',
    untranslatable: 'bg-gray-100 text-gray-600 border-gray-200',
}

/** Render KK text with flagged phrases underlined + tooltip. */
function HighlightedText({
    text,
    flags,
    field,
}: {
    text: string
    flags: QualityFlag[]
    field: string
}) {
    if (!text) return <span className="text-gray-300">—</span>
    const relevant = flags.filter((f) => f.field === field && f.phrase)
    if (!relevant.length) return <>{text}</>

    // Build non-overlapping segments sorted by position
    type Seg = { start: number; end: number; flag: QualityFlag }
    const segs: Seg[] = []
    for (const flag of relevant) {
        const idx = text.indexOf(flag.phrase)
        if (idx === -1) continue
        segs.push({ start: idx, end: idx + flag.phrase.length, flag })
    }
    segs.sort((a, b) => a.start - b.start)

    const parts: React.ReactNode[] = []
    let pos = 0
    for (const seg of segs) {
        if (seg.start < pos) continue // overlapping — skip
        if (seg.start > pos) parts.push(text.slice(pos, seg.start))
        parts.push(
            <span
                key={seg.start}
                className={`underline ${FLAG_COLORS[seg.flag.type]} decoration-wavy cursor-help relative group`}
                title={`${FLAG_LABELS[seg.flag.type]}: ${seg.flag.note}`}
            >
                {seg.flag.phrase}
                <span className="absolute bottom-full left-0 mb-1 hidden group-hover:flex z-10 max-w-[220px] text-xs bg-gray-900 text-white rounded-lg px-2.5 py-1.5 whitespace-normal shadow-lg">
                    <span className="font-semibold mr-1">{FLAG_LABELS[seg.flag.type]}:</span>
                    {seg.flag.note}
                </span>
            </span>,
        )
        pos = seg.end
    }
    if (pos < text.length) parts.push(text.slice(pos))
    return <>{parts}</>
}

const TONES = [
    { v: 'official', label: 'Официальный' },
    { v: 'conversational', label: 'Разговорный' },
]
const LENGTHS = [
    { v: 'keep', label: 'Сохранить длину' },
    { v: 'short', label: 'Короче' },
]
const EXPORT_STATUS = [
    { v: 'none', label: 'Не переведённые' },
    { v: 'draft', label: 'Черновики' },
    { v: 'all', label: 'Все' },
]

const Seg: React.FC<{
    value: string
    options: { v: string; label: string }[]
    onChange: (v: string) => void
}> = ({ value, options, onChange }) => (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {options.map((o) => (
            <button
                key={o.v}
                onClick={() => onChange(o.v)}
                className={`px-3 py-1.5 text-sm border-r last:border-r-0 border-gray-200 ${
                    value === o.v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                {o.label}
            </button>
        ))}
    </div>
)

const PairRow: React.FC<{ label: string; ru: string; kk: string }> = ({ label, ru, kk }) => (
    <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">{label}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:border-r md:pr-4 border-gray-200 text-[13px] text-gray-600 whitespace-pre-wrap break-words">
                {ru || '—'}
            </div>
            <div className="text-[13px] text-gray-800 whitespace-pre-wrap break-words">{kk || '—'}</div>
        </div>
    </div>
)

export const TranslationPage: React.FC = () => {
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([])
    const [subjectId, setSubjectId] = useState<number | null>(null)
    const [coverage, setCoverage] = useState<CoverageRow[]>([])
    const [tone, setTone] = useState('official')
    const [length, setLength] = useState('keep')
    const [instruction, setInstruction] = useState('')
    const [glossary, setGlossary] = useState<GlossaryRow[]>([])
    const [newRu, setNewRu] = useState('')
    const [newKk, setNewKk] = useState('')
    const [exportStatus, setExportStatus] = useState('none')
    const [msg, setMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    // «Просмотр переводов»
    const [preview, setPreview] = useState<PreviewItem[]>([])
    const [previewMeta, setPreviewMeta] = useState<{ total: number; shown: number } | null>(null)
    const [previewStatus, setPreviewStatus] = useState('done')
    const [previewSample, setPreviewSample] = useState(10)
    const [previewOpened, setPreviewOpened] = useState(false)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [paused, setPaused] = useState(true)

    // Preview bulk-requeue state
    const [previewSelectedIds, setPreviewSelectedIds] = useState<Set<number>>(new Set())
    const [previewRequeuing, setPreviewRequeuing] = useState(false)

    // Review (draft approval) state
    const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
    const [reviewPage, setReviewPage] = useState(1)
    const [reviewFilter, setReviewFilter] = useState<'all' | 'flagged' | 'clean'>('all')
    const [reviewLoading, setReviewLoading] = useState(false)
    const [reviewOpened, setReviewOpened] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [approving, setApproving] = useState(false)
    const reviewRef = useRef<HTMLDivElement>(null)

    const loadCoverage = useCallback(async () => {
        const c = await translationService.coverage().catch(() => ({ items: [] }))
        setCoverage(c.items ?? [])
    }, [])

    const loadControl = useCallback(async () => {
        const c = await translationService.control().catch(() => ({ paused: true }))
        setPaused(!!c.paused)
    }, [])

    const loadPreview = useCallback(async () => {
        if (subjectId == null) return
        setPreviewLoading(true)
        try {
            const res = await translationService.preview(subjectId, {
                status: previewStatus,
                sample: previewSample,
                limit: 50,
            })
            setPreview(res.items)
            setPreviewMeta({ total: res.total, shown: res.shown })
        } catch {
            setPreview([])
            setPreviewMeta(null)
        } finally {
            setPreviewLoading(false)
        }
    }, [subjectId, previewStatus, previewSample])

    useEffect(() => {
        void (async () => {
            const data: any = await subjectService.getAll().catch(() => [])
            const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? []
            const subs = list.map((s: any) => ({ id: s.id, name: s.name }))
            setSubjects(subs)
            setSubjectId((prev) => prev ?? (subs[0]?.id ?? null))
        })()
        void loadCoverage()
        void loadControl()
    }, [loadCoverage, loadControl])

    useEffect(() => {
        if (subjectId == null) return
        void (async () => {
            const cfg = await translationService.getConfig(subjectId).catch(() => null)
            if (cfg) {
                setTone(cfg.tone)
                setLength(cfg.length)
                setInstruction(cfg.instruction ?? '')
            }
            setGlossary(await translationService.listGlossary(subjectId).catch(() => []))
        })()
    }, [subjectId])

    // Авто-обновление покрытия + статуса паузы, пока в очереди есть вопросы.
    useEffect(() => {
        const c = coverage.find((x) => x.subject_id === subjectId)
        if (subjectId == null || !c || c.queued <= 0) return
        const t = setInterval(() => {
            void loadCoverage()
            void loadControl()
        }, 15000)
        return () => clearInterval(t)
    }, [subjectId, coverage, loadCoverage, loadControl])

    // Перезагрузка перевью при смене фильтров/предмета (после первого открытия).
    useEffect(() => {
        if (!previewOpened) return
        void loadPreview()
        setPreviewSelectedIds(new Set())
    }, [previewOpened, loadPreview])

    const loadReview = useCallback(async () => {
        if (subjectId == null) return
        setReviewLoading(true)
        setSelectedIds(new Set())
        try {
            const res = await translationService.reviewDrafts(subjectId, {
                page: reviewPage,
                page_size: 20,
                filter: reviewFilter,
            })
            setReviewResult(res)
        } catch {
            setReviewResult(null)
        } finally {
            setReviewLoading(false)
        }
    }, [subjectId, reviewPage, reviewFilter])

    useEffect(() => {
        if (!reviewOpened) return
        void loadReview()
    }, [reviewOpened, loadReview])

    // Reset page on filter change
    useEffect(() => {
        setReviewPage(1)
    }, [reviewFilter, subjectId])

    const cov = coverage.find((c) => c.subject_id === subjectId)
    const pct = cov && cov.total > 0 ? Math.round((cov.done / cov.total) * 100) : 0
    const queuedN = cov?.queued ?? 0
    const translating = queuedN > 0 && !paused
    const pausedWithQueue = queuedN > 0 && paused
    const allDone = !!cov && cov.total > 0 && cov.done === cov.total

    const saveConfig = async () => {
        if (subjectId == null) return
        await translationService.setConfig(subjectId, { tone, length, instruction })
        setMsg('Параметры сохранены')
    }
    const addTerm = async () => {
        if (subjectId == null || !newRu.trim() || !newKk.trim()) return
        await translationService.addGlossary({
            subject_id: subjectId,
            term_ru: newRu.trim(),
            term_kk: newKk.trim(),
        })
        setNewRu('')
        setNewKk('')
        setGlossary(await translationService.listGlossary(subjectId))
    }
    const delTerm = async (id: number) => {
        await translationService.deleteGlossary(id)
        setGlossary((g) => g.filter((x) => x.id !== id))
    }

    const queueSubject = async () => {
        if (subjectId == null) return
        const res = await translationService.queue(subjectId)
        setMsg(
            `В очередь поставлено ${res.queued} вопросов — фоновый переводчик подхватит, зайди позже`,
        )
        await loadCoverage()
    }

    const requeueOne = async (qid: number) => {
        await translationService.requeue(qid)
        await translationService.resume() // иначе на паузе вопрос просто повиснет
        setPaused(false)
        setMsg(`Вопрос #${qid} снова в очереди — переведётся заново в течение пары минут`)
        await loadCoverage()
        if (previewOpened) await loadPreview()
    }

    const requeueSubject = async () => {
        if (subjectId == null) return
        const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? 'этот предмет'
        if (!window.confirm(`Переперевести ВСЕ вопросы предмета «${subjectName}»?\n\nТекущие переводы будут перезаписаны.`)) return
        const res = await translationService.requeueSubject(subjectId)
        await translationService.resume()
        setPaused(false)
        setMsg(`${res.queued} вопросов поставлено в очередь на повторный перевод`)
        await loadCoverage()
    }

    const requeueBulkPreview = async () => {
        if (!previewSelectedIds.size) return
        setPreviewRequeuing(true)
        try {
            const res = await translationService.requeueBulk(Array.from(previewSelectedIds))
            await translationService.resume()
            setPaused(false)
            setMsg(`${res.queued} вопросов поставлено в очередь на повторный перевод`)
            setPreviewSelectedIds(new Set())
            await loadCoverage()
            await loadPreview()
        } finally {
            setPreviewRequeuing(false)
        }
    }

    const togglePreviewSelect = (id: number) => {
        setPreviewSelectedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const togglePreviewSelectAll = () => {
        const pageIds = preview.map((q) => q.id)
        const allSelected = pageIds.every((id) => previewSelectedIds.has(id))
        setPreviewSelectedIds((prev) => {
            const next = new Set(prev)
            if (allSelected) pageIds.forEach((id) => next.delete(id))
            else pageIds.forEach((id) => next.add(id))
            return next
        })
    }

    const approveSelected = async () => {
        if (!selectedIds.size) return
        setApproving(true)
        try {
            const res = await translationService.approve(Array.from(selectedIds))
            setMsg(`Одобрено ${res.approved} переводов`)
            await loadCoverage()
            await loadReview()
        } finally {
            setApproving(false)
        }
    }

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        const pageIds = reviewResult?.items.map((q) => q.id) ?? []
        const allSelected = pageIds.every((id) => selectedIds.has(id))
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (allSelected) pageIds.forEach((id) => next.delete(id))
            else pageIds.forEach((id) => next.add(id))
            return next
        })
    }

    const resumeTranslation = async () => {
        await translationService.resume()
        setPaused(false)
        setMsg('Перевод запущен — фоновый воркер начнёт обработку очереди (в течение пары минут)')
        await loadCoverage()
    }

    const cancelTranslation = async () => {
        const res = await translationService.cancelTranslation()
        setPaused(true)
        setMsg(`Перевод остановлен — ${res.cleared} вопросов убрано из очереди`)
        await loadCoverage()
        await loadControl()
    }

    const downloadExport = async () => {
        if (subjectId == null) return
        setLoading(true)
        try {
            const data: any = await translationService.export(subjectId, exportStatus, 500)
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `to-translate-${data?.meta?.subject ?? subjectId}-${exportStatus}.json`
            a.click()
            URL.revokeObjectURL(url)
            setMsg(`Скачано ${data?.meta?.count ?? 0} вопросов — передай файл Claude в сессии`)
        } catch {
            setMsg('Ошибка скачивания')
        } finally {
            setLoading(false)
        }
    }
    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLoading(true)
        try {
            const parsed = JSON.parse(await file.text())
            const res = await translationService.import(parsed)
            setMsg(
                `Применено ${res.applied} переводов` +
                    (res.skipped?.length ? `, пропущено ${res.skipped.length} (нет id)` : ''),
            )
            await loadCoverage()
        } catch {
            setMsg('Ошибка: файл не распознан (нужен JSON от Claude)')
        } finally {
            setLoading(false)
            e.target.value = ''
        }
    }

    return (
        <div className="p-6 space-y-5 max-w-5xl">
            <style>{`
              .tl-bar-anim{
                background-image:linear-gradient(45deg,rgba(255,255,255,.25) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.25) 50%,rgba(255,255,255,.25) 75%,transparent 75%,transparent);
                background-size:1rem 1rem;animation:tl-stripes 1s linear infinite;
              }
              @keyframes tl-stripes{from{background-position:0 0}to{background-position:1rem 0}}
            `}</style>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Languages className="h-6 w-6 text-indigo-600" />
                        Перевод вопросов на казахский
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Настрой параметры → скачай файл → отдай Claude в сессии → загрузи перевод обратно.
                    </p>
                </div>
                <select
                    value={subjectId ?? ''}
                    onChange={(e) => setSubjectId(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {msg && (
                <div className="bg-indigo-50 text-indigo-800 text-sm rounded-lg px-4 py-2">{msg}</div>
            )}

            {/* COVERAGE */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Покрытие перевода</span>
                    <div className="flex items-center gap-2">
                        {cov?.none ? (
                            <Button className="gap-2" onClick={() => void queueSubject()}>
                                <Languages className="h-4 w-4" />
                                Перевести ({cov.none})
                            </Button>
                        ) : pausedWithQueue ? (
                            <Button className="gap-2" onClick={() => void resumeTranslation()}>
                                <Play className="h-4 w-4" />
                                Продолжить ({queuedN})
                            </Button>
                        ) : translating ? (
                            <Button className="gap-2" disabled>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Идёт перевод…
                            </Button>
                        ) : (
                            <Button className="gap-2" disabled>
                                <Languages className="h-4 w-4" />
                                Перевести
                            </Button>
                        )}
                        {queuedN > 0 && (
                            <Button
                                variant="secondary"
                                className="gap-2 text-red-600"
                                onClick={() => void cancelTranslation()}
                            >
                                <X className="h-4 w-4" /> Отменить
                            </Button>
                        )}
                        {cov && cov.done + cov.draft > 0 && (
                            <Button
                                variant="secondary"
                                className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                                onClick={() => void requeueSubject()}
                                title="Поставить все переведённые вопросы предмета в очередь заново"
                            >
                                <RotateCcw className="h-4 w-4" /> Переперевести все
                            </Button>
                        )}
                        <Button variant="secondary" className="gap-2" onClick={() => void loadCoverage()}>
                            <RefreshCw className="h-4 w-4" /> Обновить
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-indigo-600 transition-[width] duration-500 ${
                                translating ? 'tl-bar-anim' : ''
                            }`}
                            style={{ width: `${Math.max(pct, translating ? 4 : 0)}%` }}
                        />
                    </div>
                    <b className="text-sm whitespace-nowrap">
                        {cov?.done ?? 0} / {cov?.total ?? 0} · {pct}%
                    </b>
                </div>
                {translating ? (
                    <>
                        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Переводится… {cov?.done ?? 0} / {cov?.total ?? 0} · {pct}%
                            </span>
                            <span className="text-xs text-gray-400">обновляется автоматически каждые 15 с</span>
                        </div>
                        <div className="mt-3 text-sm text-indigo-800 bg-indigo-50 rounded-lg px-4 py-2.5">
                            🔄 Перевод идёт сам в фоне — осталось <b>{cov?.queued ?? 0}</b>. Нажимать ничего не
                            нужно: можно закрыть вкладку и вернуться позже. «Отменить» — остановит и очистит
                            очередь.
                        </div>
                    </>
                ) : pausedWithQueue ? (
                    <div className="mt-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-4 py-2.5">
                        ⏸ На паузе — <b>{queuedN}</b> вопросов в очереди. Нажми «Продолжить», чтобы фоновый
                        переводчик начал обработку.
                    </div>
                ) : allDone ? (
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-green-700 mt-2">
                        <CheckCircle2 className="h-4 w-4" /> Перевод завершён
                    </div>
                ) : null}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-xl border border-gray-100 p-3">
                        <div className="text-xs text-gray-500">Не переведено</div>
                        <div className="text-2xl font-bold text-gray-700">{cov?.none ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                        <div className="text-xs text-gray-500">В очереди</div>
                        <div className="text-2xl font-bold text-indigo-600">{cov?.queued ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                        <div className="text-xs text-gray-500">Черновик</div>
                        <div className="text-2xl font-bold text-amber-600">{cov?.draft ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                        <div className="text-xs text-gray-500">Готово</div>
                        <div className="text-2xl font-bold text-green-700">{cov?.done ?? 0}</div>
                    </div>
                </div>
            </div>

            {/* PARAMS */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Параметры перевода</h2>
                <div className="flex flex-wrap gap-8">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Тон</div>
                        <Seg value={tone} options={TONES} onChange={setTone} />
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Длина</div>
                        <Seg value={length} options={LENGTHS} onChange={setLength} />
                    </div>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                        Доп. инструкция (необязательно)
                    </div>
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="напр.: «термины оставить как в учебнике»"
                    />
                </div>
                <Button onClick={() => void saveConfig()}>Сохранить параметры</Button>
            </div>

            {/* GLOSSARY */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <h2 className="text-lg font-bold text-gray-900">Глоссарий — пул замен слов</h2>
                <p className="text-xs text-gray-500">Рус → Каз. Едет в файле, чтобы термины переводились одинаково.</p>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-2 pr-3">Рус</th>
                            <th className="py-2 pr-3">Каз</th>
                            <th className="py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {glossary.map((g) => (
                            <tr key={g.id} className="border-b border-gray-50">
                                <td className="py-2 pr-3">{g.term_ru}</td>
                                <td className="py-2 pr-3">{g.term_kk}</td>
                                <td className="py-2">
                                    <button onClick={() => void delTerm(g.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td className="py-2 pr-3">
                                <input
                                    value={newRu}
                                    onChange={(e) => setNewRu(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5"
                                    placeholder="слово…"
                                />
                            </td>
                            <td className="py-2 pr-3">
                                <input
                                    value={newKk}
                                    onChange={(e) => setNewKk(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5"
                                    placeholder="перевод…"
                                />
                            </td>
                            <td className="py-2">
                                <Button variant="secondary" onClick={() => void addTerm()}>＋</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FILES */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <h2 className="text-lg font-bold text-gray-900">Файлы перевода</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={exportStatus}
                        onChange={(e) => setExportStatus(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        {EXPORT_STATUS.map((s) => (
                            <option key={s.v} value={s.v}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <Button className="gap-2" onClick={() => void downloadExport()} disabled={loading}>
                        <Download className="h-4 w-4" /> Скачать на перевод
                    </Button>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium cursor-pointer hover:bg-gray-50">
                        <Upload className="h-4 w-4" /> Загрузить переводы
                        <input type="file" accept="application/json,.json" className="hidden" onChange={onUpload} />
                    </label>
                </div>
                <p className="text-xs text-gray-400">
                    Скачай → открой сессию с Claude → перетащи файл → попроси перевести → загрузи полученный файл обратно.
                </p>
            </div>

            {/* PREVIEW TRANSLATED */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-indigo-600" /> Просмотр переводов
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Seg
                            value={String(previewSample)}
                            options={[
                                { v: '10', label: 'Каждый 10-й' },
                                { v: '1', label: 'Все' },
                            ]}
                            onChange={(v) => setPreviewSample(Number(v))}
                        />
                        <Seg
                            value={previewStatus}
                            options={[
                                { v: 'done', label: 'Готово' },
                                { v: 'draft', label: 'Черновик' },
                            ]}
                            onChange={setPreviewStatus}
                        />
                        <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() => {
                                setPreviewOpened(true)
                                void loadPreview()
                            }}
                        >
                            <RefreshCw className="h-4 w-4" /> Показать
                        </Button>
                    </div>
                </div>

                {previewMeta && (
                    <p className="text-xs text-gray-500">
                        Показано {previewMeta.shown} из {previewMeta.total}
                        {previewSample > 1 ? ` (каждый ${previewSample}-й)` : ''}. Слева русский, справа казахский.
                    </p>
                )}

                {previewLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
                    </div>
                )}
                {!previewOpened && (
                    <p className="text-sm text-gray-400 py-3">
                        Жми «Показать» — увидишь переводы для выборочной проверки качества.
                    </p>
                )}
                {!previewLoading && previewOpened && preview.length === 0 && (
                    <p className="text-sm text-gray-400 py-3">Нет переведённых вопросов в этом статусе.</p>
                )}

                {/* Bulk requeue bar — shown when list is loaded */}
                {previewOpened && preview.length > 0 && (
                    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600"
                                checked={preview.length > 0 && preview.every((q) => previewSelectedIds.has(q.id))}
                                onChange={togglePreviewSelectAll}
                            />
                            Выбрать всё на странице
                        </label>
                        <Button
                            variant="secondary"
                            className="gap-2 text-indigo-700 border-indigo-200"
                            disabled={previewSelectedIds.size === 0 || previewRequeuing}
                            onClick={() => void requeueBulkPreview()}
                        >
                            {previewRequeuing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="h-4 w-4" />
                            )}
                            Переперевести выбранные{previewSelectedIds.size > 0 ? ` (${previewSelectedIds.size})` : ''}
                        </Button>
                    </div>
                )}

                <div className="space-y-3">
                    {preview.map((q) => (
                        <div key={q.id} className={`border rounded-xl overflow-hidden transition-colors ${previewSelectedIds.has(q.id) ? 'border-indigo-300 bg-indigo-50/20' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 flex-shrink-0"
                                    checked={previewSelectedIds.has(q.id)}
                                    onChange={() => togglePreviewSelect(q.id)}
                                />
                                <span className="text-sm text-gray-700 font-bold flex-1">Вопрос #{q.id}</span>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                        {previewStatus === 'draft' ? 'черновик' : 'готово'}
                                    </span>
                                    <button
                                        onClick={() => void requeueOne(q.id)}
                                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50"
                                        title="Поставить этот вопрос в очередь на повторный перевод"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" /> Перевести заново
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 py-3 border-b border-gray-100">
                                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-2">
                                    Текст вопроса
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:border-r md:pr-4 border-gray-200">
                                        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">
                                            Русский
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                            {q.question.ru || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-indigo-500 font-bold mb-1">
                                            Казахский
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                            {q.question.kk || '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {q.variants.length > 0 && (
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-2">
                                        Варианты ответа
                                    </div>
                                    {q.variants.map((v) => (
                                        <div
                                            key={v.id}
                                            className="grid grid-cols-[20px_1fr_1fr] gap-2 py-1.5 border-t border-dashed border-gray-100 first:border-t-0 text-[13.5px]"
                                        >
                                            <span className={`text-center ${v.is_correct ? 'text-green-600 font-bold' : 'text-gray-300'}`}>
                                                {v.is_correct ? '✓' : '•'}
                                            </span>
                                            <span className="text-gray-600 break-words">{v.ru || '—'}</span>
                                            <span className="text-gray-900 break-words border-l border-gray-200 pl-2.5">
                                                {v.kk || '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(q.hint.ru || q.hint.kk || q.explanation.ru || q.explanation.kk || q.task_description.ru || q.task_description.kk) && (
                                <details className="px-4 py-2.5">
                                    <summary className="cursor-pointer text-[13px] font-semibold text-indigo-600 select-none">
                                        Подсказка и пояснение
                                    </summary>
                                    <div className="mt-3 space-y-3">
                                        {(q.hint.ru || q.hint.kk) && (
                                            <PairRow label="Подсказка" ru={q.hint.ru} kk={q.hint.kk} />
                                        )}
                                        {(q.explanation.ru || q.explanation.kk) && (
                                            <PairRow label="Пояснение" ru={q.explanation.ru} kk={q.explanation.kk} />
                                        )}
                                        {(q.task_description.ru || q.task_description.kk) && (
                                            <PairRow label="Инструкция" ru={q.task_description.ru} kk={q.task_description.kk} />
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* REVIEW DRAFTS */}
            <div ref={reviewRef} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" /> Проверка черновиков
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filter tabs */}
                        {(['all', 'flagged', 'clean'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setReviewFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                    reviewFilter === f
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {f === 'all' ? 'Все' : f === 'flagged' ? '🟡 С пометками' : '✅ Чистые'}
                                {reviewResult && f === 'all' && ` (${reviewResult.total})`}
                            </button>
                        ))}
                        <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() => {
                                setReviewOpened(true)
                                void loadReview()
                            }}
                        >
                            <RefreshCw className="h-4 w-4" /> Загрузить
                        </Button>
                    </div>
                </div>

                {!reviewOpened && (
                    <p className="text-sm text-gray-400 py-3">
                        Нажми «Загрузить» — увидишь черновики с пометками для одобрения перед публикацией.
                    </p>
                )}

                {reviewLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
                    </div>
                )}

                {reviewOpened && !reviewLoading && reviewResult && (
                    <>
                        {/* Bulk actions bar */}
                        <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-emerald-600"
                                    checked={
                                        reviewResult.items.length > 0 &&
                                        reviewResult.items.every((q) => selectedIds.has(q.id))
                                    }
                                    onChange={toggleSelectAll}
                                />
                                Выбрать всё на странице
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                    Стр {reviewResult.page} из {reviewResult.pages} · {reviewResult.total} черновиков
                                </span>
                                <Button
                                    className="gap-2"
                                    disabled={selectedIds.size === 0 || approving}
                                    onClick={() => void approveSelected()}
                                >
                                    {approving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    Одобрить выбранные{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                                </Button>
                            </div>
                        </div>

                        {reviewResult.items.length === 0 && (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                Нет черновиков в этом фильтре.
                            </p>
                        )}

                        {/* Question cards */}
                        <div className="space-y-3">
                            {reviewResult.items.map((q) => {
                                const flags = q.quality_flags ?? []
                                const hasFlaggedField = (field: string) =>
                                    flags.some((f) => f.field === field)
                                const variantField = (id: number) => `variant_${id}`
                                const isSelected = selectedIds.has(q.id)

                                return (
                                    <div
                                        key={q.id}
                                        className={`border rounded-xl overflow-hidden transition-colors ${
                                            isSelected
                                                ? 'border-emerald-400 bg-emerald-50/30'
                                                : flags.length > 0
                                                ? 'border-amber-200'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        {/* Card header */}
                                        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-emerald-600 flex-shrink-0"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(q.id)}
                                            />
                                            <span className="text-sm font-bold text-gray-700 flex-1">
                                                Вопрос #{q.id}
                                            </span>
                                            {flags.length > 0 ? (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {flags.map((f, i) => (
                                                        <span
                                                            key={i}
                                                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${FLAG_BADGE[f.type]}`}
                                                        >
                                                            {FLAG_LABELS[f.type]}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                    ✅ Чисто
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5 ml-1">
                                                <button
                                                    onClick={() => void (async () => {
                                                        setApproving(true)
                                                        try {
                                                            await translationService.approve([q.id])
                                                            await loadCoverage()
                                                            await loadReview()
                                                        } finally {
                                                            setApproving(false)
                                                        }
                                                    })()}
                                                    title="Одобрить этот перевод"
                                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> Одобрить
                                                </button>
                                                <button
                                                    onClick={() => void requeueOne(q.id)}
                                                    title="Переперевести заново"
                                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" /> Заново
                                                </button>
                                            </div>
                                        </div>

                                        {/* Question text */}
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="text-[10px] uppercase tracking-wide font-bold text-gray-400 mb-2">
                                                Текст вопроса
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="md:border-r md:pr-4 border-gray-200 text-[13px] text-gray-500 whitespace-pre-wrap break-words">
                                                    {q.question.ru || '—'}
                                                </div>
                                                <div className={`text-[13px] text-gray-900 whitespace-pre-wrap break-words ${hasFlaggedField('question_text') ? 'bg-amber-50/60 -mx-1 px-1 rounded' : ''}`}>
                                                    <HighlightedText
                                                        text={q.question.kk}
                                                        flags={flags}
                                                        field="question_text"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Variants */}
                                        {q.variants.length > 0 && (
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <div className="text-[10px] uppercase tracking-wide font-bold text-gray-400 mb-2">
                                                    Варианты
                                                </div>
                                                {q.variants.map((v) => (
                                                    <div
                                                        key={v.id}
                                                        className="grid grid-cols-[18px_1fr_1fr] gap-2 py-1.5 border-t border-dashed border-gray-100 first:border-t-0 text-[13px]"
                                                    >
                                                        <span
                                                            className={`text-center ${v.is_correct ? 'text-green-600 font-bold' : 'text-gray-300'}`}
                                                        >
                                                            {v.is_correct ? '✓' : '•'}
                                                        </span>
                                                        <span className="text-gray-500 break-words">{v.ru || '—'}</span>
                                                        <span className={`text-gray-900 border-l border-gray-200 pl-2.5 break-words ${hasFlaggedField(variantField(v.id)) ? 'bg-amber-50/60' : ''}`}>
                                                            <HighlightedText
                                                                text={v.kk}
                                                                flags={flags}
                                                                field={variantField(v.id)}
                                                            />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Hint / explanation (collapsed) */}
                                        {(q.hint.kk || q.explanation.kk || q.task_description.kk) && (
                                            <details className="px-4 py-2.5">
                                                <summary className="cursor-pointer text-[13px] font-semibold text-indigo-600 select-none">
                                                    Подсказка и пояснение
                                                </summary>
                                                <div className="mt-3 space-y-3">
                                                    {(q.hint.ru || q.hint.kk) && (
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Подсказка</div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="text-[13px] text-gray-500 md:border-r md:pr-4 border-gray-200">{q.hint.ru || '—'}</div>
                                                                <div className="text-[13px] text-gray-900">
                                                                    <HighlightedText text={q.hint.kk} flags={flags} field="hint" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(q.explanation.ru || q.explanation.kk) && (
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Пояснение</div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="text-[13px] text-gray-500 md:border-r md:pr-4 border-gray-200">{q.explanation.ru || '—'}</div>
                                                                <div className="text-[13px] text-gray-900">
                                                                    <HighlightedText text={q.explanation.kk} flags={flags} field="explanation" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {reviewResult.pages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <button
                                    disabled={reviewResult.page <= 1}
                                    onClick={() => setReviewPage((p) => p - 1)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Предыдущая
                                </button>
                                <span className="text-sm text-gray-500">
                                    Стр {reviewResult.page} / {reviewResult.pages}
                                </span>
                                <button
                                    disabled={reviewResult.page >= reviewResult.pages}
                                    onClick={() => setReviewPage((p) => p + 1)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    Следующая <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default TranslationPage

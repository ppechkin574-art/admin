import React, { useCallback, useEffect, useState } from 'react'
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
} from 'lucide-react'
import {
    translationService,
    subjectService,
    CoverageRow,
    GlossaryRow,
    PreviewItem,
} from '@/services/api'
import Button from '@/components/common/Button'

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
    }, [previewOpened, loadPreview])

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

                <div className="space-y-3">
                    {preview.map((q) => (
                        <div key={q.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                <span className="text-sm text-gray-700 font-bold">Вопрос #{q.id}</span>
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
        </div>
    )
}

export default TranslationPage

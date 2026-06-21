import React, { useCallback, useEffect, useState } from 'react'
import { Languages, Download, Upload, RefreshCw, Trash2 } from 'lucide-react'
import {
    translationService,
    subjectService,
    CoverageRow,
    GlossaryRow,
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

    const loadCoverage = useCallback(async () => {
        const c = await translationService.coverage().catch(() => ({ items: [] }))
        setCoverage(c.items ?? [])
    }, [])

    useEffect(() => {
        void (async () => {
            const data: any = await subjectService.getAll().catch(() => [])
            const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? []
            const subs = list.map((s: any) => ({ id: s.id, name: s.name }))
            setSubjects(subs)
            setSubjectId((prev) => prev ?? (subs[0]?.id ?? null))
        })()
        void loadCoverage()
    }, [loadCoverage])

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

    const cov = coverage.find((c) => c.subject_id === subjectId)
    const pct = cov && cov.total > 0 ? Math.round((cov.done / cov.total) * 100) : 0

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
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Покрытие перевода</span>
                    <Button variant="secondary" className="gap-2" onClick={() => void loadCoverage()}>
                        <RefreshCw className="h-4 w-4" /> Обновить
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
                    </div>
                    <b className="text-sm">
                        {cov?.done ?? 0} / {cov?.total ?? 0} · {pct}%
                    </b>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-xl border border-gray-100 p-3">
                        <div className="text-xs text-gray-500">Не переведено</div>
                        <div className="text-2xl font-bold text-gray-700">{cov?.none ?? 0}</div>
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
        </div>
    )
}

export default TranslationPage

import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
    BookOpen, ChevronDown, ChevronUp, Eye, EyeOff,
    GripVertical, ImagePlus, Languages, Layers, Plus,
    Save, Settings2, Trash2, Users, X, Zap, Clock,
    ToggleLeft, ToggleRight, Star, MonitorSmartphone, Key, RefreshCw,
} from 'lucide-react'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { onboardingService } from '@/services/api'
import {
    OnboardingStory, OnboardingStep, SpotlightKey,
    TargetAudience, TriggerType, MascotPosition, StartScreen,
    MASCOT_POSITIONS, START_SCREENS,
    loadSpotlightKeys, saveSpotlightKeys,
    makeEmptyStep, makeEmptyStory,
} from './types'

// ─── small helpers ──────────────────────────────────────────────────────────

const audienceLabel = (s: OnboardingStory) =>
    s.target_audience === 'ALL' ? 'Все' : `Новые ≤${s.new_user_days}д`

const triggerLabel = (s: OnboardingStory) =>
    s.trigger === 'FIRST_OPEN' ? 'Первый запуск' : `Сразу ×${s.immediate_count}`

// ─── StepEditor ─────────────────────────────────────────────────────────────

interface StepEditorProps {
    step: OnboardingStep
    index: number
    total: number
    spotlightKeys: SpotlightKey[]
    onChange: (updated: OnboardingStep) => void
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
}

const StepEditor: React.FC<StepEditorProps> = ({ step, index, total, spotlightKeys, onChange, onMoveUp, onMoveDown, onDelete }) => {
    const [open, setOpen] = useState(index === 0)
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const upd = (patch: Partial<OnboardingStep>) => onChange({ ...step, ...patch })

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        // Show local preview immediately
        const reader = new FileReader()
        reader.onload = ev => upd({ mascot_image_preview: ev.target?.result as string })
        reader.readAsDataURL(file)
        // Upload to server
        setUploading(true)
        try {
            const { url } = await onboardingService.uploadImage(file)
            upd({ mascot_image_url: url, mascot_image_preview: null })
            toast.success('Изображение загружено')
        } catch {
            toast.error('Ошибка загрузки изображения')
        } finally {
            setUploading(false)
        }
    }

    const preview = step.mascot_image_preview || step.mascot_image_url

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 cursor-pointer select-none"
                onClick={() => setOpen(o => !o)}
            >
                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                    {step.title_ru || <span className="text-gray-400 italic">Без заголовка</span>}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={e => { e.stopPropagation(); onMoveUp() }}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); onMoveDown() }}
                        disabled={index === total - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); onDelete() }}
                        className="p-1 rounded hover:bg-red-100 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {open
                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                        : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
            </div>

            {open && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Mascot image */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Маскот (PNG)
                            </label>
                            <div
                                onClick={() => !uploading && fileRef.current?.click()}
                                className={`relative h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 cursor-pointer flex items-center justify-center overflow-hidden bg-gray-50 transition-colors ${uploading ? 'opacity-60 cursor-wait' : ''}`}
                            >
                                {uploading
                                    ? <div className="flex flex-col items-center gap-1 text-indigo-500">
                                        <RefreshCw className="h-6 w-6 animate-spin" />
                                        <span className="text-xs">Загрузка...</span>
                                      </div>
                                    : preview
                                    ? <img src={preview} alt="mascot" className="h-full w-full object-contain p-1" />
                                    : <div className="flex flex-col items-center gap-1 text-gray-400">
                                        <ImagePlus className="h-7 w-7" />
                                        <span className="text-xs">PNG с прозрачностью</span>
                                      </div>
                                }
                                {preview && (
                                    <button type="button"
                                        onClick={e => { e.stopPropagation(); upd({ mascot_image_preview: null, mascot_image_url: null }) }}
                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/40 text-white hover:bg-black/60">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/png,image/webp" className="hidden" onChange={handleImage} />
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Позиция маскота</label>
                                <select
                                    value={step.mascot_position}
                                    onChange={e => upd({ mascot_position: e.target.value as MascotPosition })}
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {MASCOT_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Texts RU */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Languages className="h-3.5 w-3.5" /> Русский
                            </label>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Заголовок</label>
                                <input
                                    type="text" value={step.title_ru} maxLength={80}
                                    onChange={e => upd({ title_ru: e.target.value })}
                                    placeholder="Сәлем! 👋"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Текст</label>
                                <textarea
                                    value={step.body_ru} maxLength={300} rows={4}
                                    onChange={e => upd({ body_ru: e.target.value })}
                                    placeholder="Я — Айбек, твой проводник..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Texts KK */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Languages className="h-3.5 w-3.5" /> Қазақша
                            </label>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Тақырып</label>
                                <input
                                    type="text" value={step.title_kk} maxLength={80}
                                    onChange={e => upd({ title_kk: e.target.value })}
                                    placeholder="Сәлем! 👋"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Мәтін</label>
                                <textarea
                                    value={step.body_kk} maxLength={300} rows={4}
                                    onChange={e => upd({ body_kk: e.target.value })}
                                    placeholder="Мен — Айбек, сенің бағыттаушың..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spotlight + Action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                Spotlight-подсветка
                            </label>
                            <select
                                value={step.spotlight_element_key}
                                onChange={e => upd({ spotlight_element_key: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">— нет подсветки —</option>
                                {spotlightKeys.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                            </select>
                            {step.spotlight_element_key && (
                                <p className="text-xs text-indigo-600 mt-1">
                                    Ключ: <code className="bg-indigo-50 px-1 rounded">{step.spotlight_element_key}</code>
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                Кнопка действия (необязательно)
                            </label>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text" value={step.action_label_ru}
                                        onChange={e => upd({ action_label_ru: e.target.value })}
                                        placeholder="Перейти (RU)"
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <input
                                        type="text" value={step.action_label_kk}
                                        onChange={e => upd({ action_label_kk: e.target.value })}
                                        placeholder="Өту (KK)"
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                                <input
                                    type="text" value={step.action_route}
                                    onChange={e => upd({ action_route: e.target.value })}
                                    placeholder="Маршрут: trainer, profile, subscription..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── StoryForm ───────────────────────────────────────────────────────────────

interface StoryFormProps {
    initial: OnboardingStory
    spotlightKeys: SpotlightKey[]
    onSave: (s: OnboardingStory) => void
    onCancel: () => void
}

const StoryForm: React.FC<StoryFormProps> = ({ initial, spotlightKeys, onSave, onCancel }) => {
    const [story, setStory] = useState<OnboardingStory>(initial)
    const upd = (patch: Partial<OnboardingStory>) => setStory(s => ({ ...s, ...patch }))

    const updateStep = (idx: number, updated: OnboardingStep) => {
        const steps = [...story.steps]
        steps[idx] = updated
        upd({ steps })
    }

    const addStep = () => {
        upd({ steps: [...story.steps, makeEmptyStep(story.steps.length + 1)] })
    }

    const deleteStep = (idx: number) => {
        if (story.steps.length <= 1) { toast.error('Минимум 1 шаг'); return }
        const steps = story.steps.filter((_, i) => i !== idx)
            .map((s, i) => ({ ...s, step_order: i + 1 }))
        upd({ steps })
    }

    const moveStep = (idx: number, dir: -1 | 1) => {
        const steps = [...story.steps]
        const target = idx + dir
        if (target < 0 || target >= steps.length) return
        ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
        upd({ steps: steps.map((s, i) => ({ ...s, step_order: i + 1 })) })
    }

    const handleSave = () => {
        if (!story.name.trim()) { toast.error('Введите название рассказа'); return }
        if (story.steps.some(s => !s.title_ru.trim())) { toast.error('Заполните заголовок (RU) для всех шагов'); return }
        onSave(story)
    }

    return (
        <div className="space-y-6">
            {/* ── Основное ── */}
            <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Основное
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Название рассказа</label>
                        <input
                            type="text" value={story.name}
                            onChange={e => upd({ name: e.target.value })}
                            placeholder="Онбординг новых пользователей"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">Внутреннее название, пользователи не видят</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            <Star className="h-3.5 w-3.5 inline mr-1" />Приоритет
                        </label>
                        <input
                            type="number" min={0} max={999} value={story.priority}
                            onChange={e => upd({ priority: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">Выше число = показывается первым</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button type="button" onClick={() => upd({ is_active: !story.is_active })}
                        className="flex items-center gap-2 text-sm">
                        {story.is_active
                            ? <ToggleRight className="h-6 w-6 text-green-500" />
                            : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                        <span className={story.is_active ? 'text-green-700 font-medium' : 'text-gray-500'}>
                            {story.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                    </button>
                    <button type="button" onClick={() => upd({ is_mandatory: !story.is_mandatory })}
                        className="flex items-center gap-2 text-sm">
                        {story.is_mandatory
                            ? <ToggleRight className="h-6 w-6 text-orange-500" />
                            : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                        <span className={story.is_mandatory ? 'text-orange-700 font-medium' : 'text-gray-500'}>
                            {story.is_mandatory ? 'Обязательный (блокирует UI)' : 'Необязательный'}
                        </span>
                    </button>
                    <button type="button" onClick={() => upd({ is_test: !story.is_test })}
                        className="flex items-center gap-2 text-sm">
                        {story.is_test
                            ? <ToggleRight className="h-6 w-6 text-purple-500" />
                            : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                        <span className={story.is_test ? 'text-purple-700 font-medium' : 'text-gray-500'}>
                            {story.is_test ? 'Тестовый (только вы)' : 'Продовый (все пользователи)'}
                        </span>
                    </button>
                </div>

                {story.is_mandatory && (
                    <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <label className="text-sm text-gray-700">Кнопка «Пропустить» появляется через</label>
                        <input
                            type="number" min={0} max={60} value={story.skip_delay_seconds}
                            onChange={e => upd({ skip_delay_seconds: Number(e.target.value) })}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="text-sm text-gray-500">секунд</span>
                    </div>
                )}
            </section>

            {/* ── Аудитория ── */}
            <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" /> Аудитория
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {(['ALL', 'NEW_USERS'] as TargetAudience[]).map(v => (
                        <button key={v} type="button"
                            onClick={() => upd({ target_audience: v })}
                            className={`p-3 rounded-xl border-2 text-left transition-colors ${
                                story.target_audience === v
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={`text-sm font-semibold ${story.target_audience === v ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {v === 'ALL' ? 'Все пользователи' : 'Только новые'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {v === 'ALL' ? 'Показывается всем активным пользователям' : 'С момента регистрации не прошло N дней'}
                            </div>
                        </button>
                    ))}
                </div>
                {story.target_audience === 'NEW_USERS' && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">Новый = зарегистрирован не более</span>
                        <input
                            type="number" min={1} max={365} value={story.new_user_days}
                            onChange={e => upd({ new_user_days: Number(e.target.value) })}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="text-sm text-gray-500">дней назад</span>
                    </div>
                )}
            </section>

            {/* ── Показ и частота ── */}
            <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Когда показывать
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {(['FIRST_OPEN', 'IMMEDIATE'] as TriggerType[]).map(v => (
                        <button key={v} type="button"
                            onClick={() => upd({ trigger: v })}
                            className={`p-3 rounded-xl border-2 text-left transition-colors ${
                                story.trigger === v
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={`text-sm font-semibold ${story.trigger === v ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {v === 'FIRST_OPEN' ? 'При первом запуске' : 'Сразу при публикации'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {v === 'FIRST_OPEN'
                                    ? 'Показывается когда пользователь впервые открывает приложение'
                                    : 'Показывается при следующем входе пользователя после включения рассказа'}
                            </div>
                        </button>
                    ))}
                </div>

                {story.trigger === 'IMMEDIATE' && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700">Показать</span>
                        <input
                            type="number" min={1} max={10} value={story.immediate_count}
                            onChange={e => upd({ immediate_count: Number(e.target.value) })}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="text-sm text-gray-500">раз(а) при первом заходе после публикации</span>
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-700">Максимум показов одному пользователю:</span>
                    <input
                        type="number" min={1} max={100} value={story.max_shows_per_user}
                        onChange={e => upd({ max_shows_per_user: Number(e.target.value) })}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-sm text-gray-500">{story.max_shows_per_user === 1 ? '(один раз за всю жизнь)' : 'раз'}</span>
                </div>
            </section>

            {/* ── Экран старта ── */}
            <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <MonitorSmartphone className="h-4 w-4" /> Экран старта
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {START_SCREENS.map(s => (
                        <button key={s.value} type="button"
                            onClick={() => upd({ start_screen: s.value as StartScreen })}
                            className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                                story.start_screen === s.value
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-400">Приложение перейдёт на этот экран перед показом рассказа</p>
            </section>

            {/* ── Шаги ── */}
            <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Шаги ({story.steps.length})
                    </h3>
                    <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addStep}>
                        Добавить шаг
                    </Button>
                </div>

                <div className="space-y-3">
                    {story.steps.map((step, idx) => (
                        <StepEditor
                            key={step.id}
                            step={step}
                            index={idx}
                            total={story.steps.length}
                            spotlightKeys={spotlightKeys}
                            onChange={updated => updateStep(idx, updated)}
                            onMoveUp={() => moveStep(idx, -1)}
                            onMoveDown={() => moveStep(idx, 1)}
                            onDelete={() => deleteStep(idx)}
                        />
                    ))}
                </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pb-6">
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={handleSave}>
                    Сохранить рассказ
                </Button>
            </div>
        </div>
    )
}

// ─── StoryCard ───────────────────────────────────────────────────────────────

interface StoryCardProps {
    story: OnboardingStory
    onEdit: () => void
    onDelete: () => void
    onToggle: (story: OnboardingStory) => void
}

const StoryCard: React.FC<StoryCardProps> = ({ story, onEdit, onDelete, onToggle }) => (
    <div className={`bg-white rounded-2xl shadow-sm border-2 transition-colors ${
        story.is_active ? 'border-green-200' : 'border-gray-100'
    }`}>
        <div className="p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-base font-semibold text-gray-900 truncate">{story.name || 'Без названия'}</span>
                        {story.is_active
                            ? <Badge type="success">Активен</Badge>
                            : <Badge type="secondary">Неактивен</Badge>}
                        {story.is_mandatory
                            ? <Badge type="warning">Обязательный</Badge>
                            : <Badge type="info">Необязательный</Badge>}
                        {story.is_test && <Badge type="hint">Тест</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" /> Приоритет: {story.priority}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {audienceLabel(story)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> {triggerLabel(story)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" /> {story.steps.length} шагов
                        </span>
                        <span className="flex items-center gap-1">
                            <MonitorSmartphone className="h-3 w-3" />
                            {START_SCREENS.find(s => s.value === story.start_screen)?.label ?? story.start_screen}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Пропуск через {story.skip_delay_seconds}с
                        </span>
                        <span>Макс. {story.max_shows_per_user}× на юзера</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => onToggle(story)}
                        title={story.is_active ? 'Деактивировать' : 'Активировать'}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        {story.is_active
                            ? <EyeOff className="h-4 w-4 text-gray-500" />
                            : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                    <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <Settings2 className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                </div>
            </div>

            {/* Step previews */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {story.steps.map((step, i) => (
                    <div key={step.id} className="flex-shrink-0 flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                        </span>
                        <span className="text-xs text-gray-600 max-w-[120px] truncate">
                            {step.title_ru || '—'}
                        </span>
                        {step.spotlight_element_key && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">spotlight</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
)

// ─── SpotlightKeysManager ────────────────────────────────────────────────────

interface SpotlightKeysManagerProps {
    keys: SpotlightKey[]
    onChange: (keys: SpotlightKey[]) => void
}

const SpotlightKeysManager: React.FC<SpotlightKeysManagerProps> = ({ keys, onChange }) => {
    const [open, setOpen] = useState(false)
    const [newValue, setNewValue] = useState('')
    const [newLabel, setNewLabel] = useState('')

    const add = () => {
        const v = newValue.trim()
        const l = newLabel.trim()
        if (!v || !l) { toast.error('Заполните оба поля'); return }
        if (keys.some(k => k.value === v)) { toast.error('Ключ уже существует'); return }
        onChange([...keys, { value: v, label: l }])
        setNewValue(''); setNewLabel('')
        toast.success('Ключ добавлен')
    }

    const remove = (value: string) => {
        onChange(keys.filter(k => k.value !== value))
        toast.success('Ключ удалён')
    }

    const updateLabel = (value: string, label: string) => {
        onChange(keys.map(k => k.value === value ? { ...k, label } : k))
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Key className="h-4 w-4" /> Spotlight-ключи ({keys.length})
                </span>
                {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400">
                        Ключи соответствуют <code className="bg-gray-100 px-1 rounded">GlobalKey</code> в Flutter-коде.
                        Добавляйте новые при регистрации нового UI-элемента в приложении.
                    </p>

                    {/* Existing keys */}
                    <div className="space-y-2">
                        {keys.map(k => (
                            <div key={k.value} className="flex items-center gap-2">
                                <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0 min-w-[160px]">
                                    {k.value}
                                </code>
                                <input
                                    type="text"
                                    value={k.label}
                                    onChange={e => updateLabel(k.value, e.target.value)}
                                    onBlur={() => toast.success('Название обновлено')}
                                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => remove(k.value)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add new */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <input
                            type="text"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value.replace(/\s/g, '_').toLowerCase())}
                            placeholder="ключ_flutter (snake_case)"
                            className="w-44 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <input
                            type="text"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="Название для админки"
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                            type="button"
                            onClick={add}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex-shrink-0"
                        >
                            <Plus className="h-3.5 w-3.5" /> Добавить
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export const OnboardingPage: React.FC = () => {
    const [stories, setStories] = useState<OnboardingStory[]>([])
    const [loading, setLoading] = useState(true)
    const [spotlightKeys, setSpotlightKeys] = useState<SpotlightKey[]>(loadSpotlightKeys)
    const [editing, setEditing] = useState<OnboardingStory | null>(null)
    const [creating, setCreating] = useState(false)

    const fetchStories = async () => {
        setLoading(true)
        try {
            const data = await onboardingService.listStories()
            setStories(data)
        } catch {
            toast.error('Не удалось загрузить рассказы')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchStories() }, [])

    const handleSpotlightChange = (keys: SpotlightKey[]) => {
        setSpotlightKeys(keys)
        saveSpotlightKeys(keys)
    }

    const handleSave = async (story: OnboardingStory) => {
        try {
            const payload = {
                name: story.name,
                priority: story.priority,
                is_active: story.is_active,
                is_mandatory: story.is_mandatory,
                is_test: story.is_test,
                skip_delay_seconds: story.skip_delay_seconds,
                target_audience: story.target_audience,
                new_user_days: story.new_user_days,
                trigger: story.trigger,
                immediate_count: story.immediate_count,
                max_shows_per_user: story.max_shows_per_user,
                start_screen: story.start_screen,
                steps: story.steps.map(s => ({
                    step_order: s.step_order,
                    mascot_image_url: s.mascot_image_url || null,
                    title_ru: s.title_ru,
                    title_kk: s.title_kk,
                    body_ru: s.body_ru,
                    body_kk: s.body_kk,
                    mascot_position: s.mascot_position,
                    spotlight_element_key: s.spotlight_element_key || null,
                    action_label_ru: s.action_label_ru || null,
                    action_label_kk: s.action_label_kk || null,
                    action_route: s.action_route || null,
                })),
            }
            if (editing && editing.id) {
                await onboardingService.updateStory(Number(editing.id), payload)
                toast.success('Рассказ обновлён')
            } else {
                await onboardingService.createStory(payload)
                toast.success('Рассказ создан')
            }
            setEditing(null)
            setCreating(false)
            await fetchStories()
        } catch {
            toast.error('Ошибка сохранения')
        }
    }

    const handleDelete = async (id: number | string) => {
        if (!confirm('Удалить рассказ? Это действие нельзя отменить.')) return
        try {
            await onboardingService.deleteStory(id as number)
            toast.success('Удалено')
            setStories(prev => prev.filter(s => s.id !== id))
        } catch {
            toast.error('Ошибка удаления')
        }
    }

    const handleToggle = async (story: OnboardingStory) => {
        try {
            await onboardingService.updateStory(Number(story.id), { is_active: !story.is_active })
            setStories(prev => prev.map(s => s.id === story.id ? { ...s, is_active: !s.is_active } : s))
        } catch {
            toast.error('Ошибка обновления')
        }
    }

    if (creating || editing) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => { setCreating(false); setEditing(null) }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-500" />
                        {editing ? `Редактировать: ${editing.name || 'рассказ'}` : 'Новый рассказ'}
                    </h1>
                </div>
                <StoryForm
                    initial={editing ?? makeEmptyStory()}
                    spotlightKeys={spotlightKeys}
                    onSave={handleSave}
                    onCancel={() => { setCreating(false); setEditing(null) }}
                />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-500" />
                        Онбординг-рассказы
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Пошаговые обучающие сценарии с маскотом. Показываются поверх приложения.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStories} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                        Создать рассказ
                    </Button>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-sm text-indigo-800">
                <strong>Как работает:</strong> При входе в приложение показывается 1 рассказ с наивысшим приоритетом,
                подходящий пользователю. Обязательные рассказы блокируют UI — пользователь не может закрыть
                пока не пройдёт или не пропустит (кнопка появляется через N секунд).
            </div>

            {/* Spotlight keys manager */}
            <div className="mb-6">
                <SpotlightKeysManager keys={spotlightKeys} onChange={handleSpotlightChange} />
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-16 text-gray-400">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-300" />
                    <p className="text-sm">Загрузка...</p>
                </div>
            )}

            {/* Empty state */}
            {!loading && stories.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500 mb-1">Рассказов пока нет</p>
                    <p className="text-sm mb-4">Создайте первый онбординг-сценарий для пользователей</p>
                    <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                        Создать первый рассказ
                    </Button>
                </div>
            )}

            {/* Stories list */}
            {!loading && (
                <div className="space-y-3">
                    {stories.map(story => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            onEdit={() => setEditing(story)}
                            onDelete={() => handleDelete(story.id)}
                            onToggle={() => handleToggle(story)}
                        />
                    ))}
                </div>
            )}

            {!loading && stories.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-6">
                    {stories.filter(s => s.is_active).length} активных из {stories.length} рассказов ·
                    Сортировка по приоритету (наивысший — первый)
                </p>
            )}
        </div>
    )
}

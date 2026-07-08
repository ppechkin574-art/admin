import { useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, Check, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { eventsService, EventItem, EventCreatePayload } from '@/services/api'
import ConfirmModal from '@/components/common/ConfirmModal'

const EMPTY_FORM: EventCreatePayload = {
  type: 'banner',
  badge_text: '',
  badge_text_kk: null,
  title: '',
  title_kk: null,
  prize_text: null,
  prize_text_kk: null,
  subtitle: null,
  subtitle_kk: null,
  secondary_text: null,
  secondary_text_kk: null,
  deadline: null,
  button_text: null,
  button_text_kk: null,
  bg_color: '#5B2EC4',
  progress_current: null,
  progress_max: null,
  sort_order: 0,
  is_active: true,
}

interface FormState {
  type: 'banner' | 'card'
  badge_text: string
  badge_text_kk: string
  title: string
  title_kk: string
  prize_text: string
  prize_text_kk: string
  subtitle: string
  subtitle_kk: string
  secondary_text: string
  secondary_text_kk: string
  deadline: string
  button_text: string
  button_text_kk: string
  bg_color: string
  progress_current: string
  progress_max: string
  sort_order: string
  is_active: boolean
}

function toForm(src: Partial<EventItem>): FormState {
  return {
    type: src.type ?? 'banner',
    badge_text: src.badge_text ?? '',
    badge_text_kk: src.badge_text_kk ?? '',
    title: src.title ?? '',
    title_kk: src.title_kk ?? '',
    prize_text: src.prize_text ?? '',
    prize_text_kk: src.prize_text_kk ?? '',
    subtitle: src.subtitle ?? '',
    subtitle_kk: src.subtitle_kk ?? '',
    secondary_text: src.secondary_text ?? '',
    secondary_text_kk: src.secondary_text_kk ?? '',
    deadline: src.deadline ? src.deadline.slice(0, 16) : '',
    button_text: src.button_text ?? '',
    button_text_kk: src.button_text_kk ?? '',
    bg_color: src.bg_color ?? '#5B2EC4',
    progress_current: src.progress_current != null ? String(src.progress_current) : '',
    progress_max: src.progress_max != null ? String(src.progress_max) : '',
    sort_order: String(src.sort_order ?? 0),
    is_active: src.is_active ?? true,
  }
}

function fromForm(f: FormState): EventCreatePayload {
  return {
    type: f.type,
    badge_text: f.badge_text,
    badge_text_kk: f.badge_text_kk || null,
    title: f.title,
    title_kk: f.title_kk || null,
    prize_text: f.prize_text || null,
    prize_text_kk: f.prize_text_kk || null,
    subtitle: f.subtitle || null,
    subtitle_kk: f.subtitle_kk || null,
    secondary_text: f.secondary_text || null,
    secondary_text_kk: f.secondary_text_kk || null,
    deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
    button_text: f.button_text || null,
    button_text_kk: f.button_text_kk || null,
    bg_color: f.bg_color || null,
    progress_current: f.progress_current ? parseInt(f.progress_current) : null,
    progress_max: f.progress_max ? parseInt(f.progress_max) : null,
    sort_order: parseInt(f.sort_order) || 0,
    is_active: f.is_active,
  }
}

export default function EventsList() {
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(toForm(EMPTY_FORM))
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const iconInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      setItems(await eventsService.list())
    } catch {
      toast.error('Ошибка загрузки событий')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startCreate() {
    setCreating(true)
    setEditingId(null)
    setForm(toForm(EMPTY_FORM))
    setIconFile(null)
    setIconPreview(null)
  }

  function startEdit(item: EventItem) {
    setEditingId(item.id)
    setCreating(false)
    setForm(toForm(item))
    setIconFile(null)
    setIconPreview(item.icon_url ?? null)
  }

  function cancel() {
    setCreating(false)
    setEditingId(null)
    setIconFile(null)
    setIconPreview(null)
  }

  function onIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setIconFile(f)
    setIconPreview(URL.createObjectURL(f))
  }

  async function uploadIcon(eventId: number) {
    if (!iconFile) return
    setUploadingIcon(true)
    try {
      const updated = await eventsService.uploadIcon(eventId, iconFile)
      setItems(prev => prev.map(i => i.id === eventId ? updated : i))
      setIconFile(null)
      setIconPreview(updated.icon_url ?? null)
      toast.success('Иконка загружена')
    } catch {
      toast.error('Ошибка загрузки иконки')
    } finally {
      setUploadingIcon(false)
    }
  }

  async function save() {
    if (!form.badge_text.trim() || !form.title.trim()) {
      toast.error('Заполни бейдж и заголовок')
      return
    }
    setSaving(true)
    try {
      const payload = fromForm(form)
      if (creating) {
        let created = await eventsService.create(payload)
        if (iconFile) {
          try {
            created = await eventsService.uploadIcon(created.id, iconFile)
          } catch {
            toast.error('Событие создано, но иконку загрузить не удалось')
          }
        }
        setItems(prev => [...prev, created])
        toast.success('Создано')
      } else if (editingId != null) {
        const updated = await eventsService.update(editingId, payload)
        setItems(prev => prev.map(i => i.id === editingId ? updated : i))
        toast.success('Сохранено')
      }
      cancel()
    } catch {
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await eventsService.remove(deleteTarget.id)
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      toast.success('Удалено')
    } catch {
      toast.error('Ошибка удаления')
    } finally {
      setDeleteTarget(null)
    }
  }

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const showForm = creating || editingId != null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">События</h1>
          <p className="text-sm text-gray-500 mt-1">Баннеры и карточки на экране «Главная»</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Создать
          </button>
        </div>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">{creating ? 'Новое событие' : 'Редактировать'}</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Тип</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.type}
                onChange={e => setField('type', e.target.value as 'banner' | 'card')}
              >
                <option value="banner">banner — главный баннер</option>
                <option value="card">card — карточка «События»</option>
              </select>
            </div>
            {/* Sort order */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Порядок сортировки</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.sort_order}
                onChange={e => setField('sort_order', e.target.value)}
              />
            </div>
            {/* Badge text */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Бейдж *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="СОБЫТИЕ МЕСЯЦА"
                value={form.badge_text}
                onChange={e => setField('badge_text', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Бейдж KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="АЙ ОҚИҒАСЫ"
                value={form.badge_text_kk}
                onChange={e => setField('badge_text_kk', e.target.value)}
              />
            </div>
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Заголовок *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Большой турнир"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Заголовок KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Үлкен турнир"
                value={form.title_kk}
                onChange={e => setField('title_kk', e.target.value)}
              />
            </div>
            {/* Prize text */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Сумма приза</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="5 000 000 ₸"
                value={form.prize_text}
                onChange={e => setField('prize_text', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Сумма приза KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="5 000 000 ₸"
                value={form.prize_text_kk}
                onChange={e => setField('prize_text_kk', e.target.value)}
              />
            </div>
            {/* Button text */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Текст кнопки (баннер)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Подробнее →"
                value={form.button_text}
                onChange={e => setField('button_text', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Текст кнопки KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Толығырақ →"
                value={form.button_text_kk}
                onChange={e => setField('button_text_kk', e.target.value)}
              />
            </div>
            {/* Subtitle */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Подзаголовок</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Борись за 5 000 000 ₸ и попади в топ!"
                value={form.subtitle}
                onChange={e => setField('subtitle', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Подзаголовок KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="5 000 000 ₸ үшін күрес және ТОП-қа кір!"
                value={form.subtitle_kk}
                onChange={e => setField('subtitle_kk', e.target.value)}
              />
            </div>
            {/* Secondary text */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Доп. текст (карточка)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Победитель получит планшет"
                value={form.secondary_text}
                onChange={e => setField('secondary_text', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Доп. текст KK</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Жеңімпаз планшет алады"
                value={form.secondary_text_kk}
                onChange={e => setField('secondary_text_kk', e.target.value)}
              />
            </div>
            {/* Deadline */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Дедлайн (таймер)</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.deadline}
                onChange={e => setField('deadline', e.target.value)}
              />
            </div>
            {/* BG color */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Цвет фона (баннер)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="h-9 w-12 border border-gray-200 rounded cursor-pointer"
                  value={form.bg_color || '#5B2EC4'}
                  onChange={e => setField('bg_color', e.target.value)}
                />
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={form.bg_color}
                  onChange={e => setField('bg_color', e.target.value)}
                />
              </div>
            </div>
            {/* Icon upload */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Иконка события (фото реалистичная, PNG с прозрачностью)</label>
              <div className="flex items-center gap-3">
                {iconPreview && (
                  <img
                    src={iconPreview}
                    alt="иконка"
                    className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onIconFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {iconPreview ? 'Заменить иконку' : 'Выбрать иконку'}
                  </button>
                  {iconFile && editingId != null && (
                    <button
                      type="button"
                      onClick={() => uploadIcon(editingId)}
                      disabled={uploadingIcon}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {uploadingIcon ? 'Загружаем...' : 'Загрузить в MinIO'}
                    </button>
                  )}
                  {iconFile && creating && (
                    <p className="text-xs text-gray-400">Иконка загрузится после создания события</p>
                  )}
                </div>
              </div>
            </div>
            {/* Progress */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Прогресс текущий</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="12340"
                value={form.progress_current}
                onChange={e => setField('progress_current', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Прогресс максимум</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="50000"
                value={form.progress_max}
                onChange={e => setField('progress_max', e.target.value)}
              />
            </div>
            {/* is_active */}
            <div className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setField('is_active', e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Активно (показывать в приложении)</label>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
            >
              <X className="w-4 h-4" /> Отмена
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бейдж / Заголовок</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Приз</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дедлайн</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Загрузка...' : 'Нет событий. Создайте первое.'}
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.type === 'banner'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.badge_text}</div>
                  <div className="text-gray-500 text-xs">{item.title}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.prize_text ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {item.deadline
                    ? new Date(item.deadline).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.is_active ? 'Активно' : 'Скрыто'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Редактировать"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Удалить событие?"
        message={`«${deleteTarget?.title}» будет удалено безвозвратно.`}
        type="danger"
      />
    </div>
  )
}

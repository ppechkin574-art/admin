import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  History,
} from 'lucide-react'
import {
  crmService,
  CrmTask,
  CrmActivity,
  CrmMember,
  CrmStatus,
  CrmPriority,
} from '@/services/api'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'

/* ----------------------------- constants ----------------------------- */

const STATUSES: { key: CrmStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'Не начато', color: '#94a3b8' },
  { key: 'prog', label: 'В работе', color: '#3b82f6' },
  { key: 'hold', label: 'Заморожено', color: '#06b6d4' },
  { key: 'done', label: 'Выполнено', color: '#22c55e' },
]
const statusLabel = (k: CrmStatus) => STATUSES.find((s) => s.key === k)?.label ?? k
const statusColor = (k: CrmStatus) => STATUSES.find((s) => s.key === k)?.color ?? '#94a3b8'

const PRIORITY: Record<CrmPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'Высокий', color: '#dc2626', bg: '#fee2e2' },
  mid: { label: 'Средний', color: '#d97706', bg: '#fef3c7' },
  low: { label: 'Низкий', color: '#64748b', bg: '#eef1f5' },
}

const LABEL_PALETTE: Record<string, { color: string; bg: string }> = {
  'баг': { color: '#b91c1c', bg: '#fee2e2' },
  'блокер': { color: '#9f1239', bg: '#ffe4e6' },
  'срочно': { color: '#c2410c', bg: '#ffedd5' },
  'контент': { color: '#7e22ce', bg: '#f3e8ff' },
  'перевод': { color: '#0f766e', bg: '#ccfbf1' },
  'дизайн': { color: '#be185d', bg: '#fce7f3' },
  'фронтенд': { color: '#1d4ed8', bg: '#dbeafe' },
  'бэкенд': { color: '#4338ca', bg: '#e0e7ff' },
  'фича': { color: '#15803d', bg: '#dcfce7' },
  'рефактор': { color: '#9a3412', bg: '#fed7aa' },
  'тесты': { color: '#3f6212', bg: '#ecfccb' },
  'документация': { color: '#0369a1', bg: '#e0f2fe' },
  'маркетинг': { color: '#a21caf', bg: '#fae8ff' },
  'платежи': { color: '#854d0e', bg: '#fef9c3' },
  'релиз': { color: '#475569', bg: '#e2e8f0' },
  'перф': { color: '#0e7490', bg: '#cffafe' },
  'безопасность': { color: '#92400e', bg: '#fde68a' },
  'идея': { color: '#57534e', bg: '#f5f5f4' },
}
const LABEL_OPTIONS = Object.keys(LABEL_PALETTE)
const labelStyle = (name: string) => LABEL_PALETTE[name] ?? { color: '#475569', bg: '#e2e8f0' }

const ACTIONS: Record<CrmActivity['action'], { label: string; color: string; bg: string }> = {
  create: { label: 'создал', color: '#15803d', bg: '#dcfce7' },
  move: { label: 'переместил', color: '#1d4ed8', bg: '#dbeafe' },
  edit: { label: 'изменил', color: '#b45309', bg: '#fef3c7' },
  delete: { label: 'удалил', color: '#b91c1c', bg: '#fee2e2' },
}

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#c026d3']
const DEFAULT_COL = 286
const LOG_MIN = 240
const LOG_MAX = 560
const COL_MIN = 220
const COL_MAX = 460

/* ----------------------------- helpers ----------------------------- */

const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function colorFromString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function dueMeta(
  iso: string | null,
): { kind: '' | 'soon' | 'today' | 'over'; text: string; dateLabel: string } | null {
  if (!iso) return null
  const due = new Date(iso + 'T00:00:00')
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((due.getTime() - todayMidnight.getTime()) / 86_400_000)
  const dateLabel = due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  if (diffDays < 0) return { kind: 'over', text: `Просрочено на ${-diffDays} дн.`, dateLabel }
  if (diffDays === 0) return { kind: 'today', text: 'Сегодня', dateLabel }
  if (diffDays === 1) return { kind: 'soon', text: 'Завтра', dateLabel }
  if (diffDays === 2) return { kind: 'soon', text: 'Через 2 дн.', dateLabel }
  return { kind: '', text: `Через ${diffDays} дн.`, dateLabel }
}

const bySort = (a: CrmTask, b: CrmTask) => a.sort_order - b.sort_order || a.id - b.id

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const n = new Date()
  const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = (strip(n) - strip(d)) / 86_400_000
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

function readNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key)
    return v == null ? def : Number(JSON.parse(v)) || def
  } catch {
    return def
  }
}
function readObj(key: string): Record<string, number> {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : {}
  } catch {
    return {}
  }
}

/** Пересобирает массив задач после drag-n-drop: меняет статус и sort_order. */
function computeReorder(
  all: CrmTask[],
  taskId: number,
  newStatus: CrmStatus,
  newIndex: number,
): CrmTask[] {
  const moved = all.find((t) => t.id === taskId)
  if (!moved) return all
  const oldStatus = moved.status

  const target = all.filter((t) => t.status === newStatus && t.id !== taskId).sort(bySort)
  const insertAt = Math.max(0, Math.min(newIndex, target.length))
  target.splice(insertAt, 0, moved)
  const targetIdx = new Map<number, number>()
  target.forEach((t, i) => targetIdx.set(t.id, i))

  const sourceIdx = new Map<number, number>()
  if (oldStatus !== newStatus) {
    const source = all.filter((t) => t.status === oldStatus && t.id !== taskId).sort(bySort)
    source.forEach((t, i) => sourceIdx.set(t.id, i))
  }

  return all.map((t) => {
    if (t.id === taskId) return { ...t, status: newStatus, sort_order: targetIdx.get(t.id) ?? 0 }
    if (t.status === newStatus && targetIdx.has(t.id)) return { ...t, sort_order: targetIdx.get(t.id)! }
    if (oldStatus !== newStatus && t.status === oldStatus && sourceIdx.has(t.id))
      return { ...t, sort_order: sourceIdx.get(t.id)! }
    return t
  })
}

/* ----------------------------- form state ----------------------------- */

interface FormState {
  id: number | null
  title: string
  description: string
  status: CrmStatus
  assignee_admin_id: string
  priority: CrmPriority
  due_date: string
  labels: string[]
}
const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  description: '',
  status: 'todo',
  assignee_admin_id: '',
  priority: 'mid',
  due_date: '',
  labels: [],
}

/* ============================== component ============================== */

export const CrmBoard: React.FC = () => {
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [activity, setActivity] = useState<CrmActivity[]>([])
  const [members, setMembers] = useState<CrmMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [titleError, setTitleError] = useState(false)
  const [saving, setSaving] = useState(false)

  const [logWidth, setLogWidth] = useState<number>(() => readNum('crm.logWidth', 312))
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => readObj('crm.colWidths'))
  const bodyRef = useRef<HTMLDivElement>(null)

  /* ---------- data ---------- */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, a, m] = await Promise.all([
        crmService.listTasks(),
        crmService.listActivity(),
        crmService.listMembers(),
      ])
      setTasks(t)
      setActivity(a)
      setMembers(m)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Не удалось загрузить доску')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refreshSecondary = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([crmService.listActivity(), crmService.listMembers()])
      setActivity(a)
      setMembers(m)
    } catch {
      /* тихо: доска уже обновлена оптимистично */
    }
  }, [])

  /* ---------- resize (persisted to localStorage) ---------- */
  const startLogResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const left = bodyRef.current?.getBoundingClientRect().left ?? 0
    const onMove = (ev: MouseEvent) =>
      setLogWidth(Math.max(LOG_MIN, Math.min(LOG_MAX, ev.clientX - left)))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setLogWidth((w) => {
        localStorage.setItem('crm.logWidth', JSON.stringify(Math.round(w)))
        return w
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const startColResize = (e: React.MouseEvent, status: CrmStatus) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[status] ?? DEFAULT_COL
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(COL_MIN, Math.min(COL_MAX, startW + (ev.clientX - startX)))
      setColWidths((prev) => ({ ...prev, [status]: w }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setColWidths((prev) => {
        localStorage.setItem('crm.colWidths', JSON.stringify(prev))
        return prev
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  /* ---------- drag & drop ---------- */
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const taskId = Number(draggableId)
    const newStatus = destination.droppableId as CrmStatus
    setTasks((prev) => computeReorder(prev, taskId, newStatus, destination.index))

    crmService
      .moveTask(taskId, newStatus, destination.index)
      .then(() => refreshSecondary())
      .catch((err: any) => {
        toast.error(err?.response?.data?.detail || 'Не удалось переместить задачу')
        load()
      })
  }

  /* ---------- modal ---------- */
  const openCreate = (status: CrmStatus = 'todo') => {
    setForm({ ...EMPTY_FORM, status })
    setTitleError(false)
    setModalOpen(true)
  }
  const openEdit = (t: CrmTask) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      assignee_admin_id: t.assignee_admin_id ?? '',
      priority: t.priority,
      due_date: t.due_date ?? '',
      labels: [...t.labels],
    })
    setTitleError(false)
    setModalOpen(true)
  }

  const toggleLabel = (name: string) =>
    setForm((f) => ({
      ...f,
      labels: f.labels.includes(name) ? f.labels.filter((x) => x !== name) : [...f.labels, name],
    }))

  const save = async () => {
    if (!form.title.trim()) {
      setTitleError(true)
      return
    }
    const member = members.find((m) => m.id === form.assignee_admin_id)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assignee_admin_id: form.assignee_admin_id || null,
      assignee_display: member ? member.display : null,
      due_date: form.due_date || null,
      labels: form.labels,
    }
    setSaving(true)
    try {
      if (form.id) {
        await crmService.updateTask(form.id, payload)
        toast.success('Задача обновлена')
      } else {
        await crmService.createTask(payload)
        toast.success('Задача создана')
      }
      setModalOpen(false)
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Не удалось сохранить задачу')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: CrmTask) => {
    if (!window.confirm(`Удалить задачу «${t.title}»?`)) return
    try {
      await crmService.deleteTask(t.id)
      toast.success('Задача удалена')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Не удалось удалить задачу')
    }
  }

  /* ---------- derived ---------- */
  const byStatus = useMemo(() => {
    const map: Record<CrmStatus, CrmTask[]> = { todo: [], prog: [], hold: [], done: [] }
    for (const t of tasks) map[t.status]?.push(t)
    for (const k of Object.keys(map) as CrmStatus[]) map[k].sort(bySort)
    return map
  }, [tasks])

  const doneCount = byStatus.done.length

  /* ---------- render states ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 9rem)' }}>
        <LoadingSpinner message="Загрузка доски…" />
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ height: 'calc(100vh - 9rem)' }} className="flex items-center justify-center">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* header */}
      <div className="flex items-center gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM · Доска задач</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length ? `${tasks.length} задач · ${doneCount} выполнено` : 'Нет задач'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={load}>
            Обновить
          </Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
            Новая задача
          </Button>
        </div>
      </div>

      {/* body: activity | gutter | board */}
      <div ref={bodyRef} className="flex flex-1 min-h-0 rounded-xl border border-gray-200 overflow-hidden bg-white">
        {/* activity log */}
        <aside className="flex flex-col min-h-0 shrink-0" style={{ width: logWidth }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <History className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">История изменений</h2>
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {activity.length}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <ActivityFeed items={activity} />
          </div>
        </aside>

        {/* gutter */}
        <div
          onMouseDown={startLogResize}
          className="relative w-[7px] shrink-0 cursor-col-resize group"
          title="Потяните, чтобы изменить ширину архива"
        >
          <span className="absolute inset-y-0 left-[3px] w-px bg-gray-200 group-hover:bg-primary-500 group-hover:w-0.5" />
        </div>

        {/* board */}
        <div className="flex-1 min-w-0 overflow-x-auto bg-gray-50 p-3">
          {tasks.length === 0 ? (
            <BoardEmpty onCreate={() => openCreate()} />
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-3 h-full items-start">
                {STATUSES.map((s) => {
                  const items = byStatus[s.key]
                  const width = colWidths[s.key] ?? DEFAULT_COL
                  return (
                    <div
                      key={s.key}
                      className="relative flex flex-col rounded-xl border border-gray-200 bg-gray-100/70 shrink-0 max-h-full"
                      style={{ width }}
                    >
                      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-sm font-semibold text-gray-800">{s.label}</span>
                        <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                          {items.length}
                        </span>
                        <button
                          onClick={() => openCreate(s.key)}
                          title={`Добавить в «${s.label}»`}
                          className="ml-auto grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:text-primary-600 hover:bg-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <Droppable droppableId={s.key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 min-h-[70px] overflow-y-auto px-2.5 pb-3 space-y-2 rounded-lg transition-colors ${
                              snapshot.isDraggingOver ? 'bg-primary-50/60' : ''
                            }`}
                          >
                            {items.length === 0 && !snapshot.isDraggingOver && (
                              <div className="border border-dashed border-gray-300 rounded-lg py-4 px-3 text-center text-xs text-gray-400 leading-relaxed">
                                Перетащите задачу сюда
                                <br />
                                или нажмите +
                              </div>
                            )}
                            {items.map((t, index) => (
                              <Draggable key={t.id} draggableId={String(t.id)} index={index}>
                                {(dp, snap) => (
                                  <div
                                    ref={dp.innerRef}
                                    {...dp.draggableProps}
                                    {...dp.dragHandleProps}
                                    style={dp.draggableProps.style}
                                    onClick={() => openEdit(t)}
                                  >
                                    <TaskCard task={t} dragging={snap.isDragging} onDelete={remove} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* column resizer */}
                      <div
                        onMouseDown={(e) => startColResize(e, s.key)}
                        className="absolute top-0 -right-1.5 h-full w-3 cursor-col-resize group z-10"
                        title="Потяните, чтобы изменить ширину колонки"
                      >
                        <span className="absolute inset-y-2 left-1.5 w-0.5 rounded bg-transparent group-hover:bg-primary-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Редактировать задачу' : 'Новая задача'}
        maxWidth="lg"
        scrollable
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              maxLength={200}
              onChange={(e) => {
                setForm((f) => ({ ...f, title: e.target.value }))
                if (titleError) setTitleError(false)
              }}
              placeholder="Например: Перевести вопросы по химии на KK"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100 ${
                titleError ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-primary-500'
              }`}
            />
            {titleError && <p className="text-xs text-red-600 mt-1">Введите заголовок задачи</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              maxLength={4000}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Детали, ссылки, критерии готовности…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 min-h-[70px] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CrmStatus }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ответственный</label>
              <select
                value={form.assignee_admin_id}
                onChange={(e) => setForm((f) => ({ ...f, assignee_admin_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                <option value="">Не назначен</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Приоритет</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as CrmPriority }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                <option value="low">Низкий</option>
                <option value="mid">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Срок выполнения</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Метки</label>
            <div className="flex flex-wrap gap-2">
              {LABEL_OPTIONS.map((name) => {
                const st = labelStyle(name)
                const on = form.labels.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleLabel(name)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border transition-opacity"
                    style={{
                      color: st.color,
                      background: st.bg,
                      borderColor: on ? st.color : 'transparent',
                      opacity: on ? 1 : 0.5,
                    }}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5 mt-4 border-t border-gray-100">
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
            Отмена
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Сохранить
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/* ----------------------------- sub-components ----------------------------- */

const TaskCard: React.FC<{ task: CrmTask; dragging: boolean; onDelete: (t: CrmTask) => void }> = ({
  task,
  dragging,
  onDelete,
}) => {
  const p = PRIORITY[task.priority]
  const dm = dueMeta(task.due_date)
  return (
    <div
      className={`group relative bg-white rounded-xl border px-3 py-2.5 cursor-grab active:cursor-grabbing ${
        dragging ? 'border-primary-300 shadow-lg' : 'border-gray-200 shadow-sm hover:border-gray-300'
      }`}
    >
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(task)
        }}
        title="Удалить"
        className="absolute top-2 right-2 hidden group-hover:grid h-6 w-6 place-items-center rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 pr-6">
          {task.labels.map((name) => {
            const st = labelStyle(name)
            return (
              <span
                key={name}
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded"
                style={{ color: st.color, background: st.bg }}
              >
                {name}
              </span>
            )
          })}
        </div>
      )}

      <p
        className={`text-sm font-medium leading-snug pr-4 ${
          task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
        }`}
        style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {task.title}
      </p>
      {task.description && (
        <p
          className="text-xs text-gray-500 leading-snug mt-1"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2.5">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ color: p.color, background: p.bg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          {p.label}
        </span>
        {dm && (
          <span
            title={dm.dateLabel}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
              dm.kind === 'over'
                ? 'text-red-700 bg-red-100'
                : dm.kind === 'today'
                  ? 'text-amber-700 bg-amber-100'
                  : dm.kind === 'soon'
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-600 bg-gray-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            {dm.text}
          </span>
        )}
        <span className="ml-auto">
          {task.assignee_display ? (
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: colorFromString(task.assignee_admin_id || task.assignee_display) }}
              title={task.assignee_display}
            >
              {initials(task.assignee_display)}
            </span>
          ) : (
            <span
              className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-gray-300 text-gray-400 text-xs"
              title="Не назначен"
            >
              ?
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

const ActivityFeed: React.FC<{ items: CrmActivity[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="py-10 px-4 text-center text-sm text-gray-400 leading-relaxed">
        История пуста.
        <br />
        Действия появятся здесь по мере работы с доской.
      </div>
    )
  }
  const sorted = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  let lastDay = ''
  const rows: React.ReactNode[] = []
  for (const e of sorted) {
    const dl = dayLabel(e.created_at)
    if (dl !== lastDay) {
      lastDay = dl
      rows.push(
        <div key={`day-${e.id}`} className="flex items-center gap-2.5 mt-3.5 mb-2 first:mt-1 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{dl}</span>
          <span className="flex-1 h-px bg-gray-100" />
        </div>,
      )
    }
    rows.push(<ActivityRow key={e.id} e={e} />)
  }
  return <>{rows}</>
}

const ActivityRow: React.FC<{ e: CrmActivity }> = ({ e }) => {
  const badge = ACTIONS[e.action]
  const color = colorFromString(e.admin_id || e.admin_display)
  return (
    <div className="flex gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50">
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: color }}
      >
        {initials(e.admin_display)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12.5px] font-bold text-gray-800">{e.admin_display}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
        </div>
        <div className="text-[12.5px] text-gray-600 mt-0.5 leading-snug">
          <ActivityText e={e} />
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">{timeLabel(e.created_at)}</div>
      </div>
    </div>
  )
}

const StatusPill: React.FC<{ status: CrmStatus }> = ({ status }) => (
  <span
    className="inline-block text-[10.5px] font-bold px-1.5 py-0.5 rounded text-white align-middle"
    style={{ background: statusColor(status) }}
  >
    {statusLabel(status)}
  </span>
)

const ActivityText: React.FC<{ e: CrmActivity }> = ({ e }) => {
  const title = <b className="text-gray-800 font-semibold">«{e.task_title}»</b>
  if (e.action === 'create') return <>создал задачу {title}</>
  if (e.action === 'delete') return <>удалил задачу {title}</>
  if (e.action === 'move') {
    const from = e.details?.from as CrmStatus | undefined
    const to = e.details?.to as CrmStatus | undefined
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        переместил {title}:
        {from && <StatusPill status={from} />}
        <span className="text-gray-400 font-bold">→</span>
        {to && <StatusPill status={to} />}
      </span>
    )
  }
  return <>изменил {title}</>
}

const BoardEmpty: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="h-full min-h-[50vh] grid place-items-center text-center text-gray-400">
    <div>
      <div className="text-4xl mb-3">🗂️</div>
      <h3 className="text-gray-800 text-base font-semibold mb-1.5">Пока нет ни одной задачи</h3>
      <p className="mb-4 max-w-xs mx-auto text-sm">
        Создайте первую задачу — она появится в колонке «Не начато».
      </p>
      <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
        Создать задачу
      </Button>
    </div>
  </div>
)

export default CrmBoard

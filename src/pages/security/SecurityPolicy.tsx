import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListContainer } from '@/components/lists/ListContainer'
import { Shield, AlertTriangle, CheckCircle, Info, Pencil, Save, X } from 'lucide-react'

// ── Data model ────────────────────────────────────────────────────────────────
interface PolicyRule   { bold: string; text: string }
interface ActionRow    { action: string; condition: string; reversible: boolean }
interface DetectorRow  { name: string; event_type: string; weight: number }
interface RiskRow      { range: string; status: string; action: string }

interface PolicyData {
  rules: PolicyRule[]
  actions: ActionRow[]
  detectors: DetectorRow[]
  riskLevels: RiskRow[]
}

const STORAGE_KEY = 'security_policy_v2'

const DEFAULTS: PolicyData = {
  rules: [
    { bold: 'Автоматическая блокировка', text: '— только при risk_score ≥ 90 И подтверждении хотя бы одним детектором.' },
    { bold: 'Никогда не блокировать автоматически', text: 'при единственном событии — нужно минимум 2 разных детектора.' },
    { bold: 'Все действия администратора логируются', text: 'в fraud_events с event_type="admin_action".' },
    { bold: 'False positive', text: '— при снятии флага обязательно убедиться что Risk Score сброшен (кнопка «Сбросить Risk Score»).' },
    { bold: 'Watchlist', text: '— не блокирует пользователя, только увеличивает мониторинг. Минимальный risk_score для добавления: 30.' },
  ],
  actions: [
    { action: 'Watchlist (наблюдение)',          condition: 'risk_score > 30',           reversible: true },
    { action: 'Заморозить очки лидерборда',       condition: 'risk_score > 50',           reversible: true },
    { action: 'Отключить реферальные бонусы',     condition: 'risk_score > 50',           reversible: true },
    { action: 'Сбросить Risk Score',              condition: 'risk_score > 60',           reversible: true },
    { action: 'Ограничить (24ч – 7д)',            condition: 'risk_score > 70',           reversible: true },
    { action: 'Заблокировать (постоянно)',         condition: 'risk_score > 90 + 2 детектора', reversible: false },
    { action: 'Снять ограничение / разблокировать', condition: 'Только после ревью',     reversible: true },
    { action: 'Отметить как ложное срабатывание', condition: 'Любой',                    reversible: true },
  ],
  detectors: [
    { name: 'Повторная отправка попытки',           event_type: 'repeated_attempt',   weight: 75 },
    { name: 'Слишком быстрый экзамен (<5с/вопрос)', event_type: 'rapid_points_farm',  weight: 85 },
    { name: 'Скорость ответов <2с каждый',          event_type: 'bot_speed_answers',  weight: 90 },
    { name: 'Шаблонные ответы (≥80% одна позиция)', event_type: 'pattern_answers',    weight: 60 },
    { name: 'Подозрительный вход (новый город)',     event_type: 'suspicious_login',   weight: 30 },
    { name: 'Брутфорс (Keycloak)',                  event_type: 'brute_force',         weight: 80 },
  ],
  riskLevels: [
    { range: '0–30',   status: 'normal',               action: 'Ничего не предпринимать' },
    { range: '31–60',  status: 'Кандидат в Watchlist',  action: 'Добавить в Watchlist, мониторинг' },
    { range: '61–80',  status: 'restricted',            action: 'Заморозить очки + ограничить доступ' },
    { range: '81–100', status: 'blocked',               action: 'Постоянная блокировка (только после ревью)' },
  ],
}

function loadData(): PolicyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    if (parsed.rules && parsed.actions && parsed.detectors && parsed.riskLevels) return parsed
  } catch {}
  return DEFAULTS
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const weightColor = (w: number) =>
  w >= 85 ? 'font-bold text-red-700' : w >= 70 ? 'font-bold text-red-600' : w >= 50 ? 'font-bold text-orange-600' : 'font-bold text-yellow-600'

const riskBadgeClass = (idx: number) => {
  const colors = [
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-orange-100 text-orange-800',
    'bg-red-100 text-red-800',
  ]
  return colors[idx] ?? 'bg-gray-100 text-gray-800'
}

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5">
    <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      {icon}{title}
    </h2>
    {children}
  </div>
)

const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400'
const tdEdit   = 'px-3 py-1.5 align-top'

// ── Component ─────────────────────────────────────────────────────────────────
export const SecurityPolicy: React.FC = () => {
  const navigate  = useNavigate()
  const location  = useLocation()

  const [data,    setData]    = useState<PolicyData>(loadData)
  const [draft,   setDraft]   = useState<PolicyData>(data)
  const [editMode, setEditMode] = useState(false)

  const tabs = [
    { label: 'События',      path: '/security' },
    { label: 'Пользователи', path: '/security/users-list' },
    { label: 'Политики',     path: '/security/policy' },
  ]

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(data))); setEditMode(true) }
  const cancelEdit = () => setEditMode(false)
  const saveEdit = () => {
    setData(draft)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    setEditMode(false)
  }

  // Draft helpers
  const setRule = (i: number, field: keyof PolicyRule, val: string) =>
    setDraft(d => { const r = [...d.rules]; r[i] = { ...r[i], [field]: val }; return { ...d, rules: r } })

  const setAction = (i: number, field: keyof ActionRow, val: string | boolean) =>
    setDraft(d => { const a = [...d.actions]; a[i] = { ...a[i], [field]: val }; return { ...d, actions: a } })

  const setDetector = (i: number, field: keyof DetectorRow, val: string | number) =>
    setDraft(d => { const det = [...d.detectors]; det[i] = { ...det[i], [field]: val }; return { ...d, detectors: det } })

  const setRiskLevel = (i: number, field: keyof RiskRow, val: string) =>
    setDraft(d => { const rl = [...d.riskLevels]; rl[i] = { ...rl[i], [field]: val }; return { ...d, riskLevels: rl } })

  const display = editMode ? draft : data

  return (
    <ListContainer>
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 -mt-1 mb-4">
        {tabs.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === tab.path ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Edit controls */}
      <div className="flex justify-end mb-3 gap-2">
        {editMode ? (
          <>
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600">
              <X className="h-3.5 w-3.5" /> Отмена
            </button>
            <button onClick={saveEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Save className="h-3.5 w-3.5" /> Сохранить
            </button>
          </>
        ) : (
          <button onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600">
            <Pencil className="h-3.5 w-3.5" /> Редактировать
          </button>
        )}
      </div>

      {/* 1. Admin rules */}
      <Section title="Правила для администраторов" icon={<Shield className="h-4 w-4 text-gray-400" />}>
        {editMode ? (
          <div className="space-y-3">
            {display.rules.map((rule, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-1.5 text-xs text-gray-400 select-none w-4">{i + 1}.</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Жирная часть</label>
                    <input value={rule.bold} onChange={e => setRule(i, 'bold', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Продолжение</label>
                    <input value={rule.text} onChange={e => setRule(i, 'text', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            {display.rules.map((rule, i) => (
              <li key={i}><strong>{rule.bold}</strong> {rule.text}</li>
            ))}
          </ol>
        )}
      </Section>

      {/* 2. Allowed actions */}
      <Section title="Разрешённые административные действия" icon={<CheckCircle className="h-4 w-4 text-gray-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Действие</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Условие применения</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Обратимо</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {display.actions.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {editMode ? (
                    <>
                      <td className={tdEdit}><input value={row.action} onChange={e => setAction(i, 'action', e.target.value)} className={inputCls} /></td>
                      <td className={tdEdit}><input value={row.condition} onChange={e => setAction(i, 'condition', e.target.value)} className={inputCls} /></td>
                      <td className={tdEdit}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={row.reversible} onChange={e => setAction(i, 'reversible', e.target.checked)} className="rounded border-gray-300" />
                          <span className="text-xs text-gray-600">{row.reversible ? 'Да' : 'Нет'}</span>
                        </label>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{row.action}</td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{row.condition}</td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">
                        {row.reversible
                          ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="h-3.5 w-3.5" /> Да</span>
                          : <span className="text-red-600 font-medium">Нет</span>}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 3. Detectors */}
      <Section title="Детекторы и веса Risk Score" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Детектор</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">event_type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Вес (+risk_score)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {display.detectors.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {editMode ? (
                    <>
                      <td className={tdEdit}><input value={row.name} onChange={e => setDetector(i, 'name', e.target.value)} className={inputCls} /></td>
                      <td className={tdEdit}><input value={row.event_type} onChange={e => setDetector(i, 'event_type', e.target.value)} className={`${inputCls} font-mono`} /></td>
                      <td className={tdEdit}><input type="number" min={0} max={100} value={row.weight} onChange={e => setDetector(i, 'weight', Number(e.target.value))} className={`${inputCls} w-20`} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{row.name}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs font-mono">{row.event_type}</td>
                      <td className="px-3 py-2.5 text-xs"><span className={weightColor(row.weight)}>+{row.weight}</span></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 4. Risk levels */}
      <Section title="Уровни Risk Score" icon={<Info className="h-4 w-4 text-blue-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Статус</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Рекомендуемые действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {display.riskLevels.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {editMode ? (
                    <>
                      <td className={tdEdit}><input value={row.range} onChange={e => setRiskLevel(i, 'range', e.target.value)} className={`${inputCls} w-24`} /></td>
                      <td className={tdEdit}><input value={row.status} onChange={e => setRiskLevel(i, 'status', e.target.value)} className={inputCls} /></td>
                      <td className={tdEdit}><input value={row.action} onChange={e => setRiskLevel(i, 'action', e.target.value)} className={inputCls} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskBadgeClass(i)}`}>{row.range}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{row.status}</td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{row.action}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 5. Technical debt (static) */}
      <Section title="Технический долг (известные ограничения)" icon={<AlertTriangle className="h-4 w-4 text-gray-400" />}>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">!</span>
            <div><strong>TD-001 — device_id не передаётся глобально.</strong> Добавить <code className="bg-gray-100 px-1 rounded">X-Device-ID</code> header в Flutter Dio interceptor → принимать в backend middleware.</div>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs flex items-center justify-center font-bold">!</span>
            <div><strong>TD-007 — Мультиаккаунты по IP/device_id.</strong> Нет детекта нескольких аккаунтов с одного IP или device_id.</div>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs flex items-center justify-center font-bold">!</span>
            <div><strong>TD-008 — PRO без валидного payment webhook.</strong> Нет проверки что PRO статус был выдан только через валидный webhook от Apple/Google.</div>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">✓</span>
            <div><strong>TD-002 — Keycloak Brute Force Protection.</strong> Включён. Настройки: 5 попыток, +30с, макс 15мин, сброс 12ч. Статус виден в карточке пользователя.</div>
          </div>
        </div>
      </Section>

      <p className="text-xs text-gray-400 text-right">Последнее обновление: 2026-06-28 · Источник: docs/SECURITY.md</p>
    </ListContainer>
  )
}

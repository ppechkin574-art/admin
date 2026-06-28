import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ListContainer } from '@/components/lists/ListContainer'
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5">
    <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </div>
)

const Table: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          {headers.map((h, i) => (
            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row, ri) => (
          <tr key={ri} className="hover:bg-gray-50">
            {row.map((cell, ci) => (
              <td key={ci} className="px-3 py-2.5 text-gray-700 text-xs">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const reversible = (yes: boolean) =>
  yes
    ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="h-3.5 w-3.5" /> Да</span>
    : <span className="text-red-600 font-medium">Нет</span>

export const SecurityPolicy: React.FC = () => {
  const navigate = useNavigate()

  const tabs = [
    { label: 'События', path: '/security' },
    { label: 'Пользователи', path: '/security/users-list' },
    { label: 'Политики', path: '/security/policy' },
  ]

  const location = useLocation()

  return (
    <ListContainer>
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 -mt-1 mb-2">
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === tab.path
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Admin action rules */}
      <Section title="Правила для администраторов" icon={<Shield className="h-4 w-4 text-gray-400" />}>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li><strong>Автоматическая блокировка</strong> — только при <code className="bg-gray-100 px-1 rounded">risk_score ≥ 90</code> И подтверждении хотя бы одним детектором.</li>
          <li><strong>Никогда не блокировать автоматически</strong> при единственном событии — нужно минимум 2 разных детектора.</li>
          <li><strong>Все действия администратора логируются</strong> в <code className="bg-gray-100 px-1 rounded">fraud_events</code> с <code className="bg-gray-100 px-1 rounded">event_type="admin_action"</code>.</li>
          <li><strong>False positive</strong> — при снятии флага обязательно убедиться что Risk Score сброшен (кнопка «Сбросить Risk Score»).</li>
          <li><strong>Watchlist</strong> — не блокирует пользователя, только увеличивает мониторинг. Минимальный risk_score для добавления: 30.</li>
        </ol>
      </Section>

      {/* Allowed actions */}
      <Section title="Разрешённые административные действия" icon={<CheckCircle className="h-4 w-4 text-gray-400" />}>
        <Table
          headers={['Действие', 'Условие применения', 'Обратимо']}
          rows={[
            ['Watchlist (наблюдение)', 'risk_score > 30', reversible(true)],
            ['Заморозить очки лидерборда', 'risk_score > 50', reversible(true)],
            ['Отключить реферальные бонусы', 'risk_score > 50', reversible(true)],
            ['Сбросить Risk Score', 'risk_score > 60', reversible(true)],
            ['Ограничить (24ч – 7д)', 'risk_score > 70', reversible(true)],
            ['Заблокировать (постоянно)', 'risk_score > 90 + 2 детектора', reversible(false)],
            ['Снять ограничение / разблокировать', 'Только после ревью', reversible(true)],
            ['Отметить как ложное срабатывание', 'Любой', reversible(true)],
          ]}
        />
      </Section>

      {/* Detectors */}
      <Section title="Детекторы и веса Risk Score" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
        <Table
          headers={['Детектор', 'event_type', 'Вес (+risk_score)']}
          rows={[
            ['Повторная отправка попытки', 'repeated_attempt', <span className="font-bold text-red-600">+75</span>],
            ['Слишком быстрый экзамен (&lt;5с/вопрос)', 'rapid_points_farm', <span className="font-bold text-red-600">+85</span>],
            ['Скорость ответов &lt;2с каждый', 'bot_speed_answers', <span className="font-bold text-red-700">+90</span>],
            ['Шаблонные ответы (≥80% одна позиция)', 'pattern_answers', <span className="font-bold text-orange-600">+60</span>],
            ['Подозрительный вход (новый город)', 'suspicious_login', <span className="font-bold text-yellow-600">+30</span>],
            ['Брутфорс (Keycloak)', 'brute_force', <span className="font-bold text-red-600">+80</span>],
          ]}
        />
      </Section>

      {/* Risk levels */}
      <Section title="Уровни Risk Score" icon={<Info className="h-4 w-4 text-blue-400" />}>
        <Table
          headers={['Score', 'Статус', 'Рекомендуемые действия']}
          rows={[
            [
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">0–30</span>,
              'normal',
              'Ничего не предпринимать',
            ],
            [
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">31–60</span>,
              'Кандидат в Watchlist',
              'Добавить в Watchlist, мониторинг',
            ],
            [
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">61–80</span>,
              'restricted',
              'Заморозить очки + ограничить доступ',
            ],
            [
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">81–100</span>,
              'blocked',
              'Постоянная блокировка (только после ревью)',
            ],
          ]}
        />
      </Section>

      {/* Technical debt */}
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

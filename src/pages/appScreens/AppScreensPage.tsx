import React, { useRef, useState } from 'react'
import { Upload, X, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── App screen catalog ──────────────────────────────────────────────────────
// Each entry: key (unique slug for storage), name (display label)
// Screenshots are stored in localStorage (key: `ap_screenshot_${key}`) as
// base64 data URLs — no backend upload needed, pure client-side gallery.

const APP_SECTIONS = [
  {
    section: 'Авторизация',
    pages: [
      { key: 'auth_welcome',      name: 'Приветствие' },
      { key: 'auth_login',        name: 'Вход' },
      { key: 'auth_reg_role',     name: 'Регистрация — выбор роли' },
      { key: 'auth_reg_name',     name: 'Регистрация — имя' },
      { key: 'auth_reg_grade',    name: 'Регистрация — класс' },
      { key: 'auth_reg_subjects', name: 'Регистрация — предметы' },
      { key: 'auth_reg_phone',    name: 'Регистрация — телефон' },
      { key: 'auth_reg_code',     name: 'Регистрация — SMS код' },
      { key: 'auth_reg_password', name: 'Регистрация — пароль' },
      { key: 'auth_reset',        name: 'Восстановление пароля' },
    ],
  },
  {
    section: 'Главная',
    pages: [
      { key: 'home_full_ent',     name: 'Главная — Полное ЕНТ' },
      { key: 'home_by_subject',   name: 'Главная — По предмету' },
      { key: 'home_leaderboard',  name: 'Лидерборд' },
      { key: 'home_streak_modal', name: 'Стрик — ежедневный бонус' },
    ],
  },
  {
    section: 'ЕНТ по предмету',
    pages: [
      { key: 'unt_subjects',        name: 'Список предметов' },
      { key: 'unt_options',         name: 'Выбор варианта' },
      { key: 'unt_test',            name: 'Тест — вопрос' },
      { key: 'unt_subject_result',  name: 'Результаты предмета' },
      { key: 'unt_recommendations', name: 'Рекомендации' },
      { key: 'unt_question_review', name: 'Разбор вопроса' },
      { key: 'unt_hint',            name: 'Подсказка' },
    ],
  },
  {
    section: 'Полное ЕНТ',
    pages: [
      { key: 'full_unt_test',   name: 'Полный тест — вопрос' },
      { key: 'full_unt_result', name: 'Результаты' },
      { key: 'full_unt_review', name: 'Разбор' },
    ],
  },
  {
    section: 'Тренировка по темам',
    pages: [
      { key: 'train_topics',   name: 'Темы' },
      { key: 'train_question', name: 'Вопрос' },
      { key: 'train_results',  name: 'Результаты' },
      { key: 'train_review',   name: 'Разбор вопроса' },
      { key: 'train_hint',     name: 'Подсказка' },
    ],
  },
  {
    section: 'Ежедневные задания',
    pages: [
      { key: 'daily_list',            name: 'Список заданий' },
      { key: 'daily_subjects',        name: 'Выбор предмета' },
      { key: 'daily_question',        name: 'Вопрос' },
      { key: 'daily_result',          name: 'Результат задания' },
      { key: 'daily_review_result',   name: 'Итог разбора' },
      { key: 'daily_question_review', name: 'Разбор вопроса' },
      { key: 'daily_history',         name: 'История заданий' },
    ],
  },
  {
    section: 'Результаты теста',
    pages: [
      { key: 'test_results',         name: 'Результаты теста' },
      { key: 'test_recommendations', name: 'Рекомендации' },
    ],
  },
  {
    section: 'Статистика',
    pages: [
      { key: 'stats_main', name: 'Статистика' },
      { key: 'stats_time', name: 'Управление временем' },
    ],
  },
  {
    section: 'Профиль',
    pages: [
      { key: 'profile_main',         name: 'Профиль' },
      { key: 'profile_subscription', name: 'Подписка' },
      { key: 'profile_cancel_sub',   name: 'Отмена подписки' },
      { key: 'profile_balance',      name: 'Баланс' },
      { key: 'profile_balance_fill', name: 'Пополнение баланса' },
      { key: 'profile_guide',        name: 'Гайд по балансу' },
      { key: 'profile_about',        name: 'О приложении' },
      { key: 'profile_docs',         name: 'Документы' },
      { key: 'profile_qr',           name: 'QR-код' },
    ],
  },
  {
    section: 'Промокод / Подписка',
    pages: [
      { key: 'promo_types',   name: 'Типы подписок' },
      { key: 'promo_payment', name: 'Оплата (WebView)' },
      { key: 'promo_success', name: 'Успешная активация' },
    ],
  },
]

const STORAGE_PREFIX = 'ap_screenshot_'

function loadScreenshots(): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORAGE_PREFIX)) {
      result[k.slice(STORAGE_PREFIX.length)] = localStorage.getItem(k) || ''
    }
  }
  return result
}

function saveScreenshot(key: string, dataUrl: string) {
  localStorage.setItem(STORAGE_PREFIX + key, dataUrl)
}

function deleteScreenshot(key: string) {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

// ─── Single card ─────────────────────────────────────────────────────────────
interface CardProps {
  pageKey: string
  name: string
  url: string
  onUploaded: (key: string, url: string) => void
  onDeleted: (key: string) => void
}

const ScreenCard: React.FC<CardProps> = ({ pageKey, name, url, onUploaded, onDeleted }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Только изображения'); return }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      saveScreenshot(pageKey, dataUrl)
      onUploaded(pageKey, dataUrl)
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{
      background: 'var(--card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 14,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{name}</div>

      {/* Preview */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !url && inputRef.current?.click()}
        style={{
          background: url ? 'transparent' : '#f3f4f6',
          borderRadius: 8,
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: url ? 'default' : 'pointer',
          border: url ? 'none' : '2px dashed #d1d5db',
        }}
      >
        {url ? (
          <img src={url} alt={name} style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'top', borderRadius: 8 }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 12 }}>
            <Smartphone size={24} style={{ marginBottom: 6, opacity: 0.4 }} />
            <div>Перетащите или нажмите</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{
            flex: 1, fontSize: 12, padding: '5px 10px',
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 7, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <Upload size={13} /> {loading ? 'Загрузка...' : 'Загрузить'}
        </button>
        {url && (
          <button
            onClick={() => { deleteScreenshot(pageKey); onDeleted(pageKey) }}
            style={{
              fontSize: 12, padding: '5px 10px',
              background: 'transparent', color: '#ef4444',
              border: '1px solid #ef4444', borderRadius: 7, cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const AppScreensPage: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Record<string, string>>(loadScreenshots)

  const handleUploaded = (key: string, url: string) => {
    setScreenshots(prev => ({ ...prev, [key]: url }))
    toast.success('Скриншот сохранён')
  }

  const handleDeleted = (key: string) => {
    setScreenshots(prev => { const n = { ...prev }; delete n[key]; return n })
    toast.success('Скриншот удалён')
  }

  const totalScreens = APP_SECTIONS.reduce((s, g) => s + g.pages.length, 0)
  const uploaded = Object.values(screenshots).filter(Boolean).length

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Страницы приложения</h1>
        <p style={{ color: '#6b7280', margin: '6px 0 0', fontSize: 14 }}>
          Каталог всех экранов Flutter-приложения. {uploaded} / {totalScreens} скриншотов загружено.
          Скриншоты хранятся в браузере.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ background: '#6366f1', height: '100%', width: `${(uploaded / totalScreens) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Sections */}
      {APP_SECTIONS.map(group => (
        <div key={group.section} style={{ marginBottom: 36 }}>
          <h2 style={{
            fontSize: 14, fontWeight: 800, margin: '0 0 14px',
            color: '#6366f1', borderBottom: '2px solid #6366f1',
            paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {group.section}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 14,
          }}>
            {group.pages.map(p => (
              <ScreenCard
                key={p.key}
                pageKey={p.key}
                name={p.name}
                url={screenshots[p.key] || ''}
                onUploaded={handleUploaded}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

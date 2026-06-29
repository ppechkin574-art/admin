import React, { useState, useCallback } from 'react'
import { Bot, Upload, Trash2, Palette, Eye, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type PositionKey = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'

interface PositionConfig {
  key: PositionKey
  labelRu: string
  flipX: boolean
  corner: { v: 'top' | 'bottom'; h: 'left' | 'right' }
}

const POSITIONS: PositionConfig[] = [
  { key: 'top_left',     labelRu: 'Сверху-слева',   flipX: false, corner: { v: 'top',    h: 'left'  } },
  { key: 'top_right',    labelRu: 'Сверху-справа',  flipX: true,  corner: { v: 'top',    h: 'right' } },
  { key: 'bottom_left',  labelRu: 'Снизу-слева',    flipX: false, corner: { v: 'bottom', h: 'left'  } },
  { key: 'bottom_right', labelRu: 'Снизу-справа',   flipX: true,  corner: { v: 'bottom', h: 'right' } },
]

interface BubbleStyle {
  bgColor: string
  textColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  fontSize: number
  shadow: boolean
}

// ─── Defaults & storage ───────────────────────────────────────────────────────

const DEFAULT_STYLE: BubbleStyle = {
  bgColor: '#FFFEF0',
  textColor: '#1A1A2E',
  borderColor: '#D4A44D',
  borderWidth: 2,
  borderRadius: 16,
  fontSize: 12,
  shadow: true,
}

const DEFAULT_TEXTS: Record<PositionKey, string> = {
  top_left:     'Привет! Я помогу тебе подготовиться к ЕНТ 👋',
  top_right:    'Отличный прогресс! Продолжай в том же духе 🎯',
  bottom_left:  'Решай хотя бы 5 вопросов в день! 💪',
  bottom_right: 'Ты на пути к высокому баллу! ⭐',
}

const DEFAULT_IMAGES: Record<PositionKey, string | null> = {
  top_left: null, top_right: null, bottom_left: null, bottom_right: null,
}

const LS = { images: 'mascot_images_v1', texts: 'mascot_texts_v1', style: 'mascot_style_v1' }

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...fallback, ...JSON.parse(raw) } as T
  } catch {}
  return fallback
}

function saveLS(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── SpeechBubble ─────────────────────────────────────────────────────────────

const SpeechBubble: React.FC<{
  text: string
  style: BubbleStyle
  tailDir: 'left' | 'right'
  small?: boolean
}> = ({ text, style, tailDir, small }) => {
  const fs = small ? Math.max(9, style.fontSize - 2) : style.fontSize
  const bw = style.borderWidth

  // Triangle pointing toward the mascot (left or right side of bubble)
  const tailOuter: React.CSSProperties = tailDir === 'left' ? {
    position: 'absolute', left: -(8 + bw), top: '50%', transform: 'translateY(-50%)',
    width: 0, height: 0,
    borderTop: `${8}px solid transparent`,
    borderBottom: `${8}px solid transparent`,
    borderRight: `${8 + bw}px solid ${style.borderColor}`,
  } : {
    position: 'absolute', right: -(8 + bw), top: '50%', transform: 'translateY(-50%)',
    width: 0, height: 0,
    borderTop: `${8}px solid transparent`,
    borderBottom: `${8}px solid transparent`,
    borderLeft: `${8 + bw}px solid ${style.borderColor}`,
  }

  const tailInner: React.CSSProperties = tailDir === 'left' ? {
    position: 'absolute', left: -(7 + bw) + bw + 1, top: '50%', transform: 'translateY(-50%)',
    width: 0, height: 0, zIndex: 1,
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderRight: `${7}px solid ${style.bgColor}`,
  } : {
    position: 'absolute', right: -(7 + bw) + bw + 1, top: '50%', transform: 'translateY(-50%)',
    width: 0, height: 0, zIndex: 1,
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: `${7}px solid ${style.bgColor}`,
  }

  return (
    <div style={{ position: 'relative', maxWidth: small ? 120 : 200, flexShrink: 0 }}>
      <div style={tailOuter} />
      <div style={tailInner} />
      <div style={{
        backgroundColor: style.bgColor,
        color: style.textColor,
        border: `${bw}px solid ${style.borderColor}`,
        borderRadius: style.borderRadius,
        padding: small ? '5px 8px' : '10px 14px',
        fontSize: fs,
        lineHeight: 1.4,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: style.shadow ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        wordBreak: 'break-word',
      }}>
        {text || '…'}
      </div>
    </div>
  )
}

// ─── UploadCard ───────────────────────────────────────────────────────────────

const UploadCard: React.FC<{
  pos: PositionConfig
  image: string | null
  isDragOver: boolean
  isPreview: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (file: File) => void
  onRemove: () => void
  onPreview: () => void
}> = ({ pos, image, isDragOver, isPreview, onDragOver, onDragLeave, onDrop, onFileSelect, onRemove, onPreview }) => {
  const inputId = `mascot_input_${pos.key}`
  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${isPreview ? 'border-purple-400 shadow-md' : 'border-gray-200'}`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 ${isPreview ? 'bg-purple-50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700">{pos.labelRu}</span>
          <span className="text-[10px] text-gray-400">{pos.flipX ? '(зеркально)' : '(прямо)'}</span>
        </div>
        <button
          onClick={onPreview}
          className={`flex items-center gap-1 text-xs transition-colors ${isPreview ? 'text-purple-600 font-semibold' : 'text-gray-400 hover:text-purple-500'}`}
        >
          <Eye className="w-3 h-3" />
          {isPreview ? 'Выбрано' : 'Просмотр'}
        </button>
      </div>

      {/* Drop / preview zone */}
      <div
        className={`relative h-36 flex items-center justify-center transition-colors ${isDragOver ? 'bg-purple-50' : 'bg-white'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={pos.labelRu}
              className="max-h-full max-w-full object-contain p-2"
              style={{ transform: pos.flipX ? 'scaleX(-1)' : 'none' }}
            />
            <button
              onClick={onRemove}
              title="Удалить"
              className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-500 rounded-full p-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <label
            htmlFor={inputId}
            className={`cursor-pointer flex flex-col items-center gap-2 transition-colors ${isDragOver ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`}
          >
            <Upload className="w-7 h-7" />
            <span className="text-xs text-center whitespace-pre-line">
              {isDragOver ? 'Отпустите для загрузки' : 'Перетащите PNG\nили нажмите'}
            </span>
          </label>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) { onFileSelect(f); e.target.value = '' }
          }}
        />
      </div>
    </div>
  )
}

// ─── BubbleStyleEditor ────────────────────────────────────────────────────────

const BubbleStyleEditor: React.FC<{
  style: BubbleStyle
  onUpdate: <K extends keyof BubbleStyle>(field: K, val: BubbleStyle[K]) => void
  onReset: () => void
}> = ({ style, onUpdate, onReset }) => (
  <div className="border border-gray-200 rounded-xl p-4 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-semibold text-gray-700">Стиль пузыря</span>
      </div>
      <button onClick={onReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
        <RotateCcw className="w-3 h-3" />
        Сбросить
      </button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {([
        ['bgColor',     'Фон пузыря'],
        ['textColor',   'Текст'],
        ['borderColor', 'Рамка'],
      ] as const).map(([field, label]) => (
        <div key={field} className="space-y-1">
          <label className="text-xs text-gray-500">{label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style[field] as string}
              onChange={e => onUpdate(field, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
            />
            <span className="text-[10px] text-gray-400 font-mono">{style[field] as string}</span>
          </div>
        </div>
      ))}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Тень</label>
        <label className="flex items-center gap-2 cursor-pointer mt-1.5">
          <input
            type="checkbox"
            checked={style.shadow}
            onChange={e => onUpdate('shadow', e.target.checked)}
            className="rounded accent-purple-500"
          />
          <span className="text-xs text-gray-600">Включена</span>
        </label>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      {([
        ['borderRadius', 'Скругление', 0, 32, 'px'],
        ['borderWidth',  'Рамка',      0,  6, 'px'],
        ['fontSize',     'Шрифт',     10, 20, 'px'],
      ] as const).map(([field, label, min, max, unit]) => (
        <div key={field} className="space-y-1">
          <label className="text-xs text-gray-500">{label}: {style[field]}{unit}</label>
          <input
            type="range"
            min={min}
            max={max}
            value={style[field] as number}
            onChange={e => onUpdate(field, Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>
      ))}
    </div>
  </div>
)

// ─── PhonePreview ─────────────────────────────────────────────────────────────

const PhonePreview: React.FC<{
  config: PositionConfig
  image: string | null
  text: string
  style: BubbleStyle
}> = ({ config, image, text, style }) => {
  const isBottom = config.corner.v === 'bottom'
  const isLeft   = config.corner.h === 'left'

  const mascotRowStyle: React.CSSProperties = {
    position: 'absolute',
    [isBottom ? 'bottom' : 'top']: 10,
    [isLeft ? 'left' : 'right']: 6,
    display: 'flex',
    alignItems: 'flex-end',
    flexDirection: isLeft ? 'row' : 'row-reverse',
    gap: 6,
    maxWidth: '90%',
  }

  return (
    <div className="flex flex-col items-center">
      {/* Phone outer bezel */}
      <div style={{
        width: 240,
        height: 488,
        background: '#1C1C1E',
        borderRadius: 38,
        padding: '10px 8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 0 0 1px #3a3a3c',
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 56, height: 16, background: '#000', borderRadius: 12, zIndex: 10,
        }} />

        {/* Screen */}
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(160deg, #EEF2FF 0%, #F5F0FF 100%)',
          borderRadius: 30, position: 'relative', overflow: 'hidden',
        }}>
          {/* Status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 28,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 14px 4px', fontSize: 9, color: '#555', fontWeight: 600,
          }}>
            <span>9:41</span>
            <span style={{ letterSpacing: 1 }}>▲ ⬛ 🔋</span>
          </div>

          {/* Dummy screen content */}
          <div style={{
            position: 'absolute', top: 32, left: 14, right: 14,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ height: 18, background: 'rgba(139,92,246,0.25)', borderRadius: 8 }} />
            <div style={{ height: 10, background: 'rgba(0,0,0,0.09)', borderRadius: 4, width: '75%' }} />
            <div style={{ height: 10, background: 'rgba(0,0,0,0.07)', borderRadius: 4, width: '60%' }} />
            <div style={{ height: 48, background: 'rgba(139,92,246,0.12)', borderRadius: 12, marginTop: 4 }} />
            <div style={{ height: 48, background: 'rgba(139,92,246,0.09)', borderRadius: 12 }} />
            <div style={{ height: 48, background: 'rgba(139,92,246,0.07)', borderRadius: 12 }} />
          </div>

          {/* Mascot + bubble */}
          {(image || text) ? (
            <div style={mascotRowStyle}>
              {image && (
                <div style={{ width: 68, height: 68, flexShrink: 0 }}>
                  <img
                    src={image}
                    alt="Маскот"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', transform: config.flipX ? 'scaleX(-1)' : 'none' }}
                  />
                </div>
              )}
              {text && (
                <SpeechBubble text={text} style={style} tailDir={isLeft ? 'left' : 'right'} small />
              )}
            </div>
          ) : (
            <div style={{
              position: 'absolute', bottom: 20, left: 0, right: 0,
              textAlign: 'center', color: '#bbb', fontSize: 10,
            }}>
              Загрузите маскота
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400 text-center">
        {config.labelRu} · {config.flipX ? 'зеркально' : 'обычно'}
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const MascotPage: React.FC = () => {
  const [images, setImages] = useState<Record<PositionKey, string | null>>(
    () => loadLS(LS.images, DEFAULT_IMAGES)
  )
  const [texts, setTexts] = useState<Record<PositionKey, string>>(
    () => loadLS(LS.texts, DEFAULT_TEXTS)
  )
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>(
    () => loadLS(LS.style, DEFAULT_STYLE)
  )
  const [previewPos, setPreviewPos] = useState<PositionKey>('bottom_left')
  const [dragOver, setDragOver] = useState<PositionKey | null>(null)

  const handleFile = useCallback((key: PositionKey, file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Только изображения'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = e.target?.result as string
      setImages(prev => { const next = { ...prev, [key]: b64 }; saveLS(LS.images, next); return next })
      toast.success('Маскот загружен')
    }
    reader.readAsDataURL(file)
  }, [])

  const removeImage = useCallback((key: PositionKey) => {
    setImages(prev => { const next = { ...prev, [key]: null }; saveLS(LS.images, next); return next })
  }, [])

  const updateText = useCallback((key: PositionKey, text: string) => {
    setTexts(prev => { const next = { ...prev, [key]: text }; saveLS(LS.texts, next); return next })
  }, [])

  const updateStyle = useCallback(<K extends keyof BubbleStyle>(field: K, val: BubbleStyle[K]) => {
    setBubbleStyle(prev => { const next = { ...prev, [field]: val }; saveLS(LS.style, next); return next })
  }, [])

  const resetStyle = useCallback(() => {
    setBubbleStyle(DEFAULT_STYLE)
    saveLS(LS.style, DEFAULT_STYLE)
    toast.success('Стиль сброшен')
  }, [])

  const previewConfig = POSITIONS.find(p => p.key === previewPos)!

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Bot className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Маскот</h1>
          <p className="text-sm text-gray-500">
            PNG-маскот по позициям + обучающие пузыри в стиле Clash of Clans
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Upload grid 2×2 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Изображения по позиции</h2>
            <div className="grid grid-cols-2 gap-4">
              {POSITIONS.map(pos => (
                <UploadCard
                  key={pos.key}
                  pos={pos}
                  image={images[pos.key]}
                  isDragOver={dragOver === pos.key}
                  isPreview={previewPos === pos.key}
                  onDragOver={e => { e.preventDefault(); setDragOver(pos.key) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOver(null)
                    const f = e.dataTransfer.files[0]
                    if (f) handleFile(pos.key, f)
                  }}
                  onFileSelect={f => handleFile(pos.key, f)}
                  onRemove={() => removeImage(pos.key)}
                  onPreview={() => setPreviewPos(pos.key)}
                />
              ))}
            </div>
          </div>

          {/* Bubble texts */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Тексты пузырей</h2>
            <div className="grid grid-cols-2 gap-4">
              {POSITIONS.map(pos => (
                <div key={pos.key} className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">{pos.labelRu}</label>
                  <textarea
                    value={texts[pos.key]}
                    onChange={e => updateText(pos.key, e.target.value)}
                    rows={3}
                    placeholder="Текст пузыря..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-shadow"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Style editor */}
          <BubbleStyleEditor style={bubbleStyle} onUpdate={updateStyle} onReset={resetStyle} />
        </div>

        {/* ── Right column: preview ── */}
        <div className="space-y-3 xl:sticky xl:top-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Предпросмотр</h2>
            <div className="flex flex-wrap gap-1">
              {POSITIONS.map(pos => (
                <button
                  key={pos.key}
                  onClick={() => setPreviewPos(pos.key)}
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${
                    previewPos === pos.key
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {pos.labelRu}
                </button>
              ))}
            </div>
          </div>

          <PhonePreview
            config={previewConfig}
            image={images[previewPos]}
            text={texts[previewPos]}
            style={bubbleStyle}
          />

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Данные сохраняются в браузере.<br />
            Экспорт в приложение — следующий шаг.
          </p>
        </div>
      </div>
    </div>
  )
}

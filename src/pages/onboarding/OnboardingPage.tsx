import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
    BookOpen, ChevronDown, ChevronUp, Eye, EyeOff,
    GripVertical, ImagePlus, Languages, Layers, Plus,
    Save, Settings2, Trash2, Users, X, Zap, Clock,
    ToggleLeft, ToggleRight, Star, MonitorSmartphone, Key, RefreshCw, Clapperboard,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

// ─── StepPhonePreview ────────────────────────────────────────────────────────

// iPhone 17 Pro logical dimensions — reference coordinate system for SPOT_MAP
const IPHONE_W = 393
const IPHONE_H = 852
const IPHONE_NAV_H = 94  // nav bar height (incl. bottom safe area) in logical px
const IPHONE_SB_H  = 54  // status bar height (incl. dynamic island) in logical px

type DeviceSpec = { id: string; name: string; w: number; h: number; navH: number; sbH: number; br: number }
const DEVICES: readonly DeviceSpec[] = [
    { id: 'iphone', name: 'iPhone 17 Pro', w: 393, h: 852,  navH: 94, sbH: 54, br: 48 },
    { id: 'pixel',  name: 'Pixel 9',       w: 411, h: 915,  navH: 90, sbH: 36, br: 38 },
    { id: 'ipad',   name: 'iPad Air 11"',  w: 820, h: 1180, navH: 90, sbH: 30, br: 20 },
]

// Which spotlight keys are visible on each start screen
const SCREEN_SPOT_KEYS: Record<string, Set<string>> = {
    HOME:         new Set(['screen_top_half','screen_bottom_half','home_tab','trainer_tab','leaderboard_tab','profile_tab','home_banner','home_events','home_rating_card','home_reward_card']),
    TRAINER:      new Set(['screen_top_half','screen_bottom_half','home_tab','trainer_tab','leaderboard_tab','profile_tab','start_trainer_button']),
    LEADERBOARD:  new Set(['screen_top_half','screen_bottom_half','home_tab','trainer_tab','leaderboard_tab','profile_tab']),
    PROFILE:      new Set(['screen_top_half','screen_bottom_half','home_tab','trainer_tab','leaderboard_tab','profile_tab']),
    SUBSCRIPTION: new Set(['screen_top_half','screen_bottom_half','home_tab','trainer_tab','leaderboard_tab','profile_tab','subscription_banner','streak_widget']),
}

// SPOT_MAP in iPhone 393×852 logical px
// Positions derived from Flutter layout:
//   home_banner  — SpotlightTarget wraps full-width _BannerCarousel (x=0, w=393, h=236, r=20)
//   home_events  — Padding(horizontal:16) → SpotlightTarget wraps _EventsGrid
//   nav tabs     — Expanded(SpotlightTarget(h=48, r=8)) inside Row(padding:l12,r12)
type SpotRect = { x: number; y: number; w: number; h: number; r: number }
const SPOT_MAP: Record<string, SpotRect> = {
    screen_top_half:     { x: 0,   y: 0,                             w: IPHONE_W,      h: IPHONE_H / 2, r: 0  },
    screen_bottom_half:  { x: 0,   y: IPHONE_H / 2,                  w: IPHONE_W,      h: IPHONE_H / 2, r: 0  },
    home_tab:            { x: 12,  y: IPHONE_H - IPHONE_NAV_H + 10, w: 92,            h: 48,  r: 8  },
    trainer_tab:         { x: 104, y: IPHONE_H - IPHONE_NAV_H + 10, w: 92,            h: 48,  r: 8  },
    leaderboard_tab:     { x: 196, y: IPHONE_H - IPHONE_NAV_H + 10, w: 92,            h: 48,  r: 8  },
    profile_tab:         { x: 288, y: IPHONE_H - IPHONE_NAV_H + 10, w: 92,            h: 48,  r: 8  },
    home_banner:         { x: 0,   y: IPHONE_SB_H + 17,             w: IPHONE_W,      h: 236, r: 20 },
    home_events:         { x: 16,  y: 363,                           w: IPHONE_W - 32, h: 200, r: 16 },
    home_rating_card:    { x: 16,  y: 583,                           w: 174,           h: 155, r: 16 },
    home_reward_card:    { x: 202, y: 583,                           w: 175,           h: 155, r: 16 },
    subscription_banner: { x: 16,  y: IPHONE_SB_H + 90,             w: IPHONE_W - 32, h: 153, r: 28 },
    streak_widget:       { x: 267, y: IPHONE_SB_H + 12,             w: 110,           h: 63,  r: 20 },
    start_trainer_button:{ x: 16,  y: IPHONE_SB_H + 110,            w: IPHONE_W - 32, h: 70,  r: 20 },
}

const PREDEFINED_ROUTES = [
    { value: 'HOME', label: 'Главная' },
    { value: 'TRAINER', label: 'Тренажёр' },
    { value: 'PROFILE', label: 'Профиль' },
    { value: 'LEADERBOARD', label: 'Рейтинг' },
    { value: 'SUBSCRIPTION', label: 'Подписка' },
]
const BUILTIN_SPOT_KEYS = new Set(Object.keys(SPOT_MAP))

// Scale spot rect from iPhone coords to target device.
// Nav tabs use bottom-anchored Y; content spots use proportional Y.
function getSpotRect(key: string, device: DeviceSpec): SpotRect | null {
    const raw = SPOT_MAP[key]
    if (!raw) return null
    const sx = device.w / IPHONE_W
    const sy = device.h / IPHONE_H
    const isNavTab = key.endsWith('_tab')
    return {
        x: raw.x * sx,
        y: isNavTab ? device.h - device.navH + 10 : raw.y * sy,
        w: raw.w * sx,
        h: raw.h * sy,
        r: raw.r * sx,
    }
}

interface DevicePreviewProps {
    device: DeviceSpec
    step: OnboardingStep
    startScreen: string
    stepIndex: number
    totalSteps: number
}

const SingleDevicePreview: React.FC<DevicePreviewProps> = ({ device, step, startScreen, stepIndex, totalSteps }) => {
    const { w, h, navH, sbH, br } = device
    // f() scales a value that was designed at iPhone logical px to this device's CSS px.
    // At iPhone (w=393) f(n)=n; at iPad (w=820) f(n)≈2×n — same as what the app renders.
    const f = (n: number) => Math.round(n * w / IPHONE_W)

    const spotKeys = step.spotlight_element_keys?.length
        ? step.spotlight_element_keys
        : step.spotlight_element_key ? [step.spotlight_element_key] : []
    const adjs = step.spotlight_adjustments ?? {}
    const spotRects = spotKeys.map(k => {
        const raw = getSpotRect(k, device)
        if (!raw) return null
        const sx = device.w / IPHONE_W
        const adj = adjs[k]
        if (!adj) return raw
        return {
            x: raw.x + (adj.dx ?? 0) * sx,
            y: raw.y + (adj.dy ?? 0) * sx,
            w: raw.w + (adj.dw ?? 0) * sx,
            h: raw.h + (adj.dh ?? 0) * sx,
            r: raw.r,
        }
    }).filter((r): r is SpotRect => r !== null)
    const firstSpotKey = spotKeys[0]
    const mascotImg = step.mascot_image_preview || step.mascot_image_url
    const title = step.title_ru || 'Заголовок шага'
    const body = step.body_ru || 'Описание подсказки пользователю.'
    const btnLabel = step.action_label_ru || 'Далее →'

    const isTrainer = startScreen === 'TRAINER' || firstSpotKey === 'start_trainer_button'
    const isLeft = step.mascot_position.includes('left')
    const isBottom = step.mascot_position.includes('bottom')

    const navActive = firstSpotKey === 'home_tab' ? 0 : firstSpotKey === 'trainer_tab' ? 1
        : firstSpotKey === 'leaderboard_tab' ? 2 : firstSpotKey === 'profile_tab' ? 3
        : isTrainer ? 1 : 0

    const NAV_ICONS  = ['🏠', '🎮', '🏆', '👤']
    const NAV_LABELS = ['Главная', 'Жаттығу', 'Рейтинг', 'Профиль']

    const s = (x: React.CSSProperties): React.CSSProperties => x

    return (
        <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 })}>
            <span style={s({ fontSize: 13, fontWeight: 700, color: '#6c5ce7' })}>{device.name}</span>
            <span style={s({ fontSize: 11, color: '#8888bb', marginTop: -4 })}>{w}×{h}</span>
            {/* Phone/tablet frame */}
            <div style={s({
                width: w + 8, height: h + 8,
                borderRadius: br + 4, background: '#0a0a1a',
                border: '4px solid #2a2a4a', position: 'relative',
                overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.4)',
                flexShrink: 0,
            })}>
                {/* Status bar */}
                <div style={s({
                    height: sbH, background: '#0a0a1a', position: 'relative', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: `0 ${f(16)}px`, fontSize: f(7), fontWeight: 700, color: '#fff',
                })}>
                    <span>16:01</span>
                    {device.id === 'iphone' && (
                        <div style={s({ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, background: '#000', borderRadius: 20 })} />
                    )}
                    {device.id === 'pixel' && (
                        <div style={s({ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, background: '#111', borderRadius: '50%' })} />
                    )}
                    <span>WiFi 43%</span>
                </div>
                {/* App content */}
                <div style={s({ position: 'absolute', top: sbH, left: 0, right: 0, bottom: navH, background: '#F2F2F7', overflow: 'hidden' })}>
                    {isTrainer ? (
                        <div style={s({ padding: `${f(10)}px ${f(12)}px`, background: '#0e0e22', height: '100%' })}>
                            <div style={s({ background: '#14143a', borderRadius: f(10), padding: f(4), display: 'flex', gap: f(3), marginBottom: f(10) })}>
                                {['Толық ҰБТ', 'Пән бойынша', 'Баттл'].map((t, i) => (
                                    <div key={i} style={s({ flex: 1, textAlign: 'center', padding: `${f(5)}px ${f(2)}px`, borderRadius: f(8), background: i === 0 ? '#3d2d8a' : 'transparent', fontSize: f(6), fontWeight: 700, color: i === 0 ? '#fff' : '#5050a0' })}>{t}</div>
                                ))}
                            </div>
                            <div style={s({ fontSize: f(7), color: '#fff', fontWeight: 700, marginBottom: f(8) })}>Негізгі пәндер:</div>
                            <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: f(8) })}>
                                {[['🔢','Мат. сауаттылық'],['📖','Оқу'],['🏛️','Тарих']].map(([ic, nm], i) => (
                                    <div key={i} style={s({ background: '#14143a', borderRadius: f(10), padding: `${f(10)}px ${f(6)}px`, textAlign: 'center', border: '1px solid #1e1e50' })}>
                                        <div style={s({ fontSize: f(18) })}>{ic}</div>
                                        <div style={s({ fontSize: f(6), color: '#d0d0ff', marginTop: f(4), lineHeight: 1.3 })}>{nm}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* HomeMainScreen: topPad=71, banner→events→mini cards on light #F2F2F7 bg */
                        <div style={s({ paddingTop: f(17) })}>
                            {/* Banner: full-width SpotlightTarget wraps _BannerCarousel (h=220+gap10+dots6=236) */}
                            <div style={s({ height: f(236), position: 'relative' })}>
                                <div style={s({ margin: `0 ${f(16)}px`, height: f(220), borderRadius: f(20), background: 'linear-gradient(135deg,#1B0E3B 0%,#100823 50%,#070410 100%)', position: 'relative', overflow: 'hidden' })}>
                                    <div style={{ position: 'absolute', right: f(8), top: f(40), fontSize: f(42), opacity: 0.7, transform: 'rotate(17deg)' }}>🏆</div>
                                    <div style={{ position: 'absolute', padding: f(18) }}>
                                        <div style={s({ display: 'inline-block', background: 'rgba(255,215,0,.18)', borderRadius: f(6), padding: `${f(3)}px ${f(8)}px`, fontSize: f(11), fontWeight: 700, color: '#FFD84D', letterSpacing: 0.5, marginBottom: f(6) })}>GRAND PRIX</div>
                                        <div style={s({ fontSize: f(15), fontWeight: 800, color: '#fff', marginBottom: f(2) })}>AIMA GRAND PRIX</div>
                                        <div style={s({ fontSize: f(18), fontWeight: 800, color: '#FFD84D', marginBottom: f(6) })}>1 000 000 Т</div>
                                        <div style={s({ display: 'flex', gap: f(4) })}>
                                            {[['26','КҮН'],['14','САГ'],['03','МИН'],['37','СЕК']].map(([n,l]) => (
                                                <div key={l} style={s({ background: 'rgba(255,255,255,.12)', borderRadius: f(6), padding: `${f(4)}px ${f(5)}px`, textAlign: 'center', minWidth: f(26) })}>
                                                    <div style={s({ fontSize: f(11), fontWeight: 800, color: '#fff', lineHeight: 1 })}>{n}</div>
                                                    <div style={s({ fontSize: f(7), color: 'rgba(255,255,255,.5)', marginTop: f(1) })}>{l}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div style={s({ height: f(16), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: f(4) })}>
                                    {[0,1,2].map(i => <div key={i} style={s({ height: f(6), width: i === 0 ? f(18) : f(6), borderRadius: f(4), background: i === 0 ? '#8b7cf6' : 'rgba(0,0,0,.2)' })} />)}
                                </div>
                            </div>
                            {/* Gap20 + section title "Іс-шаралар" — dark text on light bg */}
                            <div style={s({ marginTop: f(20), paddingLeft: f(16), paddingRight: f(16), marginBottom: f(12) })}>
                                <div style={s({ fontSize: f(20), fontWeight: 700, color: '#1a1a1a' })}>Іс-шаралар</div>
                            </div>
                            {/* Events grid: h=200, x=16..377 */}
                            <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: f(16), paddingLeft: f(16), paddingRight: f(16), height: f(200) })}>
                                {[['СПРИНТ','Спринт жарысы'],['КУБОК','AIMA кубогы']].map(([tag, nm], i) => (
                                    <div key={i} style={s({ borderRadius: f(16), background: 'linear-gradient(135deg,#1B0E3B,#070410)', padding: f(16), position: 'relative', overflow: 'hidden', boxSizing: 'border-box' })}>
                                        <div style={s({ display: 'inline-block', background: 'rgba(255,255,255,.18)', borderRadius: f(6), padding: `${f(2)}px ${f(6)}px`, fontSize: f(12), fontWeight: 700, color: '#fff', marginBottom: f(8) })}>{tag}</div>
                                        <div style={s({ fontSize: f(14), fontWeight: 700, color: '#fff', lineHeight: 1.3 })}>{nm}</div>
                                        <div style={{ position: 'absolute', right: -10, top: f(30), fontSize: f(30), opacity: 0.45, transform: 'rotate(17deg)' }}>🏆</div>
                                    </div>
                                ))}
                            </div>
                            {/* Gap20 + Mini cards: h=155 */}
                            <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: f(12), paddingLeft: f(16), paddingRight: f(16), marginTop: f(20), height: f(155) })}>
                                <div style={s({ background: '#fff', borderRadius: f(16), padding: f(16), boxShadow: '0 2px 8px rgba(0,0,0,.06)' })}>
                                    <div style={s({ fontSize: f(24), marginBottom: f(8) })}>🏆</div>
                                    <div style={s({ fontSize: f(12), color: '#888', lineHeight: 1.35 })}>Рейтингтегі<br />орным</div>
                                    <div style={s({ fontSize: f(14), fontWeight: 700, color: '#6c5ce7', marginTop: f(6) })}>1 орын</div>
                                </div>
                                <div style={s({ background: '#fff', borderRadius: f(16), padding: f(16), boxShadow: '0 2px 8px rgba(0,0,0,.06)' })}>
                                    <div style={s({ background: '#6c5ce7', width: f(32), height: f(32), borderRadius: f(10), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: f(18), marginBottom: f(8) })}>🎁</div>
                                    <div style={s({ fontSize: f(12), color: '#888', lineHeight: 1.35 })}>Келесі<br />сыйлық</div>
                                    <div style={s({ fontSize: f(14), fontWeight: 700, color: '#FF8800', marginTop: f(6) })}>340 ⭐</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Nav bar — matches Flutter layout: paddingTop=10, paddingL/R=12, 4×flex-1 tabs h=48, dot for active */}
                <div style={s({ position: 'absolute', bottom: 0, left: 0, right: 0, height: navH, background: 'rgba(0,0,0,.88)', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'flex-start', paddingTop: f(10), paddingLeft: f(12), paddingRight: f(12), zIndex: 1, boxSizing: 'border-box' })}>
                    {NAV_ICONS.map((icon, i) => (
                        <div key={i} style={s({ flex: 1, height: f(48), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: f(5) })}>
                            <span style={s({ fontSize: f(14), opacity: navActive === i ? 1 : 0.35 })}>{icon}</span>
                            <div style={s({ height: f(14), display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                                {navActive === i
                                    ? <div style={s({ width: f(4), height: f(4), borderRadius: '50%', background: '#8b7cf6' })} />
                                    : <span style={s({ fontSize: f(5.5), color: '#B8B8BE' })}>{NAV_LABELS[i]}</span>
                                }
                            </div>
                        </div>
                    ))}
                </div>

                {/* Inner clip */}
                <div style={s({ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: br })}>
                {/* Overlay */}
                <div style={s({ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.76)', zIndex: 10 })} />
                {spotRects.map((r, i) => (
                    <div key={i} style={s({
                        position: 'absolute', left: r.x, top: r.y,
                        width: r.w, height: r.h, borderRadius: r.r,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,.76), 0 0 0 2px rgba(108,92,231,.9), 0 0 16px 6px rgba(108,92,231,.4)',
                        zIndex: 11,
                    })} />
                ))}
                {/* Step counter — Flutter: top = padding.top + 16, fixed 16px font */}
                <div style={s({ position: 'absolute', top: sbH + 16, left: 0, right: 0, textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#fff', zIndex: 14 })}>
                    {stepIndex + 1} / {totalSteps}
                </div>
                {/* Mascot — fixed 220px logical width matches Flutter MascotWidget */}
                <div style={s({
                    position: 'absolute',
                    ...(isBottom ? { bottom: 0 } : { top: 0 }),
                    ...(isLeft ? { left: -12 } : { right: -12 }),
                    zIndex: 12,
                    transformOrigin: isLeft ? 'bottom left' : 'bottom right',
                    transform: `translateX(${step.mascot_x ?? 0}px) translateY(${step.mascot_y ?? 0}px) scale(${step.mascot_scale ?? 1}) rotate(${step.mascot_rotation ?? 0}deg)`,
                })}>
                    <div style={{ transform: `scale(${(step.mascot_flip_h ?? false) ? -1 : 1}, ${(step.mascot_flip_v ?? false) ? -1 : 1})` }}>
                        {mascotImg
                            ? <img src={mascotImg} alt="" style={s({ width: 220, height: 'auto', display: 'block', objectFit: 'contain' })} />
                            : <div style={s({ width: 220, height: 276, background: 'linear-gradient(160deg,#1e1050,#4a28a0)', borderRadius: isLeft ? '0 28px 0 0' : '28px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 })}>🧑‍💻</div>
                        }
                    </div>
                </div>
                {/* Speech bubble — matches Flutter SpeechBubbleWidget exactly */}
                <div style={{
                    position: 'absolute',
                    ...(isBottom ? { bottom: 240 } : { top: 240 }),
                    ...(isLeft ? { right: 16 } : { left: 16 }),
                    zIndex: 13,
                    transform: `translateX(${step.bubble_x ?? 0}px) translateY(${step.bubble_y ?? 0}px)`,
                }}>
                    <div style={{ position: 'relative', width: step.bubble_width ?? 260 }}>
                        <div style={{
                            background: '#fff', borderRadius: 16,
                            padding: (() => { const p = step.bubble_padding ?? 20; return `${isBottom ? p : p+8}px ${isLeft ? p : p+4}px ${isBottom ? p+8 : p}px ${isLeft ? p+4 : p}px` })(),
                            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                        }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', marginBottom: 8, lineHeight: 1.3 }}>{title}</div>
                            <div style={{ fontSize: 14, color: '#3D3D5C', lineHeight: 1.5 }}>{body}</div>
                        </div>
                        {/* Tail triangle — matches Flutter _BubblePainter */}
                        <div style={{
                            position: 'absolute',
                            ...(isBottom
                                ? { bottom: -13, borderTop: '14px solid #fff', borderBottom: 'none' }
                                : { top: -13, borderBottom: '14px solid #fff', borderTop: 'none' }),
                            ...(isLeft ? { left: 12 } : { right: 12 }),
                            width: 0, height: 0,
                            borderLeft: '8.5px solid transparent',
                            borderRight: '8.5px solid transparent',
                        }} />
                    </div>
                </div>
                {/* Bottom bar — Flutter-accurate: column bottom = safeAreaBottom + 24 */}
                {(() => {
                    const safeBot = device.id === 'ipad' ? 20 : device.id === 'pixel' ? 0 : 34
                    const skipBot = safeBot + 24
                    const btnBot = skipBot + 34
                    const dotsBot = btnBot + 60
                    return (<>
                        <div style={{ position: 'absolute', bottom: dotsBot, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 13 }}>
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div key={i} style={{ height: 8, width: i === stepIndex ? 20 : 8, borderRadius: 4, background: i === stepIndex ? '#6C5CE7' : '#DDD8F5', margin: '0 4px' }} />
                            ))}
                        </div>
                        <div style={{ position: 'absolute', bottom: btnBot, left: '50%', transform: 'translateX(-50%)', width: (step.button_width ?? 0) > 0 ? (step.button_width ?? 0) : 'calc(100% - 40px)', zIndex: 13, background: '#6C5CE7', color: '#fff', fontSize: 16, fontWeight: 700, padding: `${step.button_padding_v ?? 15}px 0`, borderRadius: 16, textAlign: 'center', boxShadow: '0 5px 14px rgba(108,92,231,.4)' }}>
                            {btnLabel}
                        </div>
                        <div style={{ position: 'absolute', bottom: skipBot, left: 0, right: 0, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,.5)', padding: '8px 0', zIndex: 13 }}>
                            Пропустить
                        </div>
                    </>)
                })()}
                </div>{/* /inner clip */}
            </div>
        </div>
    )
}

interface MultiDevicePreviewProps {
    step: OnboardingStep
    startScreen: string
    stepIndex: number
    totalSteps: number
}

const MultiDevicePreview: React.FC<MultiDevicePreviewProps> = (props) => (
    <div style={{ display: 'flex', gap: 40, overflowX: 'auto', padding: '8px 4px 16px', alignItems: 'flex-start' }}>
        {DEVICES.map(device => (
            <SingleDevicePreview key={device.id} device={device} {...props} />
        ))}
    </div>
)

// ─── StepEditor ─────────────────────────────────────────────────────────────

// ─── Payload builder (shared by handleSave and handleAutoSave) ───────────────

const buildStoryPayload = (story: OnboardingStory) => ({
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
        spotlight_element_keys: s.spotlight_element_keys ?? [],
        spotlight_element_key: (s.spotlight_element_keys ?? [])[0] ?? s.spotlight_element_key ?? null,
        spotlight_adjustments: s.spotlight_adjustments ?? {},
        step_screen: s.step_screen || null,
        action_label_ru: s.action_label_ru || null,
        action_label_kk: s.action_label_kk || null,
        action_route: s.action_route || null,
        mascot_scale: s.mascot_scale ?? 1.0,
        mascot_x: s.mascot_x ?? 0,
        mascot_y: s.mascot_y ?? 0,
        mascot_rotation: s.mascot_rotation ?? 0,
        bubble_x: s.bubble_x ?? 0,
        bubble_y: s.bubble_y ?? 0,
        mascot_flip_h: s.mascot_flip_h ?? false,
        mascot_flip_v: s.mascot_flip_v ?? false,
        bubble_width: s.bubble_width ?? 260,
        bubble_padding: s.bubble_padding ?? 20,
        button_width: s.button_width ?? 0,
        button_padding_v: s.button_padding_v ?? 15,
    })),
})

// ─── StepEditor ──────────────────────────────────────────────────────────────

interface StepEditorProps {
    step: OnboardingStep
    savedStep: OnboardingStep | null
    index: number
    total: number
    spotlightKeys: SpotlightKey[]
    startScreen: string
    onPatch: (patch: Partial<OnboardingStep>) => void
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
}

const StepEditor: React.FC<StepEditorProps> = ({ step, savedStep, index, total, spotlightKeys, startScreen, onPatch, onMoveUp, onMoveDown, onDelete }) => {
    const [open, setOpen] = useState(index === 0)
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const upd = onPatch

    const isDirty = savedStep === null || JSON.stringify(step) !== JSON.stringify(savedStep)
    const isChanged = <K extends keyof OnboardingStep>(k: K) => savedStep === null || step[k] !== savedStep[k]

    // F: Esc closes the open step
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open])

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
            const { url, filename } = await onboardingService.uploadImage(file)
            // Store filename in DB (never expires); keep presigned url as local preview
            upd({ mascot_image_url: filename, mascot_image_preview: url })
            toast.success('Изображение загружено')
        } catch {
            toast.error('Ошибка загрузки изображения')
        } finally {
            setUploading(false)
        }
    }

    const preview = step.mascot_image_preview || step.mascot_image_url

    // Filter: built-in keys shown only if available on the effective screen for this step;
    // custom keys (not in SPOT_MAP) are always shown.
    const effectiveScreen = step.step_screen ?? startScreen
    const screenKeys = SCREEN_SPOT_KEYS[effectiveScreen.toUpperCase()]
    const filteredSpotKeys = spotlightKeys.filter(k =>
        !BUILTIN_SPOT_KEYS.has(k.value) || !screenKeys || screenKeys.has(k.value)
    )
    const selectedSpotKeys = step.spotlight_element_keys ?? []
    const spotAdj = step.spotlight_adjustments ?? {}

    const patchAdj = (key: string, field: 'dx' | 'dy' | 'dw' | 'dh', val: number) => {
        const current = spotAdj[key] ?? { dx: 0, dy: 0, dw: 0, dh: 0 }
        upd({ spotlight_adjustments: { ...spotAdj, [key]: { ...current, [field]: val } } })
    }

    const routeValue = step.action_route ?? ''
    const isCustomRoute = routeValue !== '' && !PREDEFINED_ROUTES.some(r => r.value === routeValue)

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
                {/* E: title + body preview when collapsed */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                        {step.title_ru || <span className="text-gray-400 italic">Без заголовка</span>}
                    </div>
                    {!open && step.body_ru && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">{step.body_ru}</div>
                    )}
                </div>
                {/* A: unsaved badge */}
                {isDirty && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                        не сохранено
                    </span>
                )}
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
                <div className="flex gap-0">
                    {/* Left: sticky phone preview + bubble position */}
                    <div className="sticky top-0 self-start border-r border-gray-100 p-4 shrink-0" style={{ width: 224 }}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Предпросмотр</p>
                        {/* Phone scaled to 50% — frame is 401×860, labels ~42px → total ~902 → at 0.5 → ~451px */}
                        <div style={{ width: 205, height: 460, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', display: 'inline-block' }}>
                                <SingleDevicePreview device={DEVICES[0]} step={step} startScreen={startScreen} stepIndex={index} totalSteps={total} />
                            </div>
                        </div>
                        {/* Позиция пузыря — moved here from right column for proximity to preview */}
                        <div className="mt-3 space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Позиция пузыря</label>
                            {(['bubble_x', 'bubble_y'] as const).map(key => {
                                const val = step[key] ?? 0
                                return (
                                    <div key={key} className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-gray-500 w-4 flex-shrink-0">{key === 'bubble_x' ? 'X' : 'Y'}</span>
                                        <input
                                            type="range" min={-200} max={200} step={1} value={val}
                                            onChange={e => upd({ [key]: Number(e.target.value) } as Partial<OnboardingStep>)}
                                            className="flex-1 accent-indigo-500"
                                        />
                                        <span className="text-[11px] text-indigo-700 font-mono w-10 text-right flex-shrink-0">{val}px</span>
                                        {val !== 0 && (
                                            <button type="button"
                                                onClick={() => upd({ [key]: 0 } as Partial<OnboardingStep>)}
                                                className="text-[11px] text-gray-400 hover:text-gray-600 flex-shrink-0">↺</button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {/* Right: all settings (unchanged) */}
                    <div className="flex-1 min-w-0 p-4 space-y-4">
                    <div className="space-y-4 min-w-0">
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
                            {/* Transform controls */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Трансформация</label>
                                {([
                                    { key: 'mascot_scale', label: 'Размер', min: 0.3, max: 3, step: 0.05, val: step.mascot_scale ?? 1, fmt: (v: number) => v.toFixed(2) },
                                    { key: 'mascot_x', label: 'Смещ. X', min: -100, max: 100, step: 1, val: step.mascot_x ?? 0, fmt: (v: number) => `${v}px` },
                                    { key: 'mascot_y', label: 'Смещ. Y', min: -100, max: 100, step: 1, val: step.mascot_y ?? 0, fmt: (v: number) => `${v}px` },
                                    { key: 'mascot_rotation', label: 'Наклон', min: -180, max: 180, step: 1, val: step.mascot_rotation ?? 0, fmt: (v: number) => `${v}°` },
                                ] as const).map(({ key, label, min, max, step: st, val, fmt }) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
                                        <input
                                            type="range" min={min} max={max} step={st} value={val}
                                            onChange={e => upd({ [key]: Number(e.target.value) } as Partial<OnboardingStep>)}
                                            className="flex-1 accent-indigo-500"
                                        />
                                        <span className="text-xs text-indigo-700 font-mono w-12 text-right flex-shrink-0">{fmt(val)}</span>
                                        {val !== (key === 'mascot_scale' ? 1 : 0) && (
                                            <button type="button"
                                                onClick={() => upd({ [key]: key === 'mascot_scale' ? 1 : 0 } as Partial<OnboardingStep>)}
                                                className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">↺</button>
                                        )}
                                    </div>
                                ))}
                                <div className="flex items-center gap-4 pt-1">
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input type="checkbox"
                                            checked={step.mascot_flip_h ?? false}
                                            onChange={e => upd({ mascot_flip_h: e.target.checked })}
                                            className="w-3.5 h-3.5 accent-indigo-500"
                                        />
                                        <span className="text-xs text-gray-500">Зеркало X</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input type="checkbox"
                                            checked={step.mascot_flip_v ?? false}
                                            onChange={e => upd({ mascot_flip_v: e.target.checked })}
                                            className="w-3.5 h-3.5 accent-indigo-500"
                                        />
                                        <span className="text-xs text-gray-500">Зеркало Y</span>
                                    </label>
                                </div>
                            </div>
                            {/* Позиция пузыря moved to left sidebar (under preview phone) */}
                        </div>

                        {/* Texts — variant A: side-by-side RU | KK */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Languages className="h-3.5 w-3.5" /> Текст пузыря
                            </label>
                            {/* Title row */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block">
                                        <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1 rounded">RU</span> Заголовок
                                    </label>
                                    <input
                                        type="text" value={step.title_ru} maxLength={80}
                                        onChange={e => upd({ title_ru: e.target.value })}
                                        placeholder="Привет! 👋"
                                        className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${isChanged('title_ru') ? 'border-amber-300 bg-amber-50 focus:ring-amber-300' : 'border-gray-300 focus:ring-indigo-400'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block">
                                        <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-1 rounded">KK</span> Тақырып
                                    </label>
                                    <input
                                        type="text" value={step.title_kk} maxLength={80}
                                        onChange={e => upd({ title_kk: e.target.value })}
                                        placeholder="Сәлем! 👋"
                                        className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${isChanged('title_kk') ? 'border-amber-300 bg-amber-50 focus:ring-amber-300' : 'border-gray-300 focus:ring-indigo-400'}`}
                                    />
                                </div>
                            </div>
                            {/* Body row */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block">
                                        <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1 rounded">RU</span> Текст
                                        <span className="ml-auto text-gray-400">{step.body_ru.length}/300</span>
                                    </label>
                                    <textarea
                                        value={step.body_ru} maxLength={300} rows={4}
                                        onChange={e => upd({ body_ru: e.target.value })}
                                        placeholder="Я — Айбек, твой проводник..."
                                        className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 resize-none ${isChanged('body_ru') ? 'border-amber-300 bg-amber-50 focus:ring-amber-300' : 'border-gray-300 focus:ring-indigo-400'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block">
                                        <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-1 rounded">KK</span> Мәтін
                                        <span className="ml-auto text-gray-400">{step.body_kk.length}/300</span>
                                    </label>
                                    <textarea
                                        value={step.body_kk} maxLength={300} rows={4}
                                        onChange={e => upd({ body_kk: e.target.value })}
                                        placeholder="Мен — Айбек, сенің бағыттаушың..."
                                        className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 resize-none ${isChanged('body_kk') ? 'border-amber-300 bg-amber-50 focus:ring-amber-300' : 'border-gray-300 focus:ring-indigo-400'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bubble & button sizes */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Размеры пузыря и кнопки</label>
                            {([
                                { key: 'bubble_width',    label: 'Пузырь ширина', min: 100, max: 400, step: 1,   def: 260, fmt: (v: number) => `${v}px` },
                                { key: 'bubble_padding',  label: 'Пузырь padding', min: 4,  max: 40,  step: 1,   def: 20,  fmt: (v: number) => `${v}px` },
                                { key: 'button_width',    label: 'Кнопка ширина', min: 0,   max: 400, step: 1,   def: 0,   fmt: (v: number) => v === 0 ? 'full' : `${v}px` },
                                { key: 'button_padding_v',label: 'Кнопка padding v', min: 4, max: 30, step: 1,   def: 15,  fmt: (v: number) => `${v}px` },
                            ] as const).map(({ key, label, min, max, step: st, def, fmt }) => {
                                const val = (step[key] as number) ?? def
                                return (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
                                        <input
                                            type="range" min={min} max={max} step={st} value={val}
                                            onChange={e => upd({ [key]: Number(e.target.value) } as Partial<OnboardingStep>)}
                                            className="flex-1 accent-indigo-500"
                                        />
                                        <span className="text-xs text-indigo-700 font-mono w-14 text-right flex-shrink-0">{fmt(val)}</span>
                                        {val !== def && (
                                            <button type="button"
                                                onClick={() => upd({ [key]: def } as Partial<OnboardingStep>)}
                                                className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">↺</button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Экран шага + Spotlight + Action */}
                    <div className="pt-2 border-t border-gray-100 space-y-4">
                        {/* Экран шага */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                Экран шага
                            </label>
                            <select
                                value={step.step_screen ?? ''}
                                onChange={e => {
                                    const newScreen = (e.target.value || null) as StartScreen | null
                                    const effectiveScr = newScreen ?? startScreen
                                    const allowed = SCREEN_SPOT_KEYS[effectiveScr.toUpperCase()]
                                    const newKeys = (step.spotlight_element_keys ?? []).filter(k =>
                                        !BUILTIN_SPOT_KEYS.has(k) || !allowed || allowed.has(k)
                                    )
                                    upd({
                                        step_screen: newScreen,
                                        spotlight_element_keys: newKeys,
                                        spotlight_element_key: newKeys[0] ?? null,
                                    })
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">— экран истории (по умолчанию) —</option>
                                {START_SCREENS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">
                                Если задан — приложение перейдёт на этот экран перед показом шага
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Spotlight multi-select */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                    Spotlight-подсветка
                                </label>
                                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                                    {filteredSpotKeys.length === 0
                                        ? <p className="text-xs text-gray-400 px-3 py-2">Нет ключей для этого экрана</p>
                                        : filteredSpotKeys.map(k => (
                                            <label key={k.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none border-b border-gray-100 last:border-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSpotKeys.includes(k.value)}
                                                    onChange={e => {
                                                        const next = e.target.checked
                                                            ? [...selectedSpotKeys, k.value]
                                                            : selectedSpotKeys.filter(v => v !== k.value)
                                                        upd({ spotlight_element_keys: next, spotlight_element_key: next[0] ?? null })
                                                    }}
                                                    className="accent-indigo-500 w-3.5 h-3.5 flex-shrink-0"
                                                />
                                                <span className="text-sm text-gray-700">{k.label}</span>
                                            </label>
                                        ))
                                    }
                                </div>
                                {selectedSpotKeys.length > 0 && (
                                    <p className="text-xs text-indigo-600 mt-1">
                                        Выбрано: {selectedSpotKeys.length} &nbsp;·&nbsp; {selectedSpotKeys.map(k => (
                                            <code key={k} className="bg-indigo-50 px-1 rounded mr-1">{k}</code>
                                        ))}
                                    </p>
                                )}
                                {/* Per-key adjustment controls */}
                                {selectedSpotKeys.length > 0 && (
                                    <div className="mt-2 space-y-3">
                                        {selectedSpotKeys.map(k => {
                                            const adj = spotAdj[k] ?? { dx: 0, dy: 0, dw: 0, dh: 0 }
                                            const hasAdj = adj.dx !== 0 || adj.dy !== 0 || adj.dw !== 0 || adj.dh !== 0
                                            const keyLabel = filteredSpotKeys.find(s => s.value === k)?.label ?? k
                                            return (
                                                <div key={k} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-gray-600">{keyLabel}</span>
                                                        {hasAdj && (
                                                            <button type="button"
                                                                onClick={() => upd({ spotlight_adjustments: { ...spotAdj, [k]: { dx: 0, dy: 0, dw: 0, dh: 0 } } })}
                                                                className="text-xs text-gray-400 hover:text-red-500">↺ сброс</button>
                                                        )}
                                                    </div>
                                                    {([
                                                        { f: 'dx' as const, label: 'Смещ. X', min: -100, max: 100 },
                                                        { f: 'dy' as const, label: 'Смещ. Y', min: -100, max: 100 },
                                                        { f: 'dw' as const, label: 'Ширина +', min: -100, max: 100 },
                                                        { f: 'dh' as const, label: 'Высота +', min: -100, max: 100 },
                                                    ]).map(({ f, label, min, max }) => (
                                                        <div key={f} className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
                                                            <input
                                                                type="range" min={min} max={max} step={1}
                                                                value={adj[f] ?? 0}
                                                                onChange={e => patchAdj(k, f, Number(e.target.value))}
                                                                className="flex-1 accent-indigo-500"
                                                            />
                                                            <span className="text-xs text-indigo-700 font-mono w-10 text-right flex-shrink-0">
                                                                {adj[f] > 0 ? '+' : ''}{adj[f] ?? 0}px
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Кнопка действия */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                    Кнопка действия (необязательно)
                                </label>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text" value={step.action_label_ru ?? ''}
                                            onChange={e => upd({ action_label_ru: e.target.value || null })}
                                            placeholder="Перейти (RU)"
                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                        <input
                                            type="text" value={step.action_label_kk ?? ''}
                                            onChange={e => upd({ action_label_kk: e.target.value || null })}
                                            placeholder="Өту (KK)"
                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>
                                    <select
                                        value={isCustomRoute ? '__custom__' : routeValue}
                                        onChange={e => {
                                            if (e.target.value === '__custom__') {
                                                upd({ action_route: '' })
                                            } else {
                                                upd({ action_route: e.target.value || null })
                                            }
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        <option value="">— нет маршрута —</option>
                                        {PREDEFINED_ROUTES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                        <option value="__custom__">Другой...</option>
                                    </select>
                                    {isCustomRoute && (
                                        <input
                                            type="text" value={routeValue}
                                            onChange={e => upd({ action_route: e.target.value || null })}
                                            placeholder="custom_route"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
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
    onAutoSave?: (s: OnboardingStory) => Promise<void>
    onCancel: () => void
    cancelRef?: React.MutableRefObject<() => void>
}

const StoryForm: React.FC<StoryFormProps> = ({ initial, spotlightKeys, onSave, onAutoSave, onCancel, cancelRef }) => {
    const [story, setStory] = useState<OnboardingStory>(initial)
    const [savedStory, setSavedStory] = useState<OnboardingStory>(initial)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storyRef = useRef(story)
    const onAutoSaveRef = useRef(onAutoSave)
    storyRef.current = story
    onAutoSaveRef.current = onAutoSave

    const upd = (patch: Partial<OnboardingStory>) => setStory(s => ({ ...s, ...patch }))

    const isDirtyForm = JSON.stringify(story) !== JSON.stringify(savedStory)

    // C: auto-save debounce 1.5s after any change
    useEffect(() => {
        const fn = onAutoSaveRef.current
        if (!fn) return
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
        autoTimerRef.current = setTimeout(async () => {
            const currentStory = storyRef.current
            const currentFn = onAutoSaveRef.current
            if (!currentFn) return
            setAutoSaveStatus('saving')
            try {
                await currentFn(currentStory)
                setSavedStory(currentStory)
                setAutoSaveStatus('saved')
                setTimeout(() => setAutoSaveStatus(s => s === 'saved' ? 'idle' : s), 3000)
            } catch {
                setAutoSaveStatus('error')
            }
        }, 1500)
        return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }
    }, [story])

    // B: warn on browser close/reload
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirtyForm) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirtyForm])

    // F: Cmd/Ctrl+S to save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                const s = storyRef.current
                if (!s.name.trim()) { toast.error('Введите название рассказа'); return }
                if (s.steps.some(st => !st.title_ru.trim())) { toast.error('Заполните заголовок (RU) для всех шагов'); return }
                onSave(s)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onSave])

    const patchStep = (idx: number, patch: Partial<OnboardingStep>) => {
        setStory(s => {
            const steps = [...s.steps]
            steps[idx] = { ...steps[idx], ...patch }
            return { ...s, steps }
        })
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

    // B: intercept cancel — show exit dialog if dirty
    const handleCancel = () => {
        if (isDirtyForm) {
            setShowExitDialog(true)
        } else {
            onCancel()
        }
    }
    // expose handleCancel to parent so the header X button goes through dirty check
    if (cancelRef) cancelRef.current = handleCancel

    // B: compute field-level diff for exit dialog
    const exitDiff: Array<{ label: string; was: string; now: string }> = []
    if (story.name !== savedStory.name) exitDiff.push({ label: 'Название', was: savedStory.name || '—', now: story.name || '—' })
    if (story.is_active !== savedStory.is_active) exitDiff.push({ label: 'Статус', was: savedStory.is_active ? 'Активен' : 'Неактивен', now: story.is_active ? 'Активен' : 'Неактивен' })
    story.steps.forEach((st, i) => {
        const sv = savedStory.steps.find(s => s.id === st.id)
        if (!sv) { exitDiff.push({ label: `Шаг ${i + 1}`, was: '—', now: 'добавлен' }); return }
        if (st.title_ru !== sv.title_ru) exitDiff.push({ label: `Шаг ${i + 1} заголовок`, was: (sv.title_ru || '—').slice(0, 28), now: (st.title_ru || '—').slice(0, 28) })
        if (st.body_ru !== sv.body_ru) exitDiff.push({ label: `Шаг ${i + 1} текст`, was: (sv.body_ru || '—').slice(0, 28), now: (st.body_ru || '—').slice(0, 28) })
        if (st.mascot_position !== sv.mascot_position) exitDiff.push({ label: `Шаг ${i + 1} маскот`, was: sv.mascot_position, now: st.mascot_position })
    })

    return (
        <div className="space-y-6">
            {/* B: Exit confirmation dialog */}
            {showExitDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-base font-bold text-gray-900">Есть несохранённые изменения</h3>
                        </div>
                        {exitDiff.length > 0 && (
                            <div className="mb-4 rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {exitDiff.slice(0, 8).map((d, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                                        <span className="text-gray-500 font-medium w-32 flex-shrink-0 truncate">{d.label}</span>
                                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded max-w-[90px] truncate">{d.was}</span>
                                        <span className="text-gray-400 flex-shrink-0">→</span>
                                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded max-w-[90px] truncate">{d.now}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowExitDialog(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                                Остаться
                            </button>
                            <button onClick={() => { setShowExitDialog(false); onCancel() }}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200">
                                Уйти без сохранения
                            </button>
                            <button onClick={() => { setShowExitDialog(false); handleSave() }}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                                Сохранить и уйти
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* C: auto-save status bar */}
            {autoSaveStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl ${
                    autoSaveStatus === 'saving' ? 'bg-indigo-50 text-indigo-600' :
                    autoSaveStatus === 'saved'  ? 'bg-green-50 text-green-700' :
                    'bg-red-50 text-red-600'
                }`}>
                    {autoSaveStatus === 'saving' && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                    {autoSaveStatus === 'saving' ? 'Сохраняется...' : autoSaveStatus === 'saved' ? '✓ Сохранено автоматически' : '✗ Ошибка авто-сохранения — нажмите «Сохранить» вручную'}
                </div>
            )}
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
                            onClick={() => {
                                const newScreen = s.value as StartScreen
                                const steps = story.steps.map(st => {
                                    const effectiveScreen = st.step_screen ?? newScreen
                                    const allowed = SCREEN_SPOT_KEYS[effectiveScreen.toUpperCase()]
                                    const key = st.spotlight_element_key
                                    const newSingle = key && BUILTIN_SPOT_KEYS.has(key) && allowed && !allowed.has(key) ? null : key
                                    const newKeys = (st.spotlight_element_keys ?? []).filter(k =>
                                        !BUILTIN_SPOT_KEYS.has(k) || !allowed || allowed.has(k)
                                    )
                                    return { ...st, spotlight_element_key: newSingle, spotlight_element_keys: newKeys }
                                })
                                upd({ start_screen: newScreen, steps })
                            }}
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
                            savedStep={savedStory.steps.find(s => s.id === step.id) ?? null}
                            index={idx}
                            total={story.steps.length}
                            spotlightKeys={spotlightKeys}
                            startScreen={story.start_screen}
                            onPatch={patch => patchStep(idx, patch)}
                            onMoveUp={() => moveStep(idx, -1)}
                            onMoveDown={() => moveStep(idx, 1)}
                            onDelete={() => deleteStep(idx)}
                        />
                    ))}
                </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pb-6">
                <Button variant="ghost" onClick={handleCancel}>Отмена</Button>
                <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={handleSave}>
                    Сохранить рассказ
                </Button>
            </div>
        </div>
    )
}

// ─── ReShowModal ─────────────────────────────────────────────────────────────

type ReShowMode = 'all' | 'before_date' | 'new_users' | 'user'

interface ReShowModalProps {
    story: OnboardingStory
    onClose: () => void
    onDone: () => void
}

const ReShowModal: React.FC<ReShowModalProps> = ({ story, onClose, onDone }) => {
    const [mode, setMode] = useState<ReShowMode>('all')
    const [beforeDate, setBeforeDate] = useState('')
    const [newUserDays, setNewUserDays] = useState(7)
    const [userPhone, setUserPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<{ total_views: number } | null>(null)

    useEffect(() => {
        onboardingService.getStoryStats(story.id as number)
            .then(s => setStats(s))
            .catch(() => {})
    }, [story.id])

    const canSubmit = () => {
        if (mode === 'before_date') return !!beforeDate
        if (mode === 'user') return userPhone.trim().length > 4
        return true
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload: Parameters<typeof onboardingService.resetViews>[1] = { mode }
            if (mode === 'before_date') payload.before_date = new Date(beforeDate + 'T00:00:00').toISOString()
            if (mode === 'new_users') payload.new_user_days = newUserDays
            if (mode === 'user') payload.user_phone = userPhone.trim()

            const res = await onboardingService.resetViews(story.id as number, payload)
            toast.success(res.message)
            onDone()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Ошибка')
        } finally {
            setLoading(false)
        }
    }

    const MODES: { key: ReShowMode; label: string; desc: string }[] = [
        { key: 'all', label: 'Сбросить всем', desc: 'Удалить все просмотры — онбординг покажется снова каждому пользователю' },
        { key: 'before_date', label: 'По дате просмотра', desc: 'Сбросить тех, кто смотрел до указанной даты' },
        { key: 'new_users', label: 'Только новым', desc: 'Сменить аудиторию на «Новые пользователи» — существующие пользователи не увидят' },
        { key: 'user', label: 'Конкретному пользователю', desc: 'Сбросить просмотр для одного пользователя по номеру телефона' },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Повторный показ</p>
                        <h3 className="text-base font-semibold text-gray-900 truncate max-w-[280px]">{story.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    {stats !== null && (
                        <p className="text-sm text-gray-500 mb-4">
                            Просмотрели: <span className="font-semibold text-gray-800">{stats.total_views}</span> пользователей
                        </p>
                    )}

                    <div className="space-y-2 mb-5">
                        {MODES.map(m => (
                            <button
                                key={m.key}
                                onClick={() => setMode(m.key)}
                                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                                    mode === m.key ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                <p className={`text-sm font-medium ${mode === m.key ? 'text-indigo-700' : 'text-gray-800'}`}>{m.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                            </button>
                        ))}
                    </div>

                    {mode === 'before_date' && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Сбросить просмотры до даты</label>
                            <input
                                type="date"
                                value={beforeDate}
                                onChange={e => setBeforeDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    )}

                    {mode === 'new_users' && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Новые пользователи — дней с регистрации</label>
                            <input
                                type="number"
                                min={1}
                                value={newUserDays}
                                onChange={e => setNewUserDays(Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    )}

                    {mode === 'user' && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Номер телефона (+7...)</label>
                            <input
                                type="tel"
                                value={userPhone}
                                onChange={e => setUserPhone(e.target.value)}
                                placeholder="+77001234567"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !canSubmit()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Применяю...' : 'Применить'}
                        </button>
                    </div>
                </div>
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
    onReshow: () => void
}

const StoryCard: React.FC<StoryCardProps> = ({ story, onEdit, onDelete, onToggle, onReshow }) => (
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
                    <button onClick={onReshow} title="Повторный показ" className="p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <RefreshCw className="h-4 w-4 text-indigo-400" />
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
                        {(step.spotlight_element_keys?.length || step.spotlight_element_key) && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                                spotlight{step.spotlight_element_keys?.length > 1 ? ` ×${step.spotlight_element_keys.length}` : ''}
                            </span>
                        )}
                        {step.step_screen && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">→{step.step_screen}</span>
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
    const navigate = useNavigate()
    const [stories, setStories] = useState<OnboardingStory[]>([])
    const [loading, setLoading] = useState(true)
    const [spotlightKeys, setSpotlightKeys] = useState<SpotlightKey[]>(loadSpotlightKeys)
    const [editing, setEditing] = useState<OnboardingStory | null>(null)
    const [creating, setCreating] = useState(false)
    const [reshowStory, setReshowStory] = useState<OnboardingStory | null>(null)
    const formCancelRef = useRef<() => void>(() => { setCreating(false); setEditing(null) })

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
            const payload = buildStoryPayload(story)
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

    const handleAutoSave = async (story: OnboardingStory) => {
        if (!editing?.id) return
        await onboardingService.updateStory(Number(editing.id), buildStoryPayload(story))
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
            <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => formCancelRef.current()}
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
                    onAutoSave={editing?.id ? handleAutoSave : undefined}
                    onCancel={() => { setCreating(false); setEditing(null) }}
                    cancelRef={formCancelRef}
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
                    <button
                        onClick={() => navigate('/onboarding/animations')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                        <Clapperboard className="h-4 w-4" />
                        Анимации
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
                            onReshow={() => setReshowStory(story)}
                        />
                    ))}
                </div>
            )}

            {reshowStory && (
                <ReShowModal
                    story={reshowStory}
                    onClose={() => setReshowStory(null)}
                    onDone={() => { setReshowStory(null); fetchStories() }}
                />
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

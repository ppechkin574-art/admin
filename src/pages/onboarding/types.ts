export type TargetAudience = 'ALL' | 'NEW_USERS'
export type TriggerType = 'FIRST_OPEN' | 'IMMEDIATE'
export type MascotPosition = 'bottom_left' | 'bottom_right' | 'top_left' | 'top_right'
export type StartScreen = 'HOME' | 'TRAINER' | 'PROFILE' | 'LEADERBOARD' | 'SUBSCRIPTION'

export interface OnboardingStep {
    id: string
    step_order: number
    mascot_image_url: string | null
    mascot_image_preview: string | null // base64 для превью до загрузки
    title_ru: string
    title_kk: string
    body_ru: string
    body_kk: string
    mascot_position: MascotPosition
    spotlight_element_key: string | null
    action_label_ru: string | null
    action_label_kk: string | null
    action_route: string | null
    mascot_scale: number
    mascot_x: number
    mascot_y: number
    mascot_rotation: number
}

export interface OnboardingStory {
    id: string | number
    name: string
    priority: number
    is_active: boolean
    is_mandatory: boolean
    is_test: boolean
    skip_delay_seconds: number
    target_audience: TargetAudience
    new_user_days: number
    trigger: TriggerType
    immediate_count: number
    max_shows_per_user: number
    start_screen: StartScreen
    steps: OnboardingStep[]
    created_at: string
}

export const MASCOT_POSITIONS: { value: MascotPosition; label: string }[] = [
    { value: 'bottom_left', label: 'Снизу-слева' },
    { value: 'bottom_right', label: 'Снизу-справа' },
    { value: 'top_left', label: 'Сверху-слева' },
    { value: 'top_right', label: 'Сверху-справа' },
]

export const START_SCREENS: { value: StartScreen; label: string }[] = [
    { value: 'HOME', label: 'Главная' },
    { value: 'TRAINER', label: 'Тренажёр' },
    { value: 'PROFILE', label: 'Профиль' },
    { value: 'LEADERBOARD', label: 'Рейтинг' },
    { value: 'SUBSCRIPTION', label: 'Подписка' },
]

export interface SpotlightKey {
    value: string
    label: string
}

export const DEFAULT_SPOTLIGHT_KEYS: SpotlightKey[] = [
    { value: 'home_tab', label: 'Вкладка «Главная»' },
    { value: 'trainer_tab', label: 'Вкладка «Тренажёр»' },
    { value: 'leaderboard_tab', label: 'Вкладка «Рейтинг»' },
    { value: 'profile_tab', label: 'Вкладка «Профиль»' },
    { value: 'start_trainer_button', label: 'Кнопка начала тренировки' },
    { value: 'subscription_banner', label: 'Баннер подписки' },
    { value: 'streak_widget', label: 'Виджет серии дней' },
]

export const SPOTLIGHT_LS_KEY = 'aima_spotlight_keys_v1'

export const loadSpotlightKeys = (): SpotlightKey[] => {
    try {
        const raw = localStorage.getItem(SPOTLIGHT_LS_KEY)
        return raw ? JSON.parse(raw) : DEFAULT_SPOTLIGHT_KEYS
    } catch { return DEFAULT_SPOTLIGHT_KEYS }
}

export const saveSpotlightKeys = (keys: SpotlightKey[]) => {
    localStorage.setItem(SPOTLIGHT_LS_KEY, JSON.stringify(keys))
}

export const makeEmptyStep = (order: number): OnboardingStep => ({
    id: `step_${Date.now()}_${order}`,
    step_order: order,
    mascot_image_url: null,
    mascot_image_preview: null,
    title_ru: '',
    title_kk: '',
    body_ru: '',
    body_kk: '',
    mascot_position: 'bottom_left',
    spotlight_element_key: '',
    action_label_ru: '',
    action_label_kk: '',
    action_route: '',
    mascot_scale: 1.0,
    mascot_x: 0,
    mascot_y: 0,
    mascot_rotation: 0,
})

export const makeEmptyStory = (): OnboardingStory => ({
    id: `story_${Date.now()}`,
    name: '',
    priority: 0,
    is_active: false,
    is_mandatory: true,
    is_test: false,
    skip_delay_seconds: 3,
    target_audience: 'ALL',
    new_user_days: 7,
    trigger: 'FIRST_OPEN',
    immediate_count: 1,
    max_shows_per_user: 1,
    start_screen: 'HOME',
    steps: [makeEmptyStep(1)],
    created_at: new Date().toISOString(),
})

export const LS_KEY = 'aima_onboarding_stories_v1'

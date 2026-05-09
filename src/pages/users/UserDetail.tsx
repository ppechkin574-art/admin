import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Lock, RefreshCw, Unlock } from 'lucide-react'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'

// Detail card for a single user. Read-mostly: only the block/unblock
// toggle is wired up — the full edit flow lives in UserForm and is
// reachable via /users/:id/edit when admins need to change name/email/
// password/subjects (currently used for teacher onboarding).
//
// Layout philosophy: group fields by what an admin actually inspects:
//   1. Identity      — who is this user (name, role, contacts)
//   2. Onboarding    — what they answered during sign-up (grade, subjects)
//   3. Subscription  — billing-tier state
//   4. Engagement    — gamification counters (streak, points, rank)
//   5. System        — keycloak ids, timestamps

interface User {
    id: string
    username: string
    name: string
    email: string | null
    phone: string | null
    is_active: boolean
    roles: string[]
    role?: string
    allowed_subject_ids: number[]
    grade: number | null
    plan: string
    used_trial: boolean
    subscription_end: string | null
    subscription_cancelled: boolean
    attendance_streak_days: number
    attendance_total_points: number
    points: number
    rank: number | null
    created_at: string
    updated_at: string | null
}

const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return '—'
    }
}

const roleLabel = (user: User): string => {
    const r = user.role || (user.roles?.includes('parent')
        ? 'parent'
        : user.roles?.includes('child')
        ? 'child'
        : user.roles?.includes('teacher')
        ? 'teacher'
        : user.roles?.includes('admin')
        ? 'admin'
        : 'user')
    switch (r) {
        case 'child': return 'Ученик'
        case 'parent': return 'Родитель'
        case 'teacher': return 'Учитель'
        case 'admin': return 'Админ'
        default: return 'Пользователь'
    }
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col gap-1 py-3 border-b border-gray-100">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        <div className="text-sm text-gray-900">{children}</div>
    </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        {children}
    </div>
)

export const UserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { fetchUserById, updateUser } = useUserStore()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [toggleBusy, setToggleBusy] = useState(false)

    useEffect(() => {
        if (!id) return
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const u = await fetchUserById(id, true) as unknown as User
                if (!cancelled) setUser(u)
            } catch {
                if (!cancelled) toast.error('Не удалось загрузить пользователя')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [id, fetchUserById])

    const handleToggleActive = async () => {
        if (!user) return
        const next = !user.is_active
        setToggleBusy(true)
        try {
            const updated = await updateUser(user.id, { is_active: next })
            setUser(updated as unknown as User)
            toast.success(next ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
        } catch {
            toast.error('Не удалось изменить статус')
        } finally {
            setToggleBusy(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Загрузка...
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-gray-500">Пользователь не найден</p>
                <Button variant="secondary" onClick={() => navigate('/users')}>
                    Назад к списку
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/users')}
                        icon={<ArrowLeft className="h-4 w-4" />}
                    >
                        К списку
                    </Button>
                    <h2 className="text-2xl font-bold text-gray-900">{user.name || 'Без имени'}</h2>
                    <Badge type={user.is_active ? 'success' : 'error'}>
                        {user.is_active ? 'Активен' : 'Заблокирован'}
                    </Badge>
                </div>
                <Button
                    variant={user.is_active ? 'danger' : 'primary'}
                    onClick={handleToggleActive}
                    disabled={toggleBusy}
                    icon={user.is_active
                        ? <Lock className="h-4 w-4" />
                        : <Unlock className="h-4 w-4" />}
                >
                    {user.is_active ? 'Заблокировать' : 'Разблокировать'}
                </Button>
            </div>

            {/* Identity */}
            <Section title="Кто это">
                <Field label="Имя">{user.name || '—'}</Field>
                <Field label="Username">{user.username || '—'}</Field>
                <Field label="Роль"><Badge type="secondary">{roleLabel(user)}</Badge></Field>
                <Field label="Телефон">{user.phone || '—'}</Field>
                <Field label="Email">{user.email || '—'}</Field>
            </Section>

            {/* Onboarding */}
            <Section title="Регистрация">
                <Field label="Класс">
                    {user.grade != null ? `${user.grade} класс` : '—'}
                </Field>
                <Field label="Предметы для ЕНТ">
                    {user.allowed_subject_ids?.length
                        ? user.allowed_subject_ids.join(', ')
                        : '—'}
                </Field>
                <Field label="Дата регистрации">{formatDate(user.created_at)}</Field>
                {user.updated_at && (
                    <Field label="Последнее обновление">{formatDate(user.updated_at)}</Field>
                )}
            </Section>

            {/* Subscription */}
            <Section title="Подписка">
                <Field label="Тариф">
                    <Badge type={user.plan === 'PRO' ? 'primary' : 'secondary'}>
                        {user.plan || 'FREE'}
                    </Badge>
                </Field>
                <Field label="Trial использован">
                    {user.used_trial ? 'Да' : 'Нет'}
                </Field>
                <Field label="Подписка действует до">
                    {formatDate(user.subscription_end)}
                </Field>
                <Field label="Авто-продление отменено">
                    {user.subscription_cancelled ? 'Да' : 'Нет'}
                </Field>
            </Section>

            {/* Engagement */}
            <Section title="Активность">
                <Field label="Текущий стрик">
                    {user.attendance_streak_days > 0
                        ? `${user.attendance_streak_days} дн. подряд`
                        : '—'}
                </Field>
                <Field label="Всего бонусных очков (посещаемость)">
                    {user.attendance_total_points ?? 0}
                </Field>
                <Field label="Очки рейтинга">
                    {user.points ?? 0}
                </Field>
                <Field label="Место в рейтинге">
                    {user.rank ? `#${user.rank}` : '—'}
                </Field>
            </Section>

            {/* System */}
            <Section title="Системное">
                <Field label="ID">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {user.id}
                    </code>
                </Field>
            </Section>
        </div>
    )
}

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import { Eye, Lock, RefreshCw, Unlock, Users as UsersIcon } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'

// Mirrors backend UserDTO (auth/dtos/users.py). Mobile-app-only fields
// (subscription_cancelled, attendance_*) are typed but not always shown
// in the table — they live in the detail page.
interface User {
    id: string
    username: string
    name: string
    email: string | null
    phone: string | null
    is_active: boolean
    roles: string[]
    role?: 'parent' | 'child' | 'user' | string
    allowed_subject_ids: number[]
    grade: number | null
    plan: 'FREE' | 'PRO' | string
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

// Filter dropdown values map 1:1 to roles persisted in Keycloak. The
// "all" option simply omits the role query-param so backend returns
// every user. "child" is the registration-time role for students
// (matches the "Я ученик" branch of the onboarding flow).
const ROLE_OPTIONS = [
    { value: '', label: 'Все роли' },
    { value: 'child', label: 'Ученики' },
    { value: 'parent', label: 'Родители' },
    { value: 'teacher', label: 'Учителя' },
    { value: 'admin', label: 'Администраторы' },
]

const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    } catch {
        return '—'
    }
}

const roleLabel = (user: User): string => {
    // Prefer backend-computed `role` if present; otherwise derive from
    // raw `roles` list. Keeps the UI honest even if the backend ever
    // stops emitting the computed field.
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

export const UserList: React.FC = () => {
    const navigate = useNavigate()
    const { users, loading, fetchUsers, refreshUsers, updateUser } = useUserStore()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({ role: '', search: '' })

    useEffect(() => {
        fetchUsers(filters)
    }, [filters, fetchUsers])

    const handleRefresh = useCallback(() => {
        refreshUsers(filters)
    }, [refreshUsers, filters])

    const handleFilterChange = useCallback((key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }, [])

    const handleResetFilters = useCallback(() => {
        setFilters({ role: '', search: '' })
        setCurrentPage(1)
    }, [])

    const handleView = useCallback((user: User) => {
        navigate(`/users/${user.id}`)
    }, [navigate])

    // Single source of truth for the block/unblock toggle. Hits the
    // existing PATCH /admin/users/{id} with {is_active}; AdminUserUpdateDTO
    // already accepts the field, so no backend change is required.
    const handleToggleActive = useCallback(async (user: User) => {
        const next = !user.is_active
        try {
            await updateUser(user.id, { is_active: next })
            toast.success(
                next
                    ? `Пользователь "${user.name}" разблокирован`
                    : `Пользователь "${user.name}" заблокирован`,
            )
            await refreshUsers(filters)
        } catch {
            toast.error('Не удалось изменить статус')
        }
    }, [updateUser, refreshUsers, filters])

    const totalRecords = users.length
    const totalPages = Math.ceil(totalRecords / pageSize) || 1
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return users.slice(start, start + pageSize)
    }, [users, currentPage, pageSize])

    const columns = [
        {
            header: 'Имя',
            accessor: 'name',
            width: '18%',
            render: (value: string) => (
                <span className="font-medium text-gray-900">{value || '—'}</span>
            ),
        },
        {
            header: 'Телефон',
            accessor: 'phone',
            width: '14%',
            render: (value: string | null) => value || '—',
        },
        {
            header: 'Роль',
            accessor: 'roles',
            width: '10%',
            render: (_: any, item: User) => (
                <Badge type="secondary">{roleLabel(item)}</Badge>
            ),
        },
        {
            header: 'Класс',
            accessor: 'grade',
            width: '7%',
            render: (value: number | null) => (value != null ? `${value} кл.` : '—'),
        },
        {
            header: 'Подписка',
            accessor: 'plan',
            width: '10%',
            render: (value: string) => (
                <Badge type={value === 'PRO' ? 'primary' : 'secondary'}>
                    {value || 'FREE'}
                </Badge>
            ),
        },
        {
            header: 'Стрик',
            accessor: 'attendance_streak_days',
            width: '7%',
            render: (value: number) => (value > 0 ? `${value} дн.` : '—'),
        },
        {
            header: 'Очки',
            accessor: 'points',
            width: '7%',
            render: (value: number) => value ?? 0,
        },
        {
            header: 'Регистрация',
            accessor: 'created_at',
            width: '10%',
            render: (value: string) => formatDate(value),
        },
        {
            header: 'Статус',
            accessor: 'is_active',
            width: '8%',
            render: (value: boolean) => (
                <Badge type={value ? 'success' : 'error'}>
                    {value ? 'Активен' : 'Заблокирован'}
                </Badge>
            ),
        },
        {
            header: 'Действия',
            accessor: 'id',
            width: '9%',
            render: (_: string, item: User) => (
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(item)}
                        icon={<Eye className="h-4 w-4" />}
                        title="Открыть карточку"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                        icon={
                            item.is_active
                                ? <Lock className="h-4 w-4 text-red-500" />
                                : <Unlock className="h-4 w-4 text-green-600" />
                        }
                        title={item.is_active ? 'Заблокировать' : 'Разблокировать'}
                    />
                </div>
            ),
        },
    ]

    const filterConfig = {
        search: { placeholder: 'Поиск по имени, email...' },
        selects: [
            {
                key: 'role',
                label: 'Роль',
                icon: UsersIcon,
                options: ROLE_OPTIONS,
                multiple: false,
                placeholder: 'Все роли',
            },
        ],
    }

    return (
        <ListContainer>
            <ListHeader
                title="Пользователи"
                filterDisplayText={
                    filters.search
                        ? `поиск: "${filters.search}"`
                        : filters.role
                        ? `роль: ${ROLE_OPTIONS.find(o => o.value === filters.role)?.label}`
                        : null
                }
                actionButtons={[]}
            >
                <Button
                    variant="secondary"
                    onClick={handleRefresh}
                    disabled={loading}
                    icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                    {loading ? 'Загрузка...' : 'Обновить'}
                </Button>
            </ListHeader>

            <SimpleFilter
                title="Фильтры"
                filters={filters}
                filterConfig={filterConfig}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                loading={loading}
                activeFiltersCount={
                    (filters.search ? 1 : 0) + (filters.role ? 1 : 0)
                }
            />

            <ListTable
                data={paginatedUsers}
                columns={columns}
                loading={loading}
                emptyMessage="Пользователи не найдены"
                selectable={false}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalRecords={totalRecords}
            />
        </ListContainer>
    )
}

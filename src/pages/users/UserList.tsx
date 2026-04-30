import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Users, Trash2 } from 'lucide-react'
import { ListContainer } from '@/components/lists/ListContainer'
import { ListHeader } from '@/components/lists/ListHeader'
import { ListTable } from '@/components/lists/ListTable'
import { DeleteConfirmation } from '@/components/lists/DeleteConfirmation'
import SimpleFilter from '@/components/common/SimpleFilter'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'

interface User
{
    id: string
    username: string
    name: string
    email: string | null
    phone: string | null
    is_active: boolean
    roles: string[]
    allowed_subject_ids: number[]
    created_at: string
}

export const UserList: React.FC = () =>
{
    const navigate = useNavigate()
    const { users, loading, fetchUsers, refreshUsers, deleteUser } = useUserStore()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [filters, setFilters] = useState({ role: 'teacher', search: '' })
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<User | null>(null)

    useEffect(() =>
    {
        fetchUsers(filters)
    }, [filters, fetchUsers])

    const handleRefresh = useCallback(() =>
    {
        refreshUsers(filters)
    }, [refreshUsers, filters])

    const handleFilterChange = useCallback((key: string, value: any) =>
    {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }, [])

    const handleResetFilters = useCallback(() =>
    {
        setFilters({ role: 'teacher', search: '' })
        setCurrentPage(1)
    }, [])

    const handleCreate = useCallback(() =>
    {
        navigate('/users/create')
    }, [navigate])

    const handleEdit = useCallback((user: User) =>
    {
        navigate(`/users/${user.id}/edit`)
    }, [navigate])

    const handleDeleteClick = useCallback((user: User) =>
    {
        setUserToDelete(user)
        setDeleteConfirmOpen(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () =>
    {
        if (!userToDelete) return
        try
        {
            await deleteUser(userToDelete.id)
            toast.success(`Пользователь "${userToDelete.name}" удалён`)
            await refreshUsers(filters)
            setDeleteConfirmOpen(false)
            setUserToDelete(null)
        } catch (error)
        {
            toast.error('Ошибка при удалении')
        }
    }, [userToDelete, deleteUser, refreshUsers, filters])

    const filteredUsers = users

    const totalRecords = filteredUsers.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginatedUsers = useMemo(() =>
    {
        const start = (currentPage - 1) * pageSize
        return filteredUsers.slice(start, start + pageSize)
    }, [filteredUsers, currentPage, pageSize])

    const columns = [
        {
            header: 'Имя',
            accessor: 'name',
            width: '20%',
            render: (value: string) => (
                <span className="font-medium text-gray-900">{value}</span>
            )
        },
        {
            header: 'Username',
            accessor: 'username',
            width: '15%',
        },
        {
            header: 'Email',
            accessor: 'email',
            width: '20%',
            render: (value: string | null) => value || '—'
        },
        {
            header: 'Телефон',
            accessor: 'phone',
            width: '15%',
            render: (value: string | null) => value || '—'
        },
        {
            header: 'Предметы',
            accessor: 'allowed_subject_ids',
            width: '15%',
            render: (value: number[]) => `${value.length} предметов`
        },
        {
            header: 'Статус',
            accessor: 'is_active',
            width: '10%',
            render: (value: boolean) => (
                <Badge type={value ? 'success' : 'secondary'}>
                    {value ? 'Активен' : 'Неактивен'}
                </Badge>
            )
        },
        {
            header: 'Действия',
            accessor: 'id',
            width: '5%',
            render: (value: string, item: User) => (
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        icon={<Users className="h-4 w-4" />}
                        title="Редактировать"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(item)}
                        icon={<Trash2 className="h-4 w-4 text-red-500" />}
                        title="Удалить"
                    />
                </div>
            )
        }
    ]

    const filterConfig = {
        search: { placeholder: 'Поиск по имени, email...' },
        selects: [
            {
                key: 'role',
                label: 'Роль',
                icon: Users,
                options: [
                    { value: 'teacher', label: 'Учителя' },
                    { value: 'admin', label: 'Администраторы' }
                ],
                multiple: false,
                placeholder: 'Выберите роль'
            }
        ]
    }

    return (
        <ListContainer>
            <ListHeader
                title="Управление учителями"
                filterDisplayText={filters.search ? `поиск: "${filters.search}"` : null}
                actionButtons={[
                    {
                        label: 'Создать учителя',
                        onClick: handleCreate,
                        icon: Plus,
                        variant: 'primary',
                        disabled: loading
                    }
                ]}
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
                activeFiltersCount={filters.search ? 1 : 0}
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

            <DeleteConfirmation
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Удаление пользователя"
                message={`Вы уверены, что хотите удалить пользователя "${userToDelete?.name}"?`}
                isLoading={loading}
            />
        </ListContainer>
    )
}
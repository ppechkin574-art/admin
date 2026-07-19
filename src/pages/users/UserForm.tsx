import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subjectService } from '@/services/api'
import { useUserStore } from '@/stores/userStore'
import toast from 'react-hot-toast'
import { DetailContent } from '@/components/details/DetailContent'
import { DetailHeader } from '@/components/details/DetailHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import { MultiSelect } from '@/components/common/MultiSelect'
import Modal from '@/components/common/Modal'
import AlertModal from '@/components/common/AlertModal'
import { Copy, Check } from 'lucide-react'

interface Subject
{
    id: number
    name: string
}

export const UserForm: React.FC = () =>
{
    const { id } = useParams()
    const navigate = useNavigate()
    const isEditing = !!id

    const { fetchUserById, createUser, updateUser, loading: storeLoading } = useUserStore()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null)
    const [copied, setCopied] = useState<'login' | 'password' | null>(null)
    const [pendingCreateData, setPendingCreateData] = useState<any>(null)

    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'teacher',
        allowed_subject_ids: [] as number[],
        is_active: true,
    })

    useEffect(() =>
    {
        const loadSubjects = async () =>
        {
            try
            {
                const response = await subjectService.getAll()
                setSubjects(response.data)
            } catch (error)
            {
                toast.error('Не удалось загрузить предметы')
            }
        }
        loadSubjects()
    }, [])

    useEffect(() =>
    {
        if (isEditing && id)
        {
            const loadUser = async () =>
            {
                setLoading(true)
                try
                {
                    const user = await fetchUserById(id)
                    setFormData({
                        username: user.username,
                        name: user.name,
                        email: user.email || '',
                        phone: user.phone || '',
                        password: '',
                        role: user.roles.includes('admin') ? 'admin' : 'teacher',
                        allowed_subject_ids: user.allowed_subject_ids || [],
                        is_active: user.is_active,
                    })
                } catch (error)
                {
                    toast.error('Ошибка загрузки пользователя')
                } finally
                {
                    setLoading(false)
                }
            }
            loadUser()
        }
    }, [isEditing, id, fetchUserById])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    {
        const { name, value, type } = e.target
        if (type === 'checkbox')
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
        else
            setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubjectChange = (values: string[]) =>
    {
        setFormData(prev => ({
            ...prev,
            allowed_subject_ids: values.map(v => parseInt(v))
        }))
    }

    const validateForm = (): boolean =>
    {
        if (!formData.name.trim())
        {
            toast.error('Введите имя')
            return false
        }
        if (formData.email && !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(formData.email))
        {
            toast.error('Введите корректный email')
            return false
        }
        if (formData.phone && !/^\+77[0-9]{9}$/.test(formData.phone))
        {
            toast.error('Телефон должен быть в формате +77001234567')
            return false
        }
        if (formData.password && formData.password.length < 6)
        {
            toast.error('Пароль должен содержать не менее 6 символов')
            return false
        }
        return true
    }

    const buildSubmitData = () => ({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role: formData.role,
        allowed_subject_ids: formData.role === 'teacher' ? formData.allowed_subject_ids : [],
        is_active: formData.is_active,
        ...(formData.username.trim() ? { username: formData.username } : {}),
        ...(formData.password.trim() ? { password: formData.password } : {}),
    } as any)

    const saveUser = async (submitData: any) =>
    {
        setSaving(true)
        try
        {
            if (isEditing)
            {
                await updateUser(id!, submitData)
                toast.success('Пользователь обновлён')
                navigate('/users')
            } else
            {
                const response = await createUser(submitData)
                toast.success('Пользователь создан')
                setCreatedCredentials({
                    username: response.username,
                    password: response.generated_password || submitData.password || '(сгенерирован)',
                })
                setShowCredentialsModal(true)
            }
        } catch (error: any)
        {
            let errorMessage = 'Ошибка сохранения'
            if (error.response?.data?.detail)
            {
                const detail = error.response.data.detail
                if (Array.isArray(detail))
                    errorMessage = detail.map((err: any) => err.msg).join(', ')
                else if (typeof detail === 'string')
                    errorMessage = detail
                else
                    errorMessage = JSON.stringify(detail)
            } else if (error.message)
            {
                errorMessage = error.message
            }
            toast.error(errorMessage)
        } finally
        {
            setSaving(false)
        }
    }

    // Creating a new admin-panel account is the one path here worth an
    // extra "are you sure" — editing an existing user isn't gated, it's
    // already scoped/reviewable via its own detail page.
    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault()
        if (!validateForm()) return

        const submitData = buildSubmitData()
        if (isEditing) { await saveUser(submitData); return }
        setPendingCreateData(submitData)
    }

    const confirmCreate = async () =>
    {
        if (!pendingCreateData) return
        await saveUser(pendingCreateData)
        setPendingCreateData(null)
    }

    const handleCopy = (text: string, type: 'login' | 'password') =>
    {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleCloseModal = () =>
    {
        setShowCredentialsModal(false)
        navigate('/users')
    }

    const subjectOptions = useMemo(() =>
    {
        return subjects.map(s => ({ value: s.id.toString(), label: s.name }))
    }, [subjects])

    const isTeacher = formData.role === 'teacher'

    const isLoading = storeLoading || loading

    if (isLoading && isEditing)
        return (
            <DetailContent>
                <LoadingSpinner />
            </DetailContent>
        )

    return (
        <DetailContent>
            <DetailHeader
                title={isEditing ? 'Редактирование пользователя' : 'Создание пользователя'}
                onBack={() => navigate('/users')}
                showDelete={false}
                showEdit={false}
            />
            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username {!isEditing && '(оставьте пустым для автогенерации)'}
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                disabled={isEditing}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="example@domain.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+77001234567"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isEditing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль (оставьте пустым для автогенерации)'}
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="teacher">Учитель</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Разрешённые предметы</label>
                            <MultiSelect
                                value={formData.allowed_subject_ids.map(id => id.toString())}
                                options={subjectOptions}
                                onChange={handleSubjectChange}
                                placeholder="Выберите предметы"
                                disabled={!isTeacher}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" onClick={() => navigate('/users')}>
                            Отмена
                        </Button>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </div>

            {showCredentialsModal && (
                <Modal
                    isOpen={showCredentialsModal}
                    onClose={handleCloseModal}
                    title="Пользователь создан"
                >
                    <div className="p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Логин</label>
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <span className="font-mono text-sm">{createdCredentials?.username}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(createdCredentials!.username, 'login')}
                                        className="text-gray-400 hover:text-primary-600"
                                    >
                                        {copied === 'login' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Пароль</label>
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <span className="font-mono text-sm">{createdCredentials?.password}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(createdCredentials!.password, 'password')}
                                        className="text-gray-400 hover:text-primary-600"
                                    >
                                        {copied === 'password' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 mt-4">
                            Данные для входа нового пользователя. Они <b>доступны</b> только <b>один раз</b>. Обязательно <b>сохраните их</b>!
                        </p>
                        <div className="mt-6 flex justify-end">
                            <Button variant="primary" onClick={handleCloseModal}>
                                Понятно
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            <AlertModal
                isOpen={!!pendingCreateData}
                onClose={() => setPendingCreateData(null)}
                icon="caution"
                title="Важное действие"
                message={`Вы собираетесь создать аккаунт "${formData.name}". Проверьте данные ещё раз перед созданием — если что-то не понятно, уточните у главного администратора.`}
                onConfirm={confirmCreate}
                confirmText="Создать"
                cancelText="Отмена"
                isLoading={saving}
            />
        </DetailContent>
    )
}
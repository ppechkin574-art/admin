import { useState } from "react";
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import { LogOut, User, Menu, X, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { menuItemsGen2, menuItemsGen1 } from '@/constants/sidebarContent'

const Header = () =>
{
    const { user, logout, isAuthenticated } = useKeycloakAuth()
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [gen2Open, setGen2Open] = useState(true)
    const [gen1Open, setGen1Open] = useState(true)

    const handleLogout = async () =>
    {
        await logout()
        navigate('/login')
    }

    const username = `${user?.preferred_username || ''}`

    return (
        <>
            <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white shadow-sm border-b border-gray-200 z-40">
                <div className="flex justify-between items-center px-4 py-4 sm:px-6 lg:px-8">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1 lg:flex-none" />

                    {isAuthenticated && (
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    {username ? (
                                        <User className="h-5 w-5 text-primary-600" />
                                    ) : (
                                        ""
                                    )}
                                </div>
                                <div className="hidden md:block">
                                    <div className="text-sm font-medium text-gray-900">
                                        {username || 'Пользователь'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user?.realm_access?.roles?.filter(role =>
                                            role === 'user' || role === 'admin' || role === 'teacher'
                                        ).join(', ')}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
                                title="Выйти"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-gray-600 bg-opacity-75"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                <span className="sr-only">Закрыть меню</span>
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>

                        <div className="flex items-center h-16 px-6 border-b border-gray-200">
                            <img src="/images/lumi.svg" alt="Lumi" className="h-8 w-8" />
                            <span className="ml-3 text-xl font-bold text-primary-600">Lumi Admin</span>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-1">
                            {isAuthenticated ? (
                                <nav className="flex-1 px-4 py-4 overflow-y-auto">
                                    <div className="mb-4">
                                        <button
                                            onClick={() => setGen2Open(!gen2Open)}
                                            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                                        >
                                            <span>Новый функционал</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${gen2Open ? 'rotate-180' : ''}`} />
                                        </button>
                                        {gen2Open && (
                                            <div className="mt-1 space-y-1">
                                                {menuItemsGen2.map(renderNavLink)}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => setGen1Open(!gen1Open)}
                                            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                                        >
                                            <span>Существующие разделы</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${gen1Open ? 'rotate-180' : ''}`} />
                                        </button>
                                        {gen1Open && (
                                            <div className="mt-1 space-y-1">
                                                {menuItemsGen1.map(renderNavLink)}
                                            </div>
                                        )}
                                    </div>
                                </nav>
                            ) : (
                                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    Войдите в систему, чтобы увидеть меню
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </>
    )
}

export default Header
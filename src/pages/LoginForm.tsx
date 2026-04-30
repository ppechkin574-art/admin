import LoadingSpinner from '@/components/common/LoadingSpinner'
import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useKeycloakAuth } from '../hooks/useKeycloakAuth'
import { Shield, AlertCircle } from 'lucide-react'

const LoginForm: React.FC = () =>
{
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { isInitialized, isAuthenticated, login } = useKeycloakAuth()

    if (isInitialized && isAuthenticated)
        return <Navigate to="/modules" replace />

    const handleKeycloakLogin = async () =>
    {
        try
        {
            setIsLoading(true)
            setError(null)
            await login()
        } catch (error)
        {
            console.error('❌ Keycloak login error:', error)
            setError('Ошибка входа. Пожалуйста, попробуйте снова.')
            setIsLoading(false)
        }
    }

    if (!isInitialized)
        return (
            <div className="bg-gray-100 flex items-center justify-center">
                <LoadingSpinner size="lg" message="Проверка аутентификации..." />
            </div>
        )

    return (
        <div className="bg-gray-100 flex items-center justify-center h-screen">
            <div className="w-full max-w-md h-full flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                            <img
                                src="/images/maskot.png"
                                alt="Lumi"
                                className="h-10 w-9 brightness-0 invert"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Lumi Admin</h1>
                    </div>

                    <div className="p-6">
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Добро пожаловать
                            </h2>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleKeycloakLogin}
                            disabled={isLoading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" message="" />
                                    <span>Вход...</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="h-5 w-5" />
                                    <span>Войти</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginForm
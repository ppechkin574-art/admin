import { FC } from 'react'
import { Navigate } from 'react-router-dom'
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps
{
    children: React.ReactNode
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) =>
{
    const { isInitialized, isAuthenticated } = useKeycloakAuth()

    if (!isInitialized)
        return (
            <div className={'app-loading'}>
                <LoadingSpinner size="lg" message="Загрузка приложения..." />
            </div>
        )

    if (!isAuthenticated)
        return <Navigate to="/login" replace />

    return <>{children}</>
}

export default ProtectedRoute
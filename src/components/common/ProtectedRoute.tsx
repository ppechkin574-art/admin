import { FC } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import { isMarketingPath } from '@/constants/sidebarContent'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps
{
    children: React.ReactNode
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) =>
{
    const { isInitialized, isAuthenticated, isMarketingOnly, isManagerOnly } = useKeycloakAuth()
    const location = useLocation()

    if (!isInitialized)
        return (
            <div className={'app-loading'}>
                <LoadingSpinner size="lg" message="Загрузка приложения..." />
            </div>
        )

    if (!isAuthenticated)
        return <Navigate to="/login" replace />

    // Marketing-only users (role `marketing`, NOT `admin`) may visit ONLY
    // the marketing routes. Any other path — including the "/" landing —
    // redirects them to /marketing. Admins are unrestricted.
    if (isMarketingOnly && !isMarketingPath(location.pathname))
        return <Navigate to="/marketing" replace />

    // Manager users have full access except /admin/app-settings.
    if (isManagerOnly && location.pathname.startsWith('/admin/app-settings'))
        return <Navigate to="/modules" replace />

    return <>{children}</>
}

export default ProtectedRoute

import { FC } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps
{
    children: React.ReactNode
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) =>
{
    const { isInitialized, isAuthenticated, isManagerOnly } = useKeycloakAuth()
    const location = useLocation()

    if (!isInitialized)
        return (
            <div className={'app-loading'}>
                <LoadingSpinner size="lg" message="Загрузка приложения..." />
            </div>
        )

    if (!isAuthenticated)
        return <Navigate to="/login" replace />

    // Marketing-only users see every page (read access is opened up on the
    // backend too, see allow_read_or_admin_write) — write actions are
    // blocked per-request by the axios interceptor + NoPermissionModal,
    // not by hiding routes. See services/api.ts.

    // Manager users have full access except /admin/app-settings.
    if (isManagerOnly && location.pathname.startsWith('/admin/app-settings'))
        return <Navigate to="/crm" replace />

    return <>{children}</>
}

export default ProtectedRoute

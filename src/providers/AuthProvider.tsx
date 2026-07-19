import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react'
import keycloak, { safeUpdateToken } from '@/services/keycloak'
import { useAuthStore } from '@/stores/authStore'

type AuthContextValue = {
    isInitialized: boolean
    isAuthenticated: boolean
    user: any | null
    token: string | null
    /** Realm roles from the JWT (`realm_access.roles`). */
    roles: string[]
    /** True when the user has the `admin` realm role (full access). */
    isAdmin: boolean
    /**
     * True when the user has the `marketing` role but NOT `admin`.
     * These users are restricted to the marketing sections only.
     */
    isMarketingOnly: boolean
    /**
     * True when the user has the `manager` role but NOT `admin`.
     * These users have access to all sections except /admin/app-settings.
     */
    isManagerOnly: boolean
    login: () => Promise<void>
    logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) =>
{
    const [isInitialized, setIsInitialized] = useState(false)
    const { isAuthenticated, user, token } = useAuthStore()
    const initRef = useRef(false);

    const storeLogin = useAuthStore(state => state.login);
    const storeLogout = useAuthStore(state => state.logout);

    useEffect(() =>
    {
        if (initRef.current) return;
        initRef.current = true;

        let mounted = true

        const initializeAuth = async () =>
        {
            try
            {
                const authenticated = await keycloak.init({
                    onLoad: 'check-sso',
                    pkceMethod: 'S256',
                    checkLoginIframe: false,
                })

                if (!mounted) return

                if (authenticated && keycloak.token && keycloak.tokenParsed)
                    storeLogin(keycloak.tokenParsed, keycloak.token)
                else
                    storeLogout()
            } catch (error)
            {
                storeLogout()
            } finally
            {
                if (mounted)
                {
                    setTimeout(() =>
                    {
                        setIsInitialized(true)
                    }, 100)
                }
            }
        }

        initializeAuth()

        // safeUpdateToken (services/keycloak.ts) is the app-wide single-flight
        // refresh with built-in retries — shared with the api.ts 401-handler,
        // so two flows can never burn the same single-use refresh token.
        // A single failed refresh no longer logs the user out (network blips,
        // Keycloak restarts): only 3 consecutive definitive failures do.
        let consecutiveFailures = 0
        const refreshToken = async () =>
        {
            if (!keycloak.authenticated) return
            const ok = await safeUpdateToken(120)
            if (ok)
            {
                consecutiveFailures = 0
                if (keycloak.token && keycloak.tokenParsed)
                    storeLogin(keycloak.tokenParsed, keycloak.token)
            } else
            {
                consecutiveFailures += 1
                if (consecutiveFailures >= 3) storeLogout()
            }
        }

        // onTokenExpired is a safety net only; the interval below fires first.
        keycloak.onTokenExpired = refreshToken

        // Proactively check every 30 s — fires well before the 120-s expiry window.
        const refreshInterval = setInterval(refreshToken, 30_000)

        // Browsers freeze JS timers in background tabs (Chrome: ≥1 min throttle).
        // When the user switches back to this tab, immediately check and refresh
        // the token — prevents logout after the tab was in background for 5+ min.
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshToken()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () =>
        {
            mounted = false
            clearInterval(refreshInterval)
            document.removeEventListener('visibilitychange', onVisible)
            try { keycloak.onTokenExpired = undefined } catch (e) { }
        }
    }, [storeLogin, storeLogout])

    const login = async () =>
    {
        try
        {
            await keycloak.login({
                redirectUri: window.location.origin + '/crm'
            })
        } catch (error)
        {
            throw error
        }
    }

    const logout = () =>
        keycloak.logout({ redirectUri: window.location.origin + '/login' })

    // Realm roles come from the parsed JWT (`realm_access.roles`), which
    // the auth store persists as `user`. Falls back to the live keycloak
    // instance so role info is available even before the store rehydrates.
    const roles: string[] =
        (user?.realm_access?.roles as string[] | undefined) ??
        (keycloak.tokenParsed?.realm_access?.roles as string[] | undefined) ??
        []
    const isAdmin = roles.includes('admin')
    const isMarketingOnly = roles.includes('marketing') && !isAdmin
    const isManagerOnly = roles.includes('manager') && !isAdmin

    const value: AuthContextValue = {
        isInitialized,
        isAuthenticated,
        user,
        token,
        roles,
        isAdmin,
        isMarketingOnly,
        isManagerOnly,
        login,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider

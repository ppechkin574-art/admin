import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react'
import keycloak from '@/services/keycloak'
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

        // Guard against concurrent refresh calls: Keycloak's refreshTokenMaxReuse=0
        // means the same refresh token can't be used twice. If onTokenExpired and
        // the interval fire at the same moment, the second call uses a revoked
        // refresh token → 401 → logout. Single shared lock prevents this.
        let refreshing = false
        const refreshToken = async () =>
        {
            if (!keycloak.authenticated || refreshing) return
            refreshing = true
            try
            {
                // minValidity=120: refresh if the access token expires within 120 s.
                // Gives a 2-minute buffer to handle clock skew between client and
                // Keycloak server, preventing "just missed" expiry → 401 → logout.
                const refreshed = await keycloak.updateToken(120)
                if (refreshed && keycloak.token && keycloak.tokenParsed)
                    storeLogin(keycloak.tokenParsed, keycloak.token)
            } catch (error)
            {
                storeLogout()
            } finally
            {
                refreshing = false
            }
        }

        // onTokenExpired is a safety net only; the interval below fires first.
        keycloak.onTokenExpired = refreshToken

        // Proactively check every 55 s — for a 5-min access token this triggers
        // a refresh at ~4 m 05 s (when < 60 s remain), long before expiry.
        const refreshInterval = setInterval(refreshToken, 55_000)

        return () =>
        {
            mounted = false
            clearInterval(refreshInterval)
            try { keycloak.onTokenExpired = undefined } catch (e) { }
        }
    }, [storeLogin, storeLogout])

    const login = async () =>
    {
        try
        {
            await keycloak.login({
                redirectUri: window.location.origin + '/modules'
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

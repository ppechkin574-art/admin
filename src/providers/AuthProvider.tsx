import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react'
import keycloak from '@/services/keycloak'
import { useAuthStore } from '@/stores/authStore'

type AuthContextValue = {
    isInitialized: boolean
    isAuthenticated: boolean
    user: any | null
    token: string | null
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

        const onTokenExpiredHandler = async () =>
        {
            try
            {
                const refreshed = await keycloak.updateToken(30)
                if (refreshed && keycloak.token && keycloak.tokenParsed)
                    storeLogin(keycloak.tokenParsed, keycloak.token)
            } catch (error)
            {
                storeLogout()
            }
        }

        keycloak.onTokenExpired = onTokenExpiredHandler

        return () =>
        {
            mounted = false
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

    const value: AuthContextValue = {
        isInitialized,
        isAuthenticated,
        user,
        token,
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

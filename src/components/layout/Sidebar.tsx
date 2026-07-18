import { NavLink } from 'react-router-dom'
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import { menuItemsGen2, menuItemsGen1 } from '@/constants/sidebarContent'
import { ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { securityService } from '@/services/api'

const Sidebar = () =>
{
  const { isAuthenticated } = useKeycloakAuth()
  const [gen2Open, setGen2Open] = useState(true)
  const [gen1Open, setGen1Open] = useState(true)
  const [securityBadge, setSecurityBadge] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchBadge = async () => {
      try {
        const overview = await securityService.getOverview()
        setSecurityBadge(overview?.open_events ?? 0)
      } catch {
        // badge is best-effort — don't crash sidebar
      }
    }
    fetchBadge()
    const interval = setInterval(fetchBadge, 60_000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Everyone sees the full sidebar — marketing-only accounts get the same
  // navigation as admin/manager. Write actions are blocked per-request by
  // the axios interceptor + NoPermissionModal, not by hiding sections.
  const gen2Items = menuItemsGen2
  const gen1Items = menuItemsGen1

  const renderNavLink = (item: { label: string; href: string; icon: any }) =>
  {
    const Icon = item.icon
    const isSecurity = item.href === '/security'
    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/'}
        className={({ isActive }) =>
          `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`
        }
      >
        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {isSecurity && securityBadge > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {securityBadge > 99 ? '99+' : securityBadge}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30 lg:border-r lg:border-gray-200 lg:bg-white">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <img src="/images/logo.png" alt="AIMA" className="h-8 w-8" />
          <span className="text-xl font-bold text-primary-600">AIMA Admin</span>
        </div>
      </div>

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
                {gen2Items.map(renderNavLink)}
              </div>
            )}
          </div>

          {gen1Items.length > 0 && (
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
                  {gen1Items.map(renderNavLink)}
                </div>
              )}
            </div>
          )}
        </nav>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}

export default Sidebar

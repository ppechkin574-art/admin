import { NavLink } from 'react-router-dom'
import { useKeycloakAuth } from '@/hooks/useKeycloakAuth'
import { menuItemsGen2, menuItemsGen1 } from '@/constants/sidebarContent'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const Sidebar = () =>
{
  const { isAuthenticated } = useKeycloakAuth()
  const [gen2Open, setGen2Open] = useState(true)
  const [gen1Open, setGen1Open] = useState(true)

  const renderNavLink = (item: { label: string; href: string; icon: any }) =>
  {
    const Icon = item.icon
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
        {item.label}
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
        <div className="flex-1" />
      )}
    </div>
  )
}

export default Sidebar
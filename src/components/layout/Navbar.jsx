import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Home, Users, Receipt, User, LogOut, Sun, Moon } from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="bg-white dark:bg-dark-card shadow-md border-b dark:border-dark-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-dark-accent">
              Udhari Kitab
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-dark-accent/10 text-primary-700 dark:text-dark-accent font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
              {user?.name}
            </span>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-around border-t dark:border-dark-border py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                    isActive ? 'text-primary-600 dark:text-dark-accent' : 'text-gray-600 dark:text-gray-300'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

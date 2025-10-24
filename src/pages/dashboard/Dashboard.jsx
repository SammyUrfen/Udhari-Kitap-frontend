import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSmartPolling } from '../../hooks/useSmartPolling'
import { friendsService } from '../../services/friends'
import { expensesService } from '../../services/expenses'
import { activitiesService } from '../../services/activities'
import { formatCurrency, getBalanceText, getBalanceColor } from '../../utils/currency'
import { formatRelativeTime } from '../../utils/date'
import { Users, Receipt, TrendingUp, TrendingDown, Activity, DollarSign, Edit2, Trash2, RotateCcw, UserPlus, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalFriends: 0,
    totalExpenses: 0,
    totalYouOwe: 0,
    totalOwedToYou: 0,
    netBalance: 0,
  })
  const [recentExpenses, setRecentExpenses] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false)
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [hasMoreActivities, setHasMoreActivities] = useState(true)
  const ACTIVITIES_PER_PAGE = 5

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Smart polling - refresh data when new activity detected
  const { lastUpdateTime, isPolling, manualRefresh } = useSmartPolling({
    onNewActivity: (newActivity) => {
      // Cascade refresh all dashboard data
      fetchDashboardData()
      toast.info('Dashboard updated with new activity', { autoClose: 2000 })
    },
    enabled: true // Always enabled on dashboard
  })

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch friends and balances
      const friendsData = await friendsService.getFriends()
      const friendsList = friendsData.friends || []
      
      // Calculate balances - backend returns balance as object
      let youOwe = 0
      let owedToYou = 0
      const balancesList = friendsList.map((friend) => {
        // Access balance.amountInRupees from nested balance object
        const balanceAmount = friend.balance?.amountInRupees || 0
        const balanceStatus = friend.balance?.status || 'settled'
        
        if (balanceStatus === 'you_owe') {
          youOwe += Math.abs(balanceAmount)
        } else if (balanceStatus === 'owes_you') {
          owedToYou += Math.abs(balanceAmount)
        }
        
        return {
          friendId: friend.friend?.id, // Friend user ID for filtering
          friendName: friend.nickname || friend.friend?.name,
          balance: balanceAmount,
          status: balanceStatus,
        }
      })
      
      const netBalance = owedToYou - youOwe

      // Fetch recent expenses (only 3)
      const expensesData = await expensesService.getExpenses({ limit: 3 })
      
      // Fetch recent activities (first 5)
      const activitiesData = await activitiesService.getActivities({ 
        limit: ACTIVITIES_PER_PAGE,
        page: 1 
      })

      setStats({
        totalFriends: friendsList.length,
        totalExpenses: expensesData.total || 0,
        totalYouOwe: youOwe,
        totalOwedToYou: owedToYou,
        netBalance,
      })
      setRecentExpenses(expensesData.expenses || [])
      setRecentActivities(activitiesData.activities || [])
      setHasMoreActivities(activitiesData.activities?.length === ACTIVITIES_PER_PAGE)
      setActivitiesPage(1)
      setBalances(balancesList.filter((b) => b.balance !== 0))
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreActivities = async () => {
    try {
      setLoadingMoreActivities(true)
      const nextPage = activitiesPage + 1
      
      const activitiesData = await activitiesService.getActivities({ 
        limit: ACTIVITIES_PER_PAGE,
        page: nextPage 
      })

      const newActivities = activitiesData.activities || []
      
      if (newActivities.length > 0) {
        setRecentActivities(prev => [...prev, ...newActivities])
        setActivitiesPage(nextPage)
        setHasMoreActivities(newActivities.length === ACTIVITIES_PER_PAGE)
      } else {
        setHasMoreActivities(false)
      }
    } catch (error) {
      toast.error('Failed to load more activities')
      console.error('Load more activities error:', error)
    } finally {
      setLoadingMoreActivities(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-accent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's your expense summary
              <span className="text-xs ml-2 opacity-70">
                • Updated {formatRelativeTime(lastUpdateTime)}
              </span>
            </p>
          </div>
          <button
            onClick={manualRefresh}
            disabled={isPolling}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw size={20} className={isPolling ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Friends</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">
                {stats.totalFriends}
              </p>
            </div>
            <Users className="text-primary-600 dark:text-dark-accent" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">
                {stats.totalExpenses}
              </p>
            </div>
            <Receipt className="text-primary-600 dark:text-dark-accent" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">You Owe</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(stats.totalYouOwe)}
              </p>
            </div>
            <TrendingDown className="text-red-600 dark:text-red-400" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Owed to You</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.totalOwedToYou)}
              </p>
            </div>
            <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${
                stats.netBalance > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : stats.netBalance < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-900 dark:text-dark-text'
              }`}>
                {stats.netBalance >= 0 ? '+' : ''}{formatCurrency(stats.netBalance)}
              </p>
            </div>
            {stats.netBalance > 0 ? (
              <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
            ) : stats.netBalance < 0 ? (
              <TrendingDown className="text-red-600 dark:text-red-400" size={32} />
            ) : (
              <Receipt className="text-gray-600 dark:text-gray-400" size={32} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balances - Highest Owing/Owed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
              Top Balances
            </h2>
            <Link
              to="/friends"
              className="text-sm text-primary-600 dark:text-dark-accent hover:text-primary-700 dark:hover:text-green-400"
            >
              View All
            </Link>
          </div>
          {balances.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No balances yet</p>
          ) : (
            <div className="space-y-3">
              {/* Sort by absolute value and show top 3 balances */}
              {balances
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={index}
                    onClick={() => navigate(`/expenses?friend=${item.friendId}`)}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card cursor-pointer transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-dark-text">
                      {item.friendName}
                    </span>
                    <div className="text-right">
                      <span className={`font-semibold ${
                        item.balance > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : item.balance < 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {formatCurrency(Math.abs(item.balance))}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.balance > 0 ? 'owes you' : item.balance < 0 ? 'you owe' : 'settled'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
              Recent Expenses
            </h2>
            <Link
              to="/expenses"
              className="text-sm text-primary-600 dark:text-dark-accent hover:text-primary-700 dark:hover:text-green-400"
            >
              View All
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No expenses yet</p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id || expense._id}
                  onClick={() => navigate(`/expenses?expand=${expense.id || expense._id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-dark-text">
                      {expense.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Paid by {expense.payer?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-dark-text">
                      {formatCurrency(expense.amountInRupees || expense.amount / 100)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(expense.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-primary-600 dark:text-dark-accent" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Recent Activity
          </h2>
        </div>
        {recentActivities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => {
              // Determine activity icon based on type
              const getActivityIcon = () => {
                if (activity.type === 'EXPENSE_CREATED') return <Receipt size={20} className="text-blue-500" />
                if (activity.type === 'TRANSACTION_CREATED') return <DollarSign size={20} className="text-green-500" />
                if (activity.type === 'EXPENSE_UPDATED') return <Edit2 size={20} className="text-orange-500" />
                if (activity.type === 'EXPENSE_DELETED') return <Trash2 size={20} className="text-red-500" />
                if (activity.type === 'EXPENSE_RESTORED') return <RotateCcw size={20} className="text-purple-500" />
                if (activity.type === 'FRIEND_ADDED_YOU') return <UserPlus size={20} className="text-teal-500" />
                if (activity.type === 'YOU_ADDED_FRIEND') return <Users size={20} className="text-cyan-500" />
                return <Activity size={20} className="text-gray-500" />
              }

              // Determine if activity is clickable (expense or transaction related)
              const isClickable = activity.type?.includes('EXPENSE') || activity.type?.includes('TRANSACTION')
              
              // Extract IDs - they might be populated objects or just IDs
              const expenseIdRaw = activity.payload?.expenseId || activity.expenseId
              const transactionIdRaw = activity.payload?.transactionId || activity.transactionId
              
              // If they're objects (populated), extract the _id, otherwise use as is
              const expenseId = typeof expenseIdRaw === 'object' ? (expenseIdRaw?._id || expenseIdRaw?.id) : expenseIdRaw
              const transactionId = typeof transactionIdRaw === 'object' ? (transactionIdRaw?._id || transactionIdRaw?.id) : transactionIdRaw

              const handleActivityClick = () => {
                if (!isClickable) return
                
                // Navigate to expenses page with the expense/transaction ID
                if (expenseId) {
                  navigate(`/expenses?expand=${expenseId}`)
                } else if (transactionId) {
                  navigate(`/expenses?expand=${transactionId}`)
                }
              }

              return (
                <div
                  key={activity._id}
                  onClick={handleActivityClick}
                  className={`flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors ${
                    isClickable ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="mt-0.5">{getActivityIcon()}</div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-dark-text font-medium">
                      {activity.payload?.title || activity.message}
                    </p>
                    {activity.payload?.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {activity.payload.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatRelativeTime(activity.createdAt)}
                      {isClickable && <span className="ml-2 text-blue-600 dark:text-blue-400">• Click to view</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Load More Button */}
        {recentActivities.length > 0 && hasMoreActivities && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMoreActivities}
              disabled={loadingMoreActivities}
              className="px-6 py-2 bg-primary-600 dark:bg-dark-accent text-white rounded-lg hover:bg-primary-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMoreActivities ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

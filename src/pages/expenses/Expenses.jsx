import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSearchParams, useLocation } from 'react-router-dom'
import { expensesService } from '../../services/expenses'
import { friendsService } from '../../services/friends'
import { balancesService } from '../../services/balances'
import { formatCurrency } from '../../utils/currency'
import { formatDate } from '../../utils/date'
import { getErrorMessage } from '../../utils/errorHandler'
import {
  calculateEqualSplit,
  validateSplitSum,
  calculatePercentageSplit,
  validatePercentageSum,
  formatSplitSummary
} from '../../utils/splitCalculations'
import { toast } from 'react-toastify'
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  Filter,
  Search,
  UserPlus,
  UserMinus,
  DollarSign,
  Percent,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const Expenses = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [expenses, setExpenses] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [filterFriend, setFilterFriend] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false) // Default to hiding transactions
  const [expandedExpense, setExpandedExpense] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(true)
  const [expensesPage, setExpensesPage] = useState(1)
  const EXPENSES_PER_PAGE = 50

  // Get current user ID (could be _id or id)
  const currentUserId = user?._id || user?.id
  
  // Multi-friend expense form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    participants: [], // Array of { id, name, email, share, percentage }
    payer: null, // userId of who paid
    splitMethod: 'equal', // 'equal', 'unequal', 'percentage'
  })

  // Friend search state for adding participants
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [showFriendSearch, setShowFriendSearch] = useState(false)

  // Handle URL params on mount
  useEffect(() => {
    const friendParam = searchParams.get('friend')
    const expandParam = searchParams.get('expand')
    
    // If we have an expand param, prioritize showing that expense
    if (expandParam) {
      setExpandedExpense(expandParam)
      // Clear any friend filter to ensure the expense is visible
      setFilterFriend('')
    } else if (friendParam) {
      // Only set friend filter if there's no expand param
      setFilterFriend(friendParam)
    }
  }, [searchParams])

  // Check if we're navigating here to edit an expense
  useEffect(() => {
    if (location.state?.expenseId && expenses.length > 0) {
      const expenseToEdit = expenses.find(e => 
        (e._id === location.state.expenseId || e.id === location.state.expenseId)
      )
      if (expenseToEdit) {
        openEditModal(expenseToEdit)
        // Clear the state so it doesn't reopen on refresh
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, expenses])

  useEffect(() => {
    fetchData()
  }, [filterFriend, showDeleted, showTransactions])

  const fetchData = async (reset = true) => {
    try {
      setLoading(reset)
      
      // Fetch friends list
      const friendsData = await friendsService.getFriends()
      const friendsList = friendsData.friends || []
      setFriends(friendsList)

      // Fetch expenses with pagination
      const params = {
        limit: EXPENSES_PER_PAGE,
        page: reset ? 1 : expensesPage
      }
      if (showDeleted) params.includeDeleted = true
      if (showTransactions) params.includeTransactions = true

      const expensesData = await expensesService.getExpenses(params)
      
      if (reset) {
        setExpenses(expensesData.expenses || [])
        setExpensesPage(1)
      } else {
        setExpenses(prev => [...prev, ...(expensesData.expenses || [])])
      }
      
      setHasMoreExpenses(expensesData.hasMore || false)
    } catch (error) {
      console.error('Failed to load expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreExpenses = async () => {
    try {
      setLoadingMore(true)
      const nextPage = expensesPage + 1
      
      const params = {
        limit: EXPENSES_PER_PAGE,
        page: nextPage
      }
      if (showDeleted) params.includeDeleted = true
      if (showTransactions) params.includeTransactions = true

      const expensesData = await expensesService.getExpenses(params)
      const newExpenses = expensesData.expenses || []
      
      if (newExpenses.length > 0) {
        setExpenses(prev => [...prev, ...newExpenses])
        setExpensesPage(nextPage)
        setHasMoreExpenses(expensesData.hasMore || false)
      } else {
        setHasMoreExpenses(false)
      }
    } catch (error) {
      toast.error('Failed to load more expenses')
    } finally {
      setLoadingMore(false)
    }
  }

  // Client-side filtering of expenses by friend
  const filteredExpenses = useMemo(() => {
    if (!filterFriend) return expenses
    
    // Filter expenses and transactions where the friend is involved
    return expenses.filter(item => {
      if (item.type === 'transaction') {
        // For transactions, check if the friend is either 'from' or 'to'
        return item.from?._id === filterFriend || 
               item.from?.id === filterFriend ||
               item.to?._id === filterFriend || 
               item.to?.id === filterFriend
      } else {
        // For expenses, check if the friend is a participant
        return item.participants?.some(p => 
          p.user?._id === filterFriend || p.user?.id === filterFriend
        )
      }
    })
  }, [expenses, filterFriend])

  // Scroll to expanded item after data loads
  useEffect(() => {
    if (expandedExpense && !loading && filteredExpenses.length > 0) {
      // Wait a bit for render
      setTimeout(() => {
        const element = document.getElementById(`expense-${expandedExpense}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
    }
  }, [expandedExpense, loading, expenses, filteredExpenses])

  // Get filtered friend info to display
  const filteredFriendInfo = useMemo(() => {
    if (!filterFriend || friends.length === 0) return null
    
    const friendData = friends.find(f => f.friend?.id === filterFriend)
    return friendData
  }, [filterFriend, friends])

  // Filter friends for search (exclude already added participants)
  const availableFriends = useMemo(() => {
    const participantIds = new Set(formData.participants.map(p => p.id))
    // friend.friend.id contains the actual user ID (appears as friend_id2 in console)
    const available = friends.filter(f => !participantIds.has(f.friend?.id))
    return available
  }, [friends, formData.participants])

  // Filtered friends based on search query
  const filteredFriends = useMemo(() => {
    if (!friendSearchQuery) return availableFriends
    
    const query = friendSearchQuery.toLowerCase()
    return availableFriends.filter(f => 
      f.nickname?.toLowerCase().includes(query) ||
      f.friend?.name?.toLowerCase().includes(query) ||
      f.friend?.email?.toLowerCase().includes(query)
    )
  }, [availableFriends, friendSearchQuery])

  const openAddModal = () => {
    setEditingExpense(null)
    // Reset form data completely
    setFormData({
      title: '',
      amount: '',
      participants: [],
      payer: currentUserId, // Default payer is current user
      splitMethod: 'equal',
    })
    setFriendSearchQuery('')
    setShowFriendSearch(false)
    setShowModal(true)
  }

  const openEditModal = (expense) => {
    setEditingExpense(expense)
    
    // Convert expense data to form format
    // IMPORTANT: Filter out current user from participants since they're handled separately
    const expenseParticipants = expense.participants
      ?.filter(p => {
        const participantId = p.user?._id || p.user?.id
        return participantId !== currentUserId
      })
      .map(p => ({
        id: p.user?._id || p.user?.id,
        name: p.user?.name,
        email: p.user?.email,
        share: p.shareInRupees || (p.share / 100), // Convert from paise if needed
        percentage: 0 // Will be calculated if needed
      })) || []
    
    setFormData({
      title: expense.title,
      amount: expense.amountInRupees || (expense.amount / 100),
      participants: expenseParticipants,
      payer: expense.payer?._id || expense.payer?.id,
      splitMethod: expense.splitMethod || 'equal',
    })
    
    setFriendSearchQuery('')
    setShowFriendSearch(false)
    setShowModal(true)
  }

  const handleAddParticipant = (friend) => {
    const newParticipant = {
      id: friend.friend?.id, // The actual user ID (friend_id2 in console)
      name: friend.nickname || friend.friend?.name,
      email: friend.friend?.email,
      share: 0,
      percentage: 0,
    }
    
    // Update state with new participant
    setFormData(prev => {
      const updatedParticipants = [...prev.participants, newParticipant]
      
      return {
        ...prev,
        participants: updatedParticipants,
      }
    })
    
    // Clear search query to show all remaining friends
    setFriendSearchQuery('')
    
    // Recalculate shares if amount is set
    if (formData.amount && formData.splitMethod === 'equal') {
      const amount = parseFloat(formData.amount)
      const updatedParticipants = [...formData.participants, newParticipant]
      const updated = recalculateShares(updatedParticipants, amount, 'equal')
      setFormData(prev => ({
        ...prev,
        participants: updated
      }))
    }
  }

  const handleRemoveParticipant = (participantId) => {
    const updatedParticipants = formData.participants.filter(p => p.id !== participantId)
    setFormData(prev => ({
      ...prev,
      participants: updatedParticipants,
      // Reset payer if they were removed
      payer: updatedParticipants.some(p => p.id === prev.payer) ? prev.payer : currentUserId
    }))
    
    // Recalculate shares
    if (formData.amount && formData.splitMethod === 'equal') {
      recalculateShares(updatedParticipants, parseFloat(formData.amount), 'equal')
    }
  }

  const recalculateShares = (participants, amount, method) => {
    if (!amount || participants.length === 0) return participants

    if (method === 'equal') {
      // Add current user to count
      const totalCount = participants.length + 1
      const shares = calculateEqualSplit(amount, totalCount)
      
      return participants.map((p, i) => ({
        ...p,
        share: shares[i],
        percentage: Number(((shares[i] / amount) * 100).toFixed(2))
      }))
    }
    
    return participants
  }

  const handleAmountChange = (newAmount) => {
    setFormData(prev => ({
      ...prev,
      amount: newAmount,
    }))
    
    if (newAmount && formData.splitMethod === 'equal' && formData.participants.length > 0) {
      const amount = parseFloat(newAmount)
      if (!isNaN(amount) && amount > 0) {
        const updatedParticipants = recalculateShares(formData.participants, amount, 'equal')
        setFormData(prev => ({
          ...prev,
          participants: updatedParticipants
        }))
      }
    }
  }

  const handleSplitMethodChange = (newMethod) => {
    const amount = parseFloat(formData.amount)
    
    setFormData(prev => ({
      ...prev,
      splitMethod: newMethod,
    }))
    
    if (amount && formData.participants.length > 0) {
      if (newMethod === 'equal') {
        const updatedParticipants = recalculateShares(formData.participants, amount, 'equal')
        setFormData(prev => ({
          ...prev,
          participants: updatedParticipants
        }))
      }
    }
  }

  const handleParticipantShareChange = (participantId, value, field = 'share') => {
    const amount = parseFloat(formData.amount)
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => {
        if (p.id !== participantId) return p
        
        if (field === 'share') {
          const share = parseFloat(value) || 0
          return {
            ...p,
            share,
            percentage: amount > 0 ? Number(((share / amount) * 100).toFixed(2)) : 0
          }
        } else if (field === 'percentage') {
          const percentage = parseFloat(value) || 0
          return {
            ...p,
            percentage,
            share: amount > 0 ? Number(((percentage / 100) * amount).toFixed(2)) : 0
          }
        }
        return p
      })
    }))
  }

  const validateExpense = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title')
      return false
    }
    
    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return false
    }
    
    if (formData.participants.length === 0) {
      toast.error('Please add at least one friend to split with')
      return false
    }
    
    if (!formData.payer) {
      toast.error('Please select who paid')
      return false
    }
    
    // Validate split sums
    if (formData.splitMethod === 'unequal') {
      // Include current user's share (calculated as remainder)
      const participantsTotal = formData.participants.reduce((sum, p) => sum + Number(p.share), 0)
      const myShare = amount - participantsTotal
      
      if (myShare < 0 || !validateSplitSum(amount, [...formData.participants.map(p => p.share), myShare])) {
        toast.error('The shares must add up to the total amount')
        return false
      }
    } else if (formData.splitMethod === 'percentage') {
      const percentages = formData.participants.map(p => p.percentage)
      // Add current user's percentage
      const participantsPercentageTotal = percentages.reduce((sum, p) => sum + Number(p), 0)
      const myPercentage = 100 - participantsPercentageTotal
      
      if (myPercentage < 0 || !validatePercentageSum([...percentages, myPercentage])) {
        toast.error('The percentages must add up to 100%')
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateExpense()) return
    
    try {
      const amount = parseFloat(formData.amount)
      
      // Calculate shares including current user
      let allParticipants = []
      
      if (formData.splitMethod === 'equal') {
        const totalCount = formData.participants.length + 1
        const shares = calculateEqualSplit(amount, totalCount)
        
        // Add current user
        allParticipants.push({
          user: currentUserId,
          share: shares[shares.length - 1]
        })
        
        // Add other participants
        formData.participants.forEach((p, i) => {
          allParticipants.push({
            user: p.id,
            share: shares[i]
          })
        })
      } else if (formData.splitMethod === 'unequal') {
        const participantsTotal = formData.participants.reduce((sum, p) => sum + Number(p.share), 0)
        const myShare = amount - participantsTotal
        
        allParticipants.push({
          user: currentUserId,
          share: Number(myShare.toFixed(2))
        })
        
        formData.participants.forEach(p => {
          allParticipants.push({
            user: p.id,
            share: Number(p.share)
          })
        })
      } else if (formData.splitMethod === 'percentage') {
        const participantsPercentageTotal = formData.participants.reduce((sum, p) => sum + Number(p.percentage), 0)
        const myPercentage = 100 - participantsPercentageTotal
        const myShare = (amount * myPercentage) / 100
        
        allParticipants.push({
          user: currentUserId,
          share: Number(myShare.toFixed(2))
        })
        
        formData.participants.forEach(p => {
          allParticipants.push({
            user: p.id,
            share: Number(p.share)
          })
        })
      }
      
      const payload = {
        title: formData.title,
        amount: amount,
        payer: formData.payer,
        participants: allParticipants,
        splitMethod: formData.splitMethod,
      }
      
      if (editingExpense) {
        // Update existing expense
        await expensesService.updateExpense(editingExpense._id || editingExpense.id, payload)
        toast.success('Expense updated successfully!')
      } else {
        // Create new expense
        await expensesService.createExpense(payload)
        toast.success('Expense added successfully!')
      }
      
      setShowModal(false)
      setEditingExpense(null)
      
      // Immediately refetch data to show changes
      await fetchData()
    } catch (error) {
      const action = editingExpense ? 'update' : 'create'
      const errorMsg = getErrorMessage(error, `Failed to ${action} expense`)
      toast.error(errorMsg, {
        autoClose: 8000,
        style: { whiteSpace: 'pre-line' }
      })
    }
  }

  const checkBalanceImpact = async (expense) => {
    const currentUserId = user?._id || user?.id
    const affectedUsers = new Set()
    
    const payerId = expense.payer?._id || expense.payer?.id
    if (payerId !== currentUserId) {
      affectedUsers.add(payerId)
    }
    
    expense.participants?.forEach(p => {
      const userId = p.user?._id || p.user?.id
      if (userId !== currentUserId) {
        affectedUsers.add(userId)
      }
    })
    
    const settledUsers = []
    const SETTLED_THRESHOLD = 100 // 1 rupee in paise
    
    for (const userId of affectedUsers) {
      try {
        const response = await balancesService.getPairwiseBalance(userId)
        const currentBalance = response.balance?.balance || 0
        
        if (Math.abs(currentBalance) <= SETTLED_THRESHOLD) {
          const participant = expense.participants?.find(p => 
            (p.user?._id === userId || p.user?.id === userId)
          )
          const userName = participant?.user?.name || 
                          (expense.payer?._id === userId || expense.payer?.id === userId 
                            ? expense.payer?.name 
                            : 'Unknown')
          
          settledUsers.push(userName)
        }
      } catch (error) {
        console.error('Error checking balance for user', userId, ':', error)
      }
    }
    
    return settledUsers
  }

  const handleDeleteExpense = async (expenseId) => {
    const expense = expenses.find(e => (e._id || e.id) === expenseId)
    if (!expense) return
    
    const settledUsers = await checkBalanceImpact(expense)
    
    if (settledUsers.length > 0) {
      const warningMessage = `⚠️ WARNING: This expense is part of a settled balance!\n\n` +
                      `Deleting it will change your settled balance with:\n` +
                      settledUsers.map(name => `• ${name}`).join('\n') + 
                      `\n\nThe balance will need to be re-settled after deletion.`
      
      window.alert(warningMessage)
    }
    
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      await expensesService.deleteExpense(expenseId)
      await fetchData()
      toast.success('Expense deleted successfully')
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Failed to delete expense')
      toast.error(errorMsg, {
        autoClose: 8000,
        style: { whiteSpace: 'pre-line' }
      })
    }
  }

  const handleRestoreExpense = async (expenseId) => {
    try {
      await expensesService.restoreExpense(expenseId)
      await fetchData()
      toast.success('Expense restored successfully')
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Failed to restore expense')
      toast.error(errorMsg, {
        autoClose: 8000,
        style: { whiteSpace: 'pre-line' }
      })
    }
  }

  // Calculate current user's share for display
  const calculateMyShare = () => {
    if (!formData.amount || formData.participants.length === 0) return 0
    
    const amount = parseFloat(formData.amount)
    
    if (formData.splitMethod === 'equal') {
      const totalCount = formData.participants.length + 1
      const shares = calculateEqualSplit(amount, totalCount)
      return shares[shares.length - 1]
    } else if (formData.splitMethod === 'unequal') {
      const participantsTotal = formData.participants.reduce((sum, p) => sum + Number(p.share || 0), 0)
      return Number((amount - participantsTotal).toFixed(2))
    } else if (formData.splitMethod === 'percentage') {
      const participantsPercentageTotal = formData.participants.reduce((sum, p) => sum + Number(p.percentage || 0), 0)
      const myPercentage = 100 - participantsPercentageTotal
      return Number(((amount * myPercentage) / 100).toFixed(2))
    }
    
    return 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-accent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="text-primary-600 dark:text-dark-accent" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Expenses</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
              </p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-600 dark:text-gray-400" size={20} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <select
            value={filterFriend}
            onChange={(e) => setFilterFriend(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All Friends</option>
            {friends.map((friend) => (
              <option key={friend.id} value={friend.friend?.id}>
                {friend.nickname || friend.friend?.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-gray-300 dark:border-dark-border text-primary-600 dark:text-dark-accent focus:ring-primary-500 dark:focus:ring-dark-accent"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show deleted</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTransactions}
              onChange={(e) => setShowTransactions(e.target.checked)}
              className="rounded border-gray-300 dark:border-dark-border text-primary-600 dark:text-dark-accent focus:ring-primary-500 dark:focus:ring-dark-accent"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show settlements</span>
          </label>
        </div>
      </div>

      {/* Filtered Friend Info Banner */}
      {filteredFriendInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Showing expenses with</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {filteredFriendInfo.nickname || filteredFriendInfo.friend?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
              {filteredFriendInfo.balance?.status === 'settled' || filteredFriendInfo.balance?.amountInRupees === 0 ? (
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Settled up</p>
              ) : (
                <>
                  <p className={`text-lg font-semibold ${
                    filteredFriendInfo.balance?.status === 'you_owe' 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatCurrency(Math.abs(filteredFriendInfo.balance?.amountInRupees || 0))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredFriendInfo.balance?.status === 'you_owe' ? 'you owe' : 'owes you'}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setFilterFriend('')
                setSearchParams({})
              }}
              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
              title="Clear filter"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="card">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="mx-auto text-gray-400 dark:text-gray-500" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mt-4">
              {filterFriend ? 'No expenses with this friend' : 'No expenses yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filterFriend ? 'Try selecting a different friend' : 'Add your first expense to start tracking'}
            </p>
            {!filterFriend && (
              <button onClick={openAddModal} className="btn btn-primary mt-4">
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {filteredExpenses.map((expense) => {
              const expenseId = expense.id || expense._id
              const isExpanded = expandedExpense === expenseId
              const isTransaction = expense.type === 'transaction'
              const isPayer = !isTransaction && (expense.payer?._id === currentUserId || expense.payer?.id === currentUserId)
              const userParticipant = !isTransaction && expense.participants?.find(p => 
                p.user?._id === currentUserId || p.user?.id === currentUserId
              )
              const userShare = !isTransaction ? (userParticipant?.shareInRupees || 0) : 0
              const userBalance = !isTransaction 
                ? (isPayer 
                  ? (expense.amountInRupees || expense.amount) - userShare
                  : -userShare)
                : 0
              
              // Get icon based on type
              const getItemIcon = () => {
                if (isTransaction) {
                  return <DollarSign size={24} className="text-green-500 dark:text-green-400" />
                } else if (expense.isDeleted) {
                  return <Trash2 size={24} className="text-red-500 dark:text-red-400" />
                } else {
                  return <Receipt size={24} className="text-blue-500 dark:text-blue-400" />
                }
              }
              
              // Calculate balance with filtered friend if filter is active
              let friendBalance = null
              let friendName = null
              if (filterFriend && !isTransaction) {
                const filteredFriendParticipant = expense.participants?.find(p => 
                  p.user?._id === filterFriend || p.user?.id === filterFriend
                )
                
                if (filteredFriendParticipant) {
                  friendName = filteredFriendParticipant.user?.name
                  const friendShare = filteredFriendParticipant.shareInRupees || 0
                  
                  if (isPayer) {
                    // You paid, friend owes you their share (positive = they owe you)
                    friendBalance = friendShare
                  } else if (expense.payer?._id === filterFriend || expense.payer?.id === filterFriend) {
                    // Friend paid, you owe friend your share (negative = you owe them)
                    friendBalance = -userShare
                  }
                }
              } else if (filterFriend && isTransaction) {
                // For transactions, calculate balance based on direction
                if (expense.from?._id === currentUserId || expense.from?.id === currentUserId) {
                  friendName = expense.to?.name
                  friendBalance = -(expense.amountInRupees || 0) // You paid them (you gave money)
                } else {
                  friendName = expense.from?.name
                  friendBalance = expense.amountInRupees || 0 // They paid you (you received money)
                }
              }
              
              return (
                <div 
                  key={expenseId} 
                  id={`expense-${expenseId}`}
                  className={expense.isDeleted ? 'opacity-50' : ''}
                >
                  <div
                    onClick={() => setExpandedExpense(isExpanded ? null : expenseId)}
                    className="flex items-center gap-4 justify-between py-4 hover:bg-gray-50 dark:hover:bg-dark-bg px-4 rounded-lg cursor-pointer"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {getItemIcon()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                          {expense.title || expense.description}
                        </h3>
                        {expense.isDeleted && (
                          <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                            Deleted
                          </span>
                        )}
                        {isTransaction && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                            Settlement
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatDate(expense.date || expense.createdAt)}
                        {!isTransaction && expense.participants && ` • ${expense.participants.length} ${expense.participants.length === 1 ? 'person' : 'people'}`}
                        {isTransaction && (
                          <span>
                            {expense.direction === 'sent' 
                              ? ` • You paid ${expense.to?.name || 'someone'}` 
                              : ` • ${expense.from?.name || 'Someone'} paid you`}
                          </span>
                        )}
                      </p>
                      
                      {/* Show your share for expenses when not filtering by friend */}
                      {!isTransaction && !filterFriend && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Your share: {formatCurrency(Math.abs(userShare))}
                        </p>
                      )}
                      
                      {/* Show friend balance if filtering by friend */}
                      {filterFriend && friendBalance !== null && (
                        <p className={`text-sm font-medium mt-1 ${
                          friendBalance > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {friendBalance > 0 
                            ? `${friendName || 'Friend'} owes you: ${formatCurrency(Math.abs(friendBalance))}`
                            : `You owe ${friendName || 'friend'}: ${formatCurrency(Math.abs(friendBalance))}`
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Amount section with owe/owed indicator */}
                      <div className="text-right flex flex-col items-end">
                        {/* For transactions: show amount in green/red based on direction */}
                        {isTransaction ? (
                          <p className={`text-xl font-bold ${
                            expense.direction === 'received' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {expense.direction === 'received' ? '+' : '-'}
                            {formatCurrency(expense.amountInRupees || expense.amount)}
                          </p>
                        ) : (
                          <>
                            {/* For expenses: show total amount */}
                            <p className="text-xl font-bold text-gray-900 dark:text-dark-text">
                              {formatCurrency(expense.amountInRupees || expense.amount)}
                            </p>
                            
                            {/* Show owe/owed below the total if not filtering by friend */}
                            {!filterFriend && userBalance !== 0 ? (
                              <p className={`text-sm font-medium ${
                                userBalance > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {userBalance > 0 ? 'You get ' : 'You owe '}
                                {formatCurrency(Math.abs(userBalance))}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {expense.splitMethod || 'equal'} split
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {!expense.isDeleted && !isTransaction && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expenseId)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}

                      {expense.isDeleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreExpense(expenseId)
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Restore expense"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      
                      {/* Expand/Collapse Icon */}
                      <div className="p-2">
                        {isExpanded ? (
                          <ChevronUp className="text-gray-400" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400" size={20} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && !isTransaction && (
                    <div className="px-4 pb-4 bg-gray-50 dark:bg-dark-bg/50">
                      <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-3">
                        {/* Paid By */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Paid by:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {expense.payer?.name || 'Unknown'}
                            {isPayer && ' (You)'}
                          </span>
                        </div>
                        
                        {/* Split Details */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Split breakdown:</p>
                          {expense.participants?.map((participant, idx) => {
                            const isCurrentUser = participant.user?._id === currentUserId || participant.user?.id === currentUserId
                            return (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {participant.user?.name || 'Unknown'}
                                  {isCurrentUser && ' (You)'}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-dark-text">
                                  {formatCurrency(participant.shareInRupees || participant.share)}
                                  {participant.percentage && ` (${participant.percentage}%)`}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Settlement Summary */}
                        <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                          <div className={`text-sm font-medium ${
                            userBalance > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : userBalance < 0 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {userBalance > 0 ? (
                              <>You get back {formatCurrency(userBalance)}</>
                            ) : userBalance < 0 ? (
                              <>You owe {formatCurrency(Math.abs(userBalance))}</>
                            ) : (
                              <>Settled</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Expanded Details for Transactions */}
                  {isExpanded && isTransaction && (
                    <div className="px-4 pb-4 bg-gray-50 dark:bg-dark-bg/50">
                      <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-3">
                        {/* Transaction Details */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">From:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {expense.from?.name || 'Unknown'}
                            {(expense.from?._id === currentUserId || expense.from?.id === currentUserId) && ' (You)'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {expense.to?.name || 'Unknown'}
                            {(expense.to?._id === currentUserId || expense.to?.id === currentUserId) && ' (You)'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {formatCurrency(expense.amountInRupees || expense.amount)}
                          </span>
                        </div>
                        
                        {expense.note && (
                          <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Note:</p>
                            <p className="text-sm text-gray-900 dark:text-dark-text mt-1">{expense.note}</p>
                          </div>
                        )}
                        
                        {/* Settlement Summary */}
                        <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                          <div className={`text-sm font-medium ${
                            expense.direction === 'sent'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {expense.direction === 'sent' ? (
                              <>You paid {formatCurrency(expense.amountInRupees || expense.amount)}</>
                            ) : (
                              <>You received {formatCurrency(expense.amountInRupees || expense.amount)}</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Load More Button */}
        {!loading && filteredExpenses.length > 0 && hasMoreExpenses && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMoreExpenses}
              disabled={loadingMore}
              className="px-6 py-2 bg-primary-600 dark:bg-dark-accent text-white rounded-lg hover:bg-primary-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : 'Load More Expenses'}
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal - PART 1 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-2xl w-full p-6 border dark:border-dark-border my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="e.g., Dinner at restaurant"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Add Friends Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Split with * ({availableFriends.length} friends available)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFriendSearch(!showFriendSearch)}
                    className="text-sm text-primary-600 dark:text-dark-accent hover:underline flex items-center gap-1"
                  >
                    <UserPlus size={16} />
                    {showFriendSearch ? 'Hide' : 'Add friend'}
                  </button>
                </div>

                {/* Friend Search */}
                {showFriendSearch && (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                    <div className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={friendSearchQuery}
                          onChange={(e) => setFriendSearchQuery(e.target.value)}
                          className="input pl-10"
                          placeholder="Search friends by name or email..."
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredFriends.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                          {friendSearchQuery ? 'No friends found' : 'No more friends to add'}
                        </p>
                      ) : (
                        filteredFriends.map(friend => (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => handleAddParticipant(friend)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-card rounded-lg transition-colors"
                          >
                            <p className="font-medium text-gray-900 dark:text-dark-text text-sm">
                              {friend.nickname || friend.friend?.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{friend.friend?.email}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Current User + Added Participants */}
                <div className="space-y-2">
                  {/* Current User (always included) */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-text text-sm">
                          You ({user?.name || 'Me'})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Share: {formatCurrency(calculateMyShare())}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Added Participants */}
                  {formData.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-dark-text text-sm">
                          {participant.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{participant.email}</p>
                        {formData.amount && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Share: {formatCurrency(participant.share)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  ))}

                  {formData.participants.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      Add friends to split this expense
                    </p>
                  )}
                </div>
              </div>

              {/* Paid By Section */}
              {formData.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Paid by
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payer: currentUserId }))}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        String(formData.payer) === String(currentUserId)
                          ? 'bg-primary-600 dark:bg-dark-accent text-white border-primary-600 dark:border-dark-accent'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
                      }`}
                    >
                      You
                    </button>
                    {formData.participants.map(participant => (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payer: participant.id }))}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          String(formData.payer) === String(participant.id)
                            ? 'bg-primary-600 dark:bg-dark-accent text-white border-primary-600 dark:border-dark-accent'
                            : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
                        }`}
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Split Method Section */}
              {formData.participants.length > 0 && formData.amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Split
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => handleSplitMethodChange('equal')}
                      className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        formData.splitMethod === 'equal'
                          ? 'bg-primary-600 dark:bg-dark-accent text-white border-primary-600 dark:border-dark-accent'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
                      }`}
                    >
                      <Users size={18} />
                      Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSplitMethodChange('unequal')}
                      className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        formData.splitMethod === 'unequal'
                          ? 'bg-primary-600 dark:bg-dark-accent text-white border-primary-600 dark:border-dark-accent'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
                      }`}
                    >
                      <DollarSign size={18} />
                      Unequally
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSplitMethodChange('percentage')}
                      className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        formData.splitMethod === 'percentage'
                          ? 'bg-primary-600 dark:bg-dark-accent text-white border-primary-600 dark:border-dark-accent'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
                      }`}
                    >
                      <Percent size={18} />
                      By Percentage
                    </button>
                  </div>

                  {/* Split Details */}
                  {formData.splitMethod === 'equal' && (
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Split equally among {formData.participants.length + 1} people
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">You:</span>
                          <span className="font-medium text-gray-900 dark:text-dark-text">{formatCurrency(calculateMyShare())}</span>
                        </div>
                        {formData.participants.map(p => (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{p.name}:</span>
                            <span className="font-medium text-gray-900 dark:text-dark-text">{formatCurrency(p.share)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.splitMethod === 'unequal' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enter each person's share (Your share will be calculated automatically)
                      </p>
                      {formData.participants.map(participant => (
                        <div key={participant.id}>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            {participant.name}'s share (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={participant.share || ''}
                            onChange={(e) => handleParticipantShareChange(participant.id, e.target.value, 'share')}
                            className="input"
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your share:</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{formatCurrency(calculateMyShare())}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.splitMethod === 'percentage' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enter each person's percentage (Your percentage will be calculated automatically)
                      </p>
                      {formData.participants.map(participant => (
                        <div key={participant.id}>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            {participant.name}'s percentage (%)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={participant.percentage || ''}
                              onChange={(e) => handleParticipantShareChange(participant.id, e.target.value, 'percentage')}
                              className="input flex-1"
                              placeholder="0.00"
                            />
                            <div className="px-3 py-2 bg-gray-100 dark:bg-dark-bg border dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-gray-300">
                              = {formatCurrency(participant.share)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your percentage:</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-text">
                            {(100 - formData.participants.reduce((sum, p) => sum + Number(p.percentage || 0), 0)).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your share:</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{formatCurrency(calculateMyShare())}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingExpense(null)
                  }}
                  className="btn flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-dark-bg dark:hover:bg-dark-border text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Expenses

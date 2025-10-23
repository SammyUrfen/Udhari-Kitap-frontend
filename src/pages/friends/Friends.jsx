import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { friendsService } from '../../services/friends'
import { transactionsService } from '../../services/transactions'
import { formatCurrency, getBalanceText, getBalanceColor } from '../../utils/currency'
import { toast } from 'react-toastify'
import { Users, Search, UserPlus, Edit2, Trash2, X, DollarSign } from 'lucide-react'

const Friends = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [friends, setFriends] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [editingFriend, setEditingFriend] = useState(null)
  const [settlingFriend, setSettlingFriend] = useState(null)
  const [nickname, setNickname] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')

  useEffect(() => {
    fetchFriends()
  }, [])

  const fetchFriends = async () => {
    try {
      setLoading(true)
      const data = await friendsService.getFriends()
      setFriends(data.friends || [])
    } catch (error) {
      toast.error('Failed to load friends')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      const data = await friendsService.searchUsers(searchQuery)
      // Backend returns { found: true/false, user: {...} }
      if (data.found && data.user) {
        setSearchResults([data.user])
      } else {
        setSearchResults([])
        toast.info('No user found with this email')
      }
    } catch (error) {
      toast.error('Search failed')
    }
  }

  const handleAddFriend = async (friendEmail) => {
    // Show confirmation with exact email
    if (!window.confirm(`Are you sure you want to add this user as a friend?\n\nEmail: ${friendEmail}`)) {
      return
    }
    
    try {
      await friendsService.addFriend(friendEmail)
      toast.success('Friend added successfully!')
      setShowAddModal(false)
      setSearchQuery('')
      setSearchResults([])
      fetchFriends()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add friend')
    }
  }

  const handleUpdateNickname = async () => {
    if (!editingFriend || !nickname.trim()) return

    try {
      await friendsService.updateNickname(editingFriend.id, nickname)
      toast.success('Nickname updated successfully!')
      setShowEditModal(false)
      setEditingFriend(null)
      setNickname('')
      fetchFriends()
    } catch (error) {
      toast.error('Failed to update nickname')
    }
  }

  const handleRemoveFriend = async (friendId, friendName, balance) => {
    if (balance !== 0) {
      toast.error('Cannot remove friend with pending balance. Settle up first!')
      return
    }

    if (!window.confirm(`Are you sure you want to remove ${friendName}?`)) {
      return
    }

    try {
      await friendsService.removeFriend(friendId)
      toast.success('Friend removed successfully')
      fetchFriends()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove friend')
    }
  }

  const openEditModal = (friend) => {
    setEditingFriend(friend)
    setNickname(friend.nickname || '')
    setShowEditModal(true)
  }

  const openSettleModal = (friend) => {
    setSettlingFriend(friend)
    // Pre-fill with the balance amount
    const balance = friend.balance?.amountInRupees || 0
    setSettleAmount(Math.abs(balance).toString())
    setSettleNote('')
    setShowSettleModal(true)
  }

  const handleSettleUp = async () => {
    if (!settlingFriend || !settleAmount || parseFloat(settleAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      const amount = parseFloat(settleAmount)
      const friendUserId = settlingFriend.friend?.id
      const balanceStatus = settlingFriend.balance?.status
      
      // Determine transaction direction based on who owes whom
      // Transaction model: from pays to
      // If you owe friend (you_owe): you pay them -> createTransaction(to: friend)
      // If friend owes you (owes_you): they pay you -> createTransaction(to: you, from: friend)
      
      if (balanceStatus === 'owes_you') {
        // Friend owes you - record that friend paid you
        // from: friend, to: currentUser
        await transactionsService.createTransaction(
          currentUser.id, // to (you receive)
          amount,
          settleNote || 'Settlement payment',
          friendUserId // from (friend pays)
        )
      } else {
        // You owe friend - record that you paid friend
        // from: currentUser (default), to: friend
        await transactionsService.createTransaction(
          friendUserId, // to (friend receives)
          amount,
          settleNote || 'Settlement payment'
        )
      }
      
      toast.success('Payment recorded successfully!')
      setShowSettleModal(false)
      setSettlingFriend(null)
      setSettleAmount('')
      setSettleNote('')
      fetchFriends()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-accent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading friends...</p>
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
            <Users className="text-primary-600 dark:text-dark-accent" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Friends</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus size={20} />
            Add Friend
          </button>
        </div>
      </div>

      {/* Friends List */}
      <div className="card">
        {friends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 dark:text-gray-500" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mt-4">
              No friends yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add your first friend to start tracking expenses
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary mt-4"
            >
              Add Friend
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={(e) => {
                  // Don't navigate if clicking on edit/delete buttons
                  if (!e.target.closest('button')) {
                    navigate(`/expenses?friend=${friend.friend?.id}`)
                  }
                }}
                className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-dark-bg px-4 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-dark-accent/20 rounded-full flex items-center justify-center overflow-hidden">
                    {friend.friend?.profilePicture ? (
                      <img 
                        src={friend.friend.profilePicture} 
                        alt={friend.nickname || friend.friend?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-600 dark:text-dark-accent font-semibold text-lg">
                        {(friend.nickname || friend.friend?.name).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                      {friend.nickname || friend.friend?.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{friend.friend?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {/* Backend returns balance as nested object with amountInRupees and status */}
                    {friend.balance?.status === 'settled' || friend.balance?.amountInRupees === 0 ? (
                      <>
                        <p className="font-semibold text-gray-600 dark:text-gray-400">
                          No balance
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Settled up
                        </p>
                      </>
                    ) : friend.balance?.status === 'you_owe' ? (
                      <>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(Math.abs(friend.balance.amountInRupees))}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          You owe {friend.nickname || friend.friend?.name}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(Math.abs(friend.balance.amountInRupees))}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {friend.nickname || friend.friend?.name} owes you
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Show settle up button if there's a balance */}
                    {friend.balance?.amountInRupees !== 0 && friend.balance?.status !== 'settled' && (
                      <button
                        onClick={() => openSettleModal(friend)}
                        className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1"
                        title="Settle up"
                      >
                        Settle Up
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(friend)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit nickname"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() =>
                        handleRemoveFriend(
                          friend.id,
                          friend.nickname || friend.friend?.name,
                          friend.balance?.amountInRupees || 0
                        )
                      }
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove friend"
                      disabled={friend.balance?.amountInRupees !== 0 && friend.balance?.status !== 'settled'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6 border dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Add Friend</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter email of friend"
                  className="input flex-1"
                />
                <button onClick={handleSearch} className="btn btn-primary">
                  <Search size={20} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.length === 0 && searchQuery && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No users found
                  </p>
                )}
                {searchResults.map((user) => (
                  <div
                    key={user._id || user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-dark-accent/20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.profilePicture ? (
                          <img 
                            src={user.profilePicture} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-primary-600 dark:text-dark-accent font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-text">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user.email)}
                      className="btn btn-primary text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Nickname Modal */}
      {showEditModal && editingFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6 border dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                Edit Nickname
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingFriend(null)
                  setNickname('')
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name: {editingFriend.name}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname"
                  className="input"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingFriend(null)
                    setNickname('')
                  }}
                  className="btn flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-dark-bg dark:hover:bg-dark-border text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateNickname}
                  className="btn btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && settlingFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6 border dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Settle Up</h2>
              <button
                onClick={() => {
                  setShowSettleModal(false)
                  setSettlingFriend(null)
                  setSettleAmount('')
                  setSettleNote('')
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Settling with</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                  {settlingFriend.nickname || settlingFriend.friend?.name}
                </p>
                <p className={`text-sm mt-1 ${
                  settlingFriend.balance?.status === 'you_owe' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  Current balance: {settlingFriend.balance?.status === 'you_owe' ? 'You owe ' : 'Owes you '}
                  {formatCurrency(Math.abs(settlingFriend.balance?.amountInRupees || 0))}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input"
                />
                {settlingFriend.balance?.status === 'you_owe' ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Recording: You pay {formatCurrency(parseFloat(settleAmount) || 0)} to {settlingFriend.nickname || settlingFriend.friend?.name}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Recording: {settlingFriend.nickname || settlingFriend.friend?.name} pays {formatCurrency(parseFloat(settleAmount) || 0)} to you
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g., Settling dinner expenses"
                  className="input"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSettleModal(false)
                    setSettlingFriend(null)
                    setSettleAmount('')
                    setSettleNote('')
                  }}
                  className="btn flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-dark-bg dark:hover:bg-dark-border text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettleUp}
                  className="btn btn-primary flex-1"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Friends

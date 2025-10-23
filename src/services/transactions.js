import api from './api'

export const transactionsService = {
  /**
   * Create a transaction
   * @param {string} to - User ID who receives the payment
   * @param {number} amount - Amount in rupees
   * @param {string} note - Optional note
   * @param {string} from - Optional: User ID who makes the payment (defaults to authenticated user)
   *                        If provided, it means you're recording a payment you received
   */
  async createTransaction(to, amount, note = '', from = null) {
    const payload = { to, amount, note }
    if (from) {
      payload.from = from
    }
    const { data } = await api.post('/transactions', payload)
    return data
  },

  async getTransactions(params = {}) {
    const { data } = await api.get('/transactions', { params })
    return data
  },

  async getTransactionById(id) {
    const { data } = await api.get(`/transactions/${id}`)
    return data
  },
}

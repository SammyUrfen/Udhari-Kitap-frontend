import api from './api'

export const expensesService = {
  async getExpenses(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    const url = queryParams ? `/expenses?${queryParams}` : '/expenses'
    const { data } = await api.get(url)
    return data
  },

  async createExpense(expenseData) {
    const { data } = await api.post('/expenses', expenseData)
    return data
  },

  async updateExpense(expenseId, updates) {
    const { data } = await api.patch(`/expenses/${expenseId}`, updates)
    return data
  },

  async deleteExpense(expenseId, reason) {
    const { data } = await api.delete(`/expenses/${expenseId}`, {
      data: { reason }
    })
    return data
  },

  async restoreExpense(expenseId) {
    const { data } = await api.post(`/expenses/${expenseId}/restore`)
    return data
  },
}

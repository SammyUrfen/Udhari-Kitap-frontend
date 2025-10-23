import api from './api'

export const balancesService = {
  async getOverallBalance() {
    const { data } = await api.get('/balances')
    return data
  },

  async getPairwiseBalance(userId) {
    const { data } = await api.get(`/balances/${userId}`)
    return data
  },
}

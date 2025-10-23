import api from './api'

export const friendsService = {
  async getFriends() {
    const { data } = await api.get('/friends')
    return data
  },

  async addFriend(email, nickname = '') {
    const { data } = await api.post('/friends', { email, nickname })
    return data
  },

  async updateNickname(friendId, nickname) {
    const { data } = await api.patch(`/friends/${friendId}`, { nickname })
    return data
  },

  async removeFriend(friendId) {
    const { data } = await api.delete(`/friends/${friendId}`)
    return data
  },

  async searchUsers(query) {
    const { data } = await api.get(`/users?email=${query}`)
    return data
  },
}

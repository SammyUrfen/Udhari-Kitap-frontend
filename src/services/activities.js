import api from './api'

export const activitiesService = {
  async getActivities(params = {}) {
    const { data } = await api.get('/activities', { params })
    return data
  },

  async getUnreadCount() {
    const { data } = await api.get('/activities/unread-count')
    return data
  },

  async markAsRead(activityId) {
    const { data } = await api.patch(`/activities/${activityId}/read`)
    return data
  },

  async markAllAsRead() {
    const { data } = await api.patch('/activities/read-all')
    return data
  },
}

import axios from 'axios'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Helper function to extract detailed error messages
const getDetailedErrorMessage = (data) => {
  // If there are validation details (array of error objects)
  if (data.details && Array.isArray(data.details)) {
    // For express-validator errors
    if (data.details.length > 0 && data.details[0].msg) {
      const messages = data.details.map(err => err.msg)
      return messages.length > 1 ? messages.join('\n• ') : messages[0]
    }
    // For custom error details (array of strings)
    if (data.details.length > 0 && typeof data.details[0] === 'string') {
      const messages = data.details
      return messages.length > 1 ? messages.join('\n• ') : messages[0]
    }
  }
  
  // Return message or error field
  return data.message || data.error
}

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response

      if (status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        toast.error('Session expired. Please login again.')
      } else if (status === 403) {
        const message = getDetailedErrorMessage(data) || 'Access denied'
        toast.error(message)
      } else if (status === 404) {
        const message = getDetailedErrorMessage(data) || 'Resource not found'
        toast.error(message)
      } else if (status === 500) {
        toast.error('Server error. Please try again later.')
      } else {
        // For validation errors and other errors, show detailed messages
        const message = getDetailedErrorMessage(data) || 'Something went wrong'
        toast.error(message, {
          autoClose: data.details && data.details.length > 1 ? 8000 : 5000, // Longer for multiple errors
          style: { whiteSpace: 'pre-line' } // Allow line breaks
        })
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.')
    } else {
      toast.error('An unexpected error occurred')
    }
    
    return Promise.reject(error)
  }
)

export { api }
export default api

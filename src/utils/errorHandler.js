/**
 * Extract detailed error message from API error response
 * @param {Error} error - The error object from axios
 * @param {string} fallbackMessage - Default message if no specific error found
 * @returns {string} - Formatted error message
 */
export const getErrorMessage = (error, fallbackMessage = 'Something went wrong') => {
  if (!error.response) {
    // Network error or no response
    return error.message || fallbackMessage
  }

  const { data } = error.response

  // If there are validation details (array of error objects)
  if (data.details && Array.isArray(data.details)) {
    // For express-validator errors
    if (data.details.length > 0 && data.details[0].msg) {
      return data.details.map(err => err.msg).join('; ')
    }
    // For custom error details (array of strings)
    if (data.details.length > 0 && typeof data.details[0] === 'string') {
      return data.details.join('; ')
    }
  }

  // Return message or error field
  return data.message || data.error || fallbackMessage
}

/**
 * Extract all error details for debugging
 * @param {Error} error - The error object from axios
 * @returns {object} - Object with all error information
 */
export const getErrorDetails = (error) => {
  if (!error.response) {
    return {
      message: error.message || 'Network error',
      details: [],
      status: null
    }
  }

  const { data, status } = error.response

  return {
    message: data.message || data.error || 'Unknown error',
    details: data.details || [],
    status,
    raw: data
  }
}

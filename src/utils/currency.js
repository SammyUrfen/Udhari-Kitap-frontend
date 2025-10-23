/**
 * Format currency amount
 * @param {number} amount - Amount in rupees
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Get balance status text
 * @param {string} status - Balance status
 * @param {number} amount - Balance amount
 * @returns {string} Status text
 */
export const getBalanceText = (status, amount) => {
  if (status === 'settled') return 'Settled up'
  if (status === 'owes_you') return `Owes you ${formatCurrency(amount)}`
  if (status === 'you_owe') return `You owe ${formatCurrency(Math.abs(amount))}`
  return 'No balance'
}

/**
 * Get balance color class
 * @param {string} status - Balance status
 * @returns {string} Tailwind color class
 */
export const getBalanceColor = (status) => {
  if (status === 'settled') return 'text-gray-600'
  if (status === 'owes_you') return 'text-green-600'
  if (status === 'you_owe') return 'text-red-600'
  return 'text-gray-600'
}

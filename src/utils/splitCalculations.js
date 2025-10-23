/**
 * Split calculation utilities for expense sharing
 */

/**
 * Calculate equal split among participants
 * Handles rounding to ensure sum equals total
 */
export function calculateEqualSplit(total, participantCount) {
  if (participantCount === 0) return []
  
  const baseAmount = Math.floor((total * 100) / participantCount) / 100
  const remainder = Number((total - (baseAmount * participantCount)).toFixed(2))
  
  const shares = Array(participantCount).fill(baseAmount)
  
  // Distribute remainder (usually just pennies) to first few participants
  if (remainder > 0) {
    const penny = 0.01
    let remainingAmount = remainder
    for (let i = 0; i < participantCount && remainingAmount > 0; i++) {
      shares[i] = Number((shares[i] + penny).toFixed(2))
      remainingAmount = Number((remainingAmount - penny).toFixed(2))
    }
  }
  
  return shares
}

/**
 * Validate that shares sum to total amount
 */
export function validateSplitSum(total, shares) {
  const sum = shares.reduce((acc, share) => acc + Number(share), 0)
  const diff = Math.abs(Number((sum - total).toFixed(2)))
  return diff < 0.01 // Allow 1 paisa difference due to rounding
}

/**
 * Calculate amounts from percentages
 */
export function calculatePercentageSplit(total, percentages) {
  return percentages.map(p => {
    const amount = (total * Number(p)) / 100
    return Number(amount.toFixed(2))
  })
}

/**
 * Validate that percentages sum to 100
 */
export function validatePercentageSum(percentages) {
  const sum = percentages.reduce((acc, p) => acc + Number(p), 0)
  const diff = Math.abs(Number((sum - 100).toFixed(2)))
  return diff < 0.01
}

/**
 * Format split summary for display
 */
export function formatSplitSummary(participants, splitMethod) {
  if (participants.length === 0) return 'No participants'
  if (participants.length === 1) return '1 person'
  
  const methodText = {
    equal: 'equally',
    unequal: 'unequally',
    percentage: 'by percentage'
  }
  
  return `${participants.length} people split ${methodText[splitMethod] || 'equally'}`
}

import { useEffect, useRef, useState } from 'react'
import { activitiesService } from '../services/activities'

/**
 * Smart Polling Hook
 * 
 * Polls activity feed every 30 seconds and triggers data refresh
 * when new activities are detected.
 * 
 * Features:
 * - Only polls when tab is active
 * - Stops when modal is open
 * - Cascades refresh when new activity detected
 * - Tracks last update time
 */

const POLL_INTERVAL = 30000 // 30 seconds

export const useSmartPolling = ({ onNewActivity, enabled = true, pauseWhen = false }) => {
  const [lastActivityId, setLastActivityId] = useState(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [isPolling, setIsPolling] = useState(false)
  const pollIntervalRef = useRef(null)
  const isTabActiveRef = useRef(true)
  const onNewActivityRef = useRef(onNewActivity)
  const lastActivityIdRef = useRef(null)
  const isPollingRef = useRef(false)

  // Update refs when values change (doesn't trigger re-renders)
  useEffect(() => {
    onNewActivityRef.current = onNewActivity
  }, [onNewActivity])

  useEffect(() => {
    lastActivityIdRef.current = lastActivityId
  }, [lastActivityId])

  useEffect(() => {
    isPollingRef.current = isPolling
  }, [isPolling])

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Check for new activities - defined once, uses refs for current values
  const checkForNewActivities = async () => {
    // Don't poll if already polling or tab is not active
    if (isPollingRef.current || !isTabActiveRef.current) {
      return
    }

    try {
      isPollingRef.current = true
      setIsPolling(true)
      
      // Fetch only the most recent activity (lightweight check)
      const response = await activitiesService.getActivities({ limit: 1, page: 1 })
      const activities = response.activities || []
      
      if (activities.length > 0) {
        const latestActivity = activities[0]
        const latestActivityId = latestActivity._id || latestActivity.id
        
        // If this is the first check, just store the ID
        if (lastActivityIdRef.current === null) {
          lastActivityIdRef.current = latestActivityId
          setLastActivityId(latestActivityId)
          setLastUpdateTime(new Date())
          return
        }
        
        // Check if there's a new activity
        if (latestActivityId !== lastActivityIdRef.current) {
          lastActivityIdRef.current = latestActivityId
          setLastActivityId(latestActivityId)
          setLastUpdateTime(new Date())
          
          // Trigger callback to refresh data using ref
          if (onNewActivityRef.current) {
            onNewActivityRef.current(latestActivity)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new activities:', error)
    } finally {
      isPollingRef.current = false
      setIsPolling(false)
    }
  }

  // Setup polling interval - only depends on enabled and pauseWhen
  useEffect(() => {
    if (!enabled) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }
    
    // Initial check
    checkForNewActivities()

    // Setup interval
    pollIntervalRef.current = setInterval(() => {
      if (isTabActiveRef.current && !pauseWhen) {
        checkForNewActivities()
      }
    }, POLL_INTERVAL)

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [enabled, pauseWhen]) // Only restart when these change

  // Manual refresh function
  const manualRefresh = () => {
    checkForNewActivities()
  }

  return {
    lastUpdateTime,
    isPolling,
    manualRefresh
  }
}

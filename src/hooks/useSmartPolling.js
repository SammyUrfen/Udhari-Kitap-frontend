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

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden
      
      // If tab becomes active, check for updates immediately
      if (!document.hidden && enabled && !pauseWhen) {
        checkForNewActivities()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, pauseWhen])

  // Check for new activities
  const checkForNewActivities = async () => {
    // Don't poll if tab is not active, disabled, or paused
    if (!isTabActiveRef.current || !enabled || pauseWhen || isPolling) {
      return
    }

    try {
      setIsPolling(true)
      
      // Fetch only the most recent activity (lightweight check)
      const response = await activitiesService.getActivities({ limit: 1, page: 1 })
      const activities = response.activities || []
      
      if (activities.length > 0) {
        const latestActivity = activities[0]
        const latestActivityId = latestActivity._id
        
        // If this is the first check, just store the ID
        if (lastActivityId === null) {
          setLastActivityId(latestActivityId)
          setLastUpdateTime(new Date())
          return
        }
        
        // Check if there's a new activity
        if (latestActivityId !== lastActivityId) {
          console.log('🔔 New activity detected, triggering refresh...')
          setLastActivityId(latestActivityId)
          setLastUpdateTime(new Date())
          
          // Trigger callback to refresh data
          if (onNewActivity) {
            onNewActivity(latestActivity)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new activities:', error)
    } finally {
      setIsPolling(false)
    }
  }

  // Setup polling interval
  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
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
  }, [enabled, pauseWhen, lastActivityId])

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

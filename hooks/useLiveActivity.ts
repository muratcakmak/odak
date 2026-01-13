/**
 * useLiveActivity Hook
 *
 * React hook for integrating Live Activities with the Odak timer.
 * Handles activity lifecycle based on timer state changes.
 */

import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';
import type { EventSubscription } from 'expo-modules-core';
import type { TimerPhase, ActiveTimerState, PresetId } from '../domain/types';
import { LiveActivityService } from '../services/liveActivity';

interface UseLiveActivityParams {
  phase: TimerPhase;
  activeTimer: ActiveTimerState | null;
  enabled?: boolean; // From settings - defaults to true
}

interface UseLiveActivityReturn {
  startFocusActivity: (presetId: PresetId, endsAt: string, totalMinutes: number) => void;
  startBreakActivity: (endsAt: string, totalMinutes: number) => void;
  endActivity: (title?: string) => void;
  hasActiveActivity: boolean;
}

/**
 * Hook to manage Live Activity lifecycle based on timer state
 */
export function useLiveActivity({
  phase,
  activeTimer,
  enabled = true,
}: UseLiveActivityParams): UseLiveActivityReturn {
  const previousPhaseRef = useRef<TimerPhase>(phase);
  const subscriptionsRef = useRef<EventSubscription[]>([]);
  const isEnabled = enabled && Platform.OS === 'ios';

  // Set up activity state listeners
  useEffect(() => {
    if (!isEnabled) return;

    try {
      const activityUpdateSub = LiveActivity.addActivityUpdatesListener(
        ({ activityID, activityState }) => {
          switch (activityState) {
            case 'dismissed':
              // User swiped away the Live Activity
              console.log('[LiveActivity] Activity dismissed by user:', activityID);
              break;
            case 'ended':
              console.log('[LiveActivity] Activity ended:', activityID);
              break;
            case 'stale':
              console.log('[LiveActivity] Activity became stale:', activityID);
              break;
          }
        }
      );

      if (activityUpdateSub) {
        subscriptionsRef.current.push(activityUpdateSub);
      }
    } catch (error) {
      // Live Activities not supported (e.g., simulator, iOS < 16.2)
      console.log('[LiveActivity] Activity listeners not available:', error);
    }

    return () => {
      subscriptionsRef.current.forEach((sub) => sub?.remove());
      subscriptionsRef.current = [];
    };
  }, []);

  // Start focus activity
  const startFocusActivity = useCallback(
    (presetId: PresetId, endsAt: string, totalMinutes: number) => {
      LiveActivityService.startFocusActivity({ presetId, endsAt, totalMinutes });
    },
    []
  );

  // Start break activity
  const startBreakActivity = useCallback((endsAt: string, totalMinutes: number) => {
    LiveActivityService.startBreakActivity({ endsAt, totalMinutes });
  }, []);

  // End activity with optional final title
  const endActivity = useCallback((title?: string) => {
    if (title) {
      LiveActivityService.endActivity({ title });
    } else {
      LiveActivityService.endActivity();
    }
  }, []);

  // Track phase transitions and automatically manage activity
  useEffect(() => {
    const prevPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (!isEnabled) return;

    // Handle phase transitions
    if (prevPhase !== phase) {
      // Starting focus from idle or holdingToStart
      if (phase === 'focusing' && activeTimer) {
        startFocusActivity(
          activeTimer.presetId,
          activeTimer.endsAt,
          activeTimer.totalMinutes
        );
      }

      // Transitioning to break
      if (phase === 'break' && activeTimer) {
        // Update existing activity to break state (smoother transition)
        LiveActivityService.updateToBreak({
          endsAt: activeTimer.endsAt,
          totalMinutes: activeTimer.totalMinutes,
        });
      }

      // Session ended (back to idle)
      if (phase === 'idle' && prevPhase !== 'idle') {
        const wasCompleted = prevPhase === 'break';
        endActivity(wasCompleted ? 'Complete' : 'Ended');
      }

      // Early end
      if (prevPhase === 'endedEarly' && phase === 'idle') {
        endActivity('Ended Early');
      }
    }
  }, [phase, activeTimer, startFocusActivity, endActivity, isEnabled]);

  return {
    startFocusActivity,
    startBreakActivity,
    endActivity,
    hasActiveActivity: LiveActivityService.hasActiveActivity(),
  };
}

/**
 * Cleanup any orphaned activities on app startup
 * Call this in your app initialization
 */
export function cleanupOrphanedActivities(): void {
  LiveActivityService.cleanup();
}

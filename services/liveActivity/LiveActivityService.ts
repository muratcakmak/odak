/**
 * Live Activity Service
 *
 * Manages iOS Live Activities for Odak focus and break sessions.
 * Uses expo-live-activity to display countdown timers on Dynamic Island and Lock Screen.
 */

import { Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';
import type { StartFocusParams, StartBreakParams } from './types';
import { FOCUS_CONFIG, BREAK_CONFIG, PRESET_LABELS } from './configs';

class LiveActivityServiceClass {
  private currentActivityId: string | null = null;

  /**
   * Check if Live Activities are supported
   */
  isSupported(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Start a Live Activity for a focus session
   */
  startFocusActivity({ presetId, endsAt, totalMinutes }: StartFocusParams): string | undefined {
    if (!this.isSupported()) return undefined;

    // End any existing activity first
    this.stopActivity();

    const state: LiveActivity.LiveActivityState = {
      title: 'Focus',
      subtitle: `${totalMinutes} min ${PRESET_LABELS[presetId] || 'Focus'}`,
      progressBar: {
        date: new Date(endsAt).getTime(),
      },
      imageName: 'focus_icon',
      dynamicIslandImageName: 'focus_island',
    };

    try {
      const activityId = LiveActivity.startActivity(state, FOCUS_CONFIG);
      this.currentActivityId = activityId || null;
      return activityId || undefined;
    } catch (error) {
      console.warn('[LiveActivity] Failed to start focus activity:', error);
      return undefined;
    }
  }

  /**
   * Start a Live Activity for a break session
   */
  startBreakActivity({ endsAt, totalMinutes }: StartBreakParams): string | undefined {
    if (!this.isSupported()) return undefined;

    // End any existing activity first
    this.stopActivity();

    const state: LiveActivity.LiveActivityState = {
      title: 'Break',
      subtitle: `${totalMinutes} min`,
      progressBar: {
        date: new Date(endsAt).getTime(),
      },
      imageName: 'break_icon',
      dynamicIslandImageName: 'break_island',
    };

    try {
      const activityId = LiveActivity.startActivity(state, BREAK_CONFIG);
      this.currentActivityId = activityId || null;
      return activityId || undefined;
    } catch (error) {
      console.warn('[LiveActivity] Failed to start break activity:', error);
      return undefined;
    }
  }

  /**
   * Update existing activity to transition between states
   * Smoother than ending and starting a new activity
   */
  updateToBreak({ endsAt, totalMinutes }: StartBreakParams): void {
    if (!this.isSupported() || !this.currentActivityId) return;

    const state: LiveActivity.LiveActivityState = {
      title: 'Break',
      subtitle: `${totalMinutes} min`,
      progressBar: {
        date: new Date(endsAt).getTime(),
      },
      imageName: 'break_icon',
      dynamicIslandImageName: 'break_island',
    };

    try {
      LiveActivity.updateActivity(this.currentActivityId, state);
    } catch (error) {
      console.warn('[LiveActivity] Failed to update to break:', error);
      // Fallback: try starting a new activity
      this.startBreakActivity({ endsAt, totalMinutes });
    }
  }

  /**
   * Update activity with custom state (e.g., showing completion)
   */
  updateActivity(state: Partial<LiveActivity.LiveActivityState>): void {
    if (!this.isSupported() || !this.currentActivityId) return;

    try {
      // Merge with minimal required state
      const fullState: LiveActivity.LiveActivityState = {
        title: state.title ?? 'Focus',
        progressBar: state.progressBar ?? { date: Date.now() },
        imageName: state.imageName ?? 'focus_icon',
        dynamicIslandImageName: state.dynamicIslandImageName ?? 'focus_island',
        ...state,
      };
      LiveActivity.updateActivity(this.currentActivityId, fullState);
    } catch (error) {
      console.warn('[LiveActivity] Failed to update activity:', error);
    }
  }

  /**
   * Stop the current Live Activity
   */
  stopActivity(finalState?: Partial<LiveActivity.LiveActivityState>): void {
    if (!this.isSupported() || !this.currentActivityId) return;

    try {
      // Show final state when stopping
      const state: LiveActivity.LiveActivityState = {
        title: finalState?.title ?? 'Complete',
        subtitle: finalState?.subtitle,
        progressBar: {
          progress: 1.0,
        },
        imageName: finalState?.imageName ?? 'focus_icon',
        dynamicIslandImageName: finalState?.dynamicIslandImageName ?? 'focus_island',
      };
      LiveActivity.stopActivity(this.currentActivityId, state);
    } catch (error) {
      console.warn('[LiveActivity] Failed to stop activity:', error);
    } finally {
      this.currentActivityId = null;
    }
  }

  /**
   * Alias for stopActivity for semantic clarity
   */
  endActivity(finalState?: Partial<LiveActivity.LiveActivityState>): void {
    this.stopActivity(finalState);
  }

  /**
   * Get current activity ID (for debugging/state management)
   */
  getCurrentActivityId(): string | null {
    return this.currentActivityId;
  }

  /**
   * Check if there's an active Live Activity
   */
  hasActiveActivity(): boolean {
    return this.currentActivityId !== null;
  }

  /**
   * Force cleanup - just resets local state
   * Note: expo-live-activity doesn't have a stopAllActivities method,
   * so we just reset our local tracking. iOS will clean up stale activities.
   */
  cleanup(): void {
    if (!this.isSupported()) return;

    if (this.currentActivityId) {
      this.stopActivity();
    }
    this.currentActivityId = null;
  }
}

// Export singleton instance
export const LiveActivityService = new LiveActivityServiceClass();

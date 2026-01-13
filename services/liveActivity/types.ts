/**
 * Live Activity Types
 *
 * Type definitions for the Odak Live Activity service.
 */

import type { PresetId } from '../../domain/types';

/**
 * Live Activity state for expo-live-activity
 */
export interface OdakLiveActivityState {
  title: string;
  subtitle?: string;
  progressBar: {
    date: number; // endsAt timestamp in milliseconds
  };
  imageName: string;
  dynamicIslandImageName: string;
}

/**
 * Live Activity configuration for styling
 */
export interface OdakLiveActivityConfig {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  progressViewTint: string;
  progressViewLabelColor: string;
  deepLinkUrl: string;
  timerType: 'digital' | 'circular';
  padding: number;
  imagePosition: 'left' | 'right';
  imageSize: number;
}

/**
 * Parameters for starting a focus activity
 */
export interface StartFocusParams {
  presetId: PresetId;
  endsAt: string; // ISO timestamp
  totalMinutes: number;
}

/**
 * Parameters for starting a break activity
 */
export interface StartBreakParams {
  endsAt: string; // ISO timestamp
  totalMinutes: number;
}

/**
 * Live Activity phase for styling selection
 */
export type LiveActivityPhase = 'focus' | 'break';

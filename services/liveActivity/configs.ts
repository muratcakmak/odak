/**
 * Live Activity Configurations
 *
 * Theme configurations for focus and break states.
 * Matches Odak's design language: orange accent (#FF9500), white surfaces.
 */

import type { LiveActivityConfig } from 'expo-live-activity';

/**
 * Focus Session Theme
 * White background with orange accent - matches Odak's default appearance
 */
export const FOCUS_CONFIG: LiveActivityConfig = {
  backgroundColor: '#FFFFFF',
  titleColor: '#000000',
  subtitleColor: '#666666',
  progressViewTint: '#FF9500', // Orange accent
  progressViewLabelColor: '#000000',
  deepLinkUrl: '/focus',
  timerType: 'digital',
  padding: 24,
  imagePosition: 'left',
  imageSize: { width: 50, height: 50 },
};

/**
 * Break Session Theme
 * Orange background with white text - inverted theme for breaks
 */
export const BREAK_CONFIG: LiveActivityConfig = {
  backgroundColor: '#FF9500', // Full orange background
  titleColor: '#FFFFFF',
  subtitleColor: 'rgba(255,255,255,0.8)',
  progressViewTint: '#FFFFFF',
  progressViewLabelColor: '#FFFFFF',
  deepLinkUrl: '/(tabs)/focus',
  timerType: 'digital',
  padding: 24,
  imagePosition: 'left',
  imageSize: { width: 50, height: 50 },
};

/**
 * Preset display names for Live Activity subtitle
 */
export const PRESET_LABELS: Record<string, string> = {
  quick: 'Quick Focus',
  standard: 'Standard Focus',
  deep: 'Deep Focus',
};

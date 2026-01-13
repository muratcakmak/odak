/**
 * Live Activity Types
 *
 * Type definitions for the Odak Live Activity service.
 */

import type { PresetId } from '../../domain/types';

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

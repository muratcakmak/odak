import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

// Minimum iOS version for Liquid Glass (iOS 26 SDK / iOS 18)
const MINIMUM_LIQUID_GLASS_VERSION = 18;

// Cache the result since it won't change during runtime
let _cachedGlassSupport: boolean | null = null;

/**
 * Checks if the device supports the premium Liquid Glass effect.
 * This requires:
 * 1. iOS Platform
 * 2. iOS 18.0 or higher (iOS 26 SDK)
 * 3. The expo-glass-effect library confirming availability
 *
 * Results are cached for performance.
 */
export function hasLiquidGlassSupport(): boolean {
  if (_cachedGlassSupport !== null) {
    return _cachedGlassSupport;
  }

  if (Platform.OS !== 'ios') {
    _cachedGlassSupport = false;
    return false;
  }

  const majorVersion = parseInt(String(Platform.Version), 10);

  if (majorVersion < MINIMUM_LIQUID_GLASS_VERSION) {
    _cachedGlassSupport = false;
    return false;
  }

  _cachedGlassSupport = isLiquidGlassAvailable();
  return _cachedGlassSupport;
}

/**
 * Get iOS major version number
 */
export function getIOSVersion(): number {
  if (Platform.OS !== 'ios') {
    return 0;
  }
  return parseInt(String(Platform.Version), 10);
}

/**
 * Check if BlurView is available (iOS 10+)
 */
export function hasBlurSupport(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return getIOSVersion() >= 10;
}

/**
 * Feature flags for granular capability control
 */
export const GlassFeatures = {
  /** Full Liquid Glass support (iOS 18+) */
  isAvailable: hasLiquidGlassSupport,
  /** BlurView support for fallback (iOS 10+) */
  hasBlur: hasBlurSupport,
  /** Check iOS version */
  iosVersion: getIOSVersion,
} as const;

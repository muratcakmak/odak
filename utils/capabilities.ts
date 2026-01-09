import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

/**
 * Checks if the device supports the premium Liquid Glass effect.
 * This requires:
 * 1. iOS Platform
 * 2. iOS 18.0 or higher (for the specific APIs we want to leverage effectively)
 * 3. The expo-glass-effect library confirming availability
 */
export function hasLiquidGlassSupport(): boolean {
    if (Platform.OS !== 'ios') {
        return false;
    }

    const majorVersion = parseInt(String(Platform.Version), 10);

    // We strictly target iOS 18+ for the full liquid glass experience
    // as it relies on newer blur/material APIs that perform best there.
    if (majorVersion < 18) {
        return false;
    }

    return isLiquidGlassAvailable();
}

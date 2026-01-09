import { StyleSheet } from 'react-native-unistyles';
import { Appearance } from 'react-native';
import { storage } from '../utils/storage';
import {
    lightColors,
    darkColors,
    sharedColors,
    spacing,
    borderRadius,
    typography,
    animation,
} from '../constants/theme';

export const lightTheme = {
    colors: {
        ...lightColors,
        ...sharedColors,
    },
    spacing,
    borderRadius,
    typography,
    animation,
};

export const darkTheme = {
    colors: {
        ...darkColors,
        ...sharedColors,
    },
    spacing,
    borderRadius,
    typography,
    animation,
};

export const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
};

type AppThemes = {
    light: typeof lightTheme;
    dark: typeof darkTheme;
};

type AppBreakpoints = typeof breakpoints;

// Read stored preference synchronously at module load to prevent theme flash
function getInitialTheme(): 'light' | 'dark' {
    const storedMode = storage.getString('background_mode') as 'dark' | 'light' | 'device' | undefined;
    const mode = storedMode || 'device';

    if (mode === 'device') {
        return Appearance.getColorScheme() || 'dark';
    }
    return mode;
}

// Override library types
declare module 'react-native-unistyles' {
    export interface UnistylesThemes extends AppThemes { }
    export interface UnistylesBreakpoints extends AppBreakpoints { }
}

// Configure Unistyles with version 3 API
StyleSheet.configure({
    breakpoints,
    themes: {
        light: lightTheme,
        dark: darkTheme,
    },
    settings: {
        initialTheme: getInitialTheme(),
    },
});

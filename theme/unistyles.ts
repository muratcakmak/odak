import { StyleSheet } from 'react-native-unistyles';
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
        adaptiveThemes: true, // Enable system theme detection by default
    },
});

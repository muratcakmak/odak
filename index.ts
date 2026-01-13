/**
 * Custom Entry Point for Odak
 *
 * This file ensures Unistyles is configured BEFORE expo-router loads any routes.
 * The theme/unistyles.ts file has no circular dependencies and can safely run first.
 */

// Configure Unistyles FIRST - must run before any StyleSheet.create with theme callbacks
import "./theme/unistyles";

// Now load expo-router which will evaluate all route files
import "expo-router/entry";

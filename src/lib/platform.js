import { Capacitor } from '@capacitor/core';

/**
 * Returns true if running inside the native iOS Capacitor shell (App Store / TestFlight build).
 * Returns false when running in desktop/mobile web browsers.
 */
export const isNativeIOS = () => {
  try {
    return Capacitor.getPlatform() === 'ios';
  } catch (e) {
    return false;
  }
};

/**
 * Returns true if running inside any native mobile shell (iOS or Android).
 */
export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

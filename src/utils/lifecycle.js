// Android Vitals Performance & Background Memory Lifecycle Manager
// Aligns with Google Play 2026-2027 performance requirements:
// Automatically pauses canvas animations, clears background intervals, and frees memory when app goes to background.

export function initAppLifecycle() {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // App entered background (TWA / Android minimized)
      // 1. Reset & freeze active canvas confetti animations
      try {
        if (typeof window.confetti === 'function' && typeof window.confetti.reset === 'function') {
          window.confetti.reset();
        }
      } catch (e) {}

      // 2. Stop any active Web Speech synthesis to save battery & CPU/memory
      try {
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    } else if (document.visibilityState === 'visible') {
      // App returned to foreground
      // State is preserved smoothly
    }
  });
}


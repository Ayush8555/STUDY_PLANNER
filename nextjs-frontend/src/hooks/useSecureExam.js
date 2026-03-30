'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSecureExam — Anti-cheating security layer for exam mode.
 *
 * Features:
 *  1. Tab switch detection (visibilitychange)
 *  2. Window blur/focus tracking (blur)
 *  3. Right-click blocking
 *  4. Copy / Paste / Cut blocking
 *  5. DevTools key blocking (F12, Ctrl+Shift+I/J/C)
 *  6. Page-leave warning (beforeunload)
 *  7. Violation counter → auto-submit at threshold
 *
 * @param {Function} onAutoSubmit — called when violations >= MAX_VIOLATIONS
 * @param {Object}   options
 * @param {number}   options.maxViolations — violations before auto-submit (default 3)
 * @param {boolean}  options.enabled — master switch (default true)
 * @returns {{ violations, warningMessage, warningType, dismissWarning, securityLog }}
 */
export default function useSecureExam(onAutoSubmit, options = {}) {
  const { maxViolations = 3, enabled = true } = options;

  const [violations, setViolations] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState(''); // 'tabswitch' | 'devtools' | 'blur'
  const [securityLog, setSecurityLog] = useState([]); // { type, timestamp }

  const violationsRef = useRef(0);
  const autoSubmitCalled = useRef(false);
  const warningTimerRef = useRef(null);

  // ── Log a violation ─────────────────────────────────
  const addViolation = useCallback((type, message) => {
    if (autoSubmitCalled.current) return;

    violationsRef.current += 1;
    const count = violationsRef.current;

    setViolations(count);
    setSecurityLog(prev => [...prev, { type, timestamp: Date.now() }]);

    // Show warning
    const remaining = maxViolations - count;
    setWarningType(type);
    setWarningMessage(
      remaining > 0
        ? `⚠️ ${message} — ${remaining} warning${remaining > 1 ? 's' : ''} remaining before auto-submit.`
        : `🛑 ${message} — Maximum violations reached. Auto-submitting...`
    );

    // Auto-dismiss warning after 4s
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setWarningMessage('');
      setWarningType('');
    }, remaining > 0 ? 4000 : 2000);

    // Auto-submit threshold
    if (count >= maxViolations && !autoSubmitCalled.current) {
      autoSubmitCalled.current = true;
      // Short delay so the user sees the final warning
      setTimeout(() => {
        if (onAutoSubmit) onAutoSubmit();
      }, 1500);
    }
  }, [maxViolations, onAutoSubmit]);

  const dismissWarning = useCallback(() => {
    setWarningMessage('');
    setWarningType('');
  }, []);

  // ═══ EFFECTS ═══════════════════════════════════════

  useEffect(() => {
    if (!enabled) return;

    // --- 1. Tab visibility change ---
    const onVisChange = () => {
      if (document.hidden && !autoSubmitCalled.current) {
        addViolation('tab_switch', 'Tab switch detected during exam');
      }
    };

    // --- 2. Window Blur (lost focus) ---
    const onBlur = () => {
      if (!autoSubmitCalled.current) {
        addViolation('blur', 'Window lost focus');
      }
    };

    // --- 3. Right-click blocking ---
    const onContextMenu = (e) => { e.preventDefault(); };

    // --- 4. Keyboard restrictions ---
    const onKeyDown = (e) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        addViolation('devtools', 'DevTools shortcut detected');
        return;
      }
      // Block Ctrl+Shift+I / J / C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        addViolation('devtools', 'DevTools shortcut detected');
        return;
      }
      // Block Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toUpperCase() === 'U') {
        e.preventDefault();
        return;
      }
      // Block Copy / Cut / Paste
      if (e.ctrlKey && ['C', 'V', 'X'].includes(e.key.toUpperCase()) && !e.shiftKey) {
        e.preventDefault();
        return;
      }
    };

    // --- 5. Copy/Cut/Paste events ---
    const blockClipboard = (e) => { e.preventDefault(); };

    // --- 6. beforeunload ---
    const onBeforeUnload = (e) => {
      if (!autoSubmitCalled.current) {
        e.preventDefault();
        e.returnValue = 'Your test will be submitted if you leave. Are you sure?';
      }
    };

    // ── Attach listeners ──────────────────────────────
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true); // capture phase
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    window.addEventListener('beforeunload', onBeforeUnload);

    // ── Cleanup ───────────────────────────────────────
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, addViolation]);

  return {
    violations,
    maxViolations,
    warningMessage,
    warningType,
    dismissWarning,
    securityLog
  };
}

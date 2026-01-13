import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerState = 'idle' | 'charging' | 'running' | 'break' | 'paused';
export type SessionPreset = 'quick' | 'standard' | 'deep';

export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  preset: SessionPreset;
  completed: boolean;
}

export interface TimerSettings {
  quickDuration: number;
  standardDuration: number;
  deepDuration: number;
  breakDuration: number;
  autoStartBreak: boolean;
  showMinutesRemaining: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  liveActivityEnabled: boolean;
  notificationsEnabled: boolean;
}

const defaultSettings: TimerSettings = {
  quickDuration: 10,
  standardDuration: 25,
  deepDuration: 50,
  breakDuration: 5,
  autoStartBreak: true,
  showMinutesRemaining: false,
  soundEnabled: false,
  vibrationEnabled: true,
  liveActivityEnabled: true,
  notificationsEnabled: true,
};

export const getPresetDuration = (preset: SessionPreset, settings: TimerSettings): number => {
  switch (preset) {
    case 'quick': return settings.quickDuration;
    case 'standard': return settings.standardDuration;
    case 'deep': return settings.deepDuration;
  }
};

export const getPresetGrid = (preset: SessionPreset): { rows: number; cols: number } => {
  switch (preset) {
    case 'quick': return { rows: 2, cols: 5 };
    case 'standard': return { rows: 5, cols: 5 };
    case 'deep': return { rows: 5, cols: 10 };
  }
};

export const useTimer = () => {
  const [state, setState] = useState<TimerState>('idle');
  const [preset, setPreset] = useState<SessionPreset>('standard');
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const stored = localStorage.getItem('odak-settings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });
  const [sessions, setSessions] = useState<Session[]>(() => {
    const stored = localStorage.getItem('odak-sessions');
    return stored ? JSON.parse(stored) : [];
  });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [chargeProgress, setChargeProgress] = useState(0);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const chargeStartRef = useRef<number | null>(null);

  const totalDuration = state === 'break' 
    ? settings.breakDuration * 60 
    : getPresetDuration(preset, settings) * 60;

  const dotsRemaining = Math.ceil(remainingSeconds / 60);
  const totalDots = state === 'break' 
    ? settings.breakDuration 
    : getPresetDuration(preset, settings);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('odak-settings', JSON.stringify(settings));
  }, [settings]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('odak-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Vibration not supported
      }
    }
  }, [settings.vibrationEnabled]);

  const startCharging = useCallback(() => {
    if (state !== 'idle') return;
    setState('charging');
    chargeStartRef.current = Date.now();
    setChargeProgress(0);
    vibrate(10);
  }, [state, vibrate]);

  const updateCharge = useCallback(() => {
    if (!chargeStartRef.current) return 0;
    const elapsed = Date.now() - chargeStartRef.current;
    const progress = Math.min(elapsed / 2500, 1); // 2.5 seconds to charge
    setChargeProgress(progress);
    
    // Haptic feedback at intervals
    if (progress > 0.25 && progress < 0.26) vibrate(15);
    if (progress > 0.5 && progress < 0.51) vibrate(20);
    if (progress > 0.75 && progress < 0.76) vibrate(25);
    
    return progress;
  }, [vibrate]);

  const completeCharge = useCallback(() => {
    if (state !== 'charging') return;
    setState('running');
    startTimeRef.current = new Date();
    setRemainingSeconds(getPresetDuration(preset, settings) * 60);
    vibrate([50, 30, 50]);
  }, [state, preset, settings, vibrate]);

  const cancelCharge = useCallback(() => {
    if (state !== 'charging') return;
    setState('idle');
    chargeStartRef.current = null;
    setChargeProgress(0);
  }, [state]);

  const breakSeal = useCallback(() => {
    if (state !== 'running' && state !== 'break') return;
    
    // If running, record incomplete session
    if (state === 'running' && startTimeRef.current) {
      const session: Session = {
        id: crypto.randomUUID(),
        startTime: startTimeRef.current,
        endTime: new Date(),
        duration: getPresetDuration(preset, settings),
        preset,
        completed: false,
      };
      setSessions(prev => [session, ...prev]);
    }
    
    setState('idle');
    setRemainingSeconds(0);
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    vibrate([100, 50, 100]);
  }, [state, preset, settings, vibrate]);

  const startBreak = useCallback(() => {
    setState('break');
    setRemainingSeconds(settings.breakDuration * 60);
    startTimeRef.current = new Date();
    vibrate(30);
  }, [settings.breakDuration, vibrate]);

  const skipBreak = useCallback(() => {
    if (state !== 'break') return;
    setState('idle');
    setRemainingSeconds(0);
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [state]);

  // Timer tick
  useEffect(() => {
    if (state === 'running' || state === 'break') {
      intervalRef.current = window.setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (state === 'running' && startTimeRef.current) {
              // Complete session
              const session: Session = {
                id: crypto.randomUUID(),
                startTime: startTimeRef.current,
                endTime: new Date(),
                duration: getPresetDuration(preset, settings),
                preset,
                completed: true,
              };
              setSessions(prevSessions => [session, ...prevSessions]);
              vibrate([100, 50, 100, 50, 100]);
              
              if (settings.autoStartBreak) {
                setTimeout(() => startBreak(), 500);
              } else {
                setState('idle');
              }
            } else if (state === 'break') {
              setState('idle');
              vibrate([50, 30, 50]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [state, preset, settings, vibrate, startBreak]);

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const exportSessions = useCallback(() => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odak-sessions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  const importSessions = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        setSessions(prev => [...imported, ...prev]);
        return true;
      }
    } catch (e) {
      console.error('Failed to import sessions:', e);
    }
    return false;
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, []);

  return {
    state,
    preset,
    setPreset,
    settings,
    updateSettings,
    sessions,
    remainingSeconds,
    chargeProgress,
    totalDuration,
    dotsRemaining,
    totalDots,
    startCharging,
    updateCharge,
    completeCharge,
    cancelCharge,
    breakSeal,
    startBreak,
    skipBreak,
    exportSessions,
    importSessions,
    clearSessions,
  };
};

export default useTimer;

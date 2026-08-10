import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';

interface LoadingBarState {
  isLoading: boolean;
  start: () => void;
  done: () => void;
}

const LoadingBarContext = createContext<LoadingBarState | null>(null);

export function LoadingBarProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const start = () => setIsLoading(true);
  const done = () => setIsLoading(false);

  // Animate the progress bar: quickly to ~80% while loading, then to 100% and fade out
  useEffect(() => {
    if (!isLoading) {
      if (progress > 0) {
        // Finish: snap to 100% then fade out
        setProgress(100);
        const fadeTimer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(fadeTimer);
      }
      return;
    }

    setVisible(true);
    setProgress(12);

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setProgress(35), 150));
    timers.push(setTimeout(() => setProgress(55), 400));
    timers.push(setTimeout(() => setProgress(70), 800));
    timers.push(setTimeout(() => setProgress(82), 1500));

    return () => timers.forEach(clearTimeout);
  }, [isLoading, progress]);

  return (
    <LoadingBarContext.Provider value={{ isLoading, start, done }}>
      {visible && (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
          <div className="h-1 w-full bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {children}
    </LoadingBarContext.Provider>
  );
}

export function useLoadingBar() {
  const ctx = useContext(LoadingBarContext);
  if (!ctx) throw new Error('useLoadingBar must be used within LoadingBarProvider');
  return ctx;
}

import React, { createContext, useCallback, useContext, useState, useMemo } from 'react';
import { tourSteps, mockAnalysisResult, mockNoteEvents } from '@toposonics/shared/dist/demo-data';
import { logAnalyticsEvent } from '@/lib/analytics';

interface TourContextValue {
  isTourActive: boolean;
  currentStepIndex: number;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  tourStep: typeof tourSteps[number] | null;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
    logAnalyticsEvent('tour_started');
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    logAnalyticsEvent('tour_skipped', { step: currentStepIndex });
  }, [currentStepIndex]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsTourActive(false);
      logAnalyticsEvent('tour_completed');
    }
  }, [currentStepIndex]);

  const tourStep = isTourActive ? tourSteps[currentStepIndex] : null;

  const value = useMemo(
    () => ({
      isTourActive,
      currentStepIndex,
      startTour,
      stopTour,
      nextStep,
      tourStep,
    }),
    [isTourActive, currentStepIndex, startTour, stopTour, nextStep, tourStep]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

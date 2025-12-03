"use client";

import { useState, useEffect } from "react";

interface CountdownResult {
  minutes: number;
  seconds: number;
  formatted: string;
  isReady: boolean;
  totalSeconds: number;
}

/**
 * Hook for countdown timers based on a target ISO timestamp
 * @param targetDate - ISO 8601 timestamp string (e.g., "2024-01-15T10:32:00.000Z")
 * @returns CountdownResult with formatted time and ready status
 */
export function useCountdown(targetDate: string | null | undefined): CountdownResult {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(0);
      return;
    }

    const calculateTime = () => {
      try {
        const now = new Date();
        const target = new Date(targetDate);
        
        // Handle invalid dates
        if (isNaN(target.getTime())) {
          setTimeRemaining(0);
          return;
        }

        // Calculate difference in seconds
        const diff = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
        setTimeRemaining(diff);
      } catch (error) {
        // Handle any parsing errors gracefully
        console.error("Error calculating countdown:", error);
        setTimeRemaining(0);
      }
    };

    // Calculate immediately
    calculateTime();

    // Update every second
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const formatTime = (seconds: number): CountdownResult => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return {
      minutes: mins,
      seconds: secs,
      formatted: `${mins}:${secs.toString().padStart(2, "0")}`,
      isReady: seconds === 0,
      totalSeconds: seconds,
    };
  };

  return formatTime(timeRemaining);
}


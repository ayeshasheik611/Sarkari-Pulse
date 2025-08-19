import { useState, useEffect, useCallback } from 'react';

export interface UpdateStatus {
  isUpdating: boolean;
  lastUpdated: Date;
  nextUpdate: Date;
  updateInterval: number;
  error: string | null;
}

export const useAutoUpdate = (updateFunction: () => Promise<void>, intervalMinutes: number = 30) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    isUpdating: false,
    lastUpdated: new Date(),
    nextUpdate: new Date(Date.now() + intervalMinutes * 60 * 1000),
    updateInterval: intervalMinutes,
    error: null
  });

  const performUpdate = useCallback(async () => {
    setUpdateStatus(prev => ({ ...prev, isUpdating: true, error: null }));
    
    try {
      await updateFunction();
      const now = new Date();
      setUpdateStatus(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdated: now,
        nextUpdate: new Date(now.getTime() + intervalMinutes * 60 * 1000),
        error: null
      }));
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  }, [updateFunction, intervalMinutes]);

  useEffect(() => {
    const interval = setInterval(performUpdate, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [performUpdate, intervalMinutes]);

  const manualUpdate = useCallback(() => {
    performUpdate();
  }, [performUpdate]);

  return {
    updateStatus,
    manualUpdate
  };
};
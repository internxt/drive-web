import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GetFileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import fileVersionService from '../services/fileVersion.service';
import errorService from 'services/error.service';

interface VersioningLimitsContextValue {
  limits: GetFileLimitsResponse | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const VersioningLimitsContext = createContext<VersioningLimitsContextValue | undefined>(undefined);

export const VersioningLimitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [limits, setLimits] = useState<GetFileLimitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLimits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fileVersionService.getLimits();
      setLimits(response);
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  return (
    <VersioningLimitsContext.Provider value={{ limits, isLoading, refetch: fetchLimits }}>
      {children}
    </VersioningLimitsContext.Provider>
  );
};

export const useVersioningLimits = (): VersioningLimitsContextValue => {
  const context = useContext(VersioningLimitsContext);
  if (!context) {
    return {
      limits: null,
      isLoading: false,
      refetch: async () => {},
    };
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Division } from '../types';
import { tournamentDataCache } from '../services/cache/TournamentDataCache';

interface TournamentContextType {
  selectedDivisionId: string | null;
  setSelectedDivisionId: (divisionId: string | null) => void;
  divisions: Division[];
  divisionsLoading: boolean;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

interface TournamentProviderProps {
  children: ReactNode;
  tournamentId: string;
}

export const TournamentProvider: React.FC<TournamentProviderProps> = ({ children, tournamentId }) => {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);

  const loadDivisions = useCallback(async () => {
    setDivisionsLoading(true);
    try {
      const { divisions: divs, selectedDivisionId: selectedId } = await tournamentDataCache.getDivisions(tournamentId);
      setDivisions(divs);
      setSelectedDivisionId(selectedId);
    } catch (error) {
      console.error('Error loading divisions:', error);
    } finally {
      setDivisionsLoading(false);
    }
  }, [tournamentId]);

  const handleSetSelectedDivision = useCallback((divisionId: string | null) => {
    setSelectedDivisionId(divisionId);
    tournamentDataCache.setSelectedDivision(tournamentId, divisionId);
  }, [tournamentId]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  return (
    <TournamentContext.Provider value={{ 
      selectedDivisionId, 
      setSelectedDivisionId: handleSetSelectedDivision,
      divisions,
      divisionsLoading,
    }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

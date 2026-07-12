import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const UnitContext = createContext(null);

const STORAGE_KEY = 'tooltrack_active_unit_id';

export function UnitProvider({ children }) {
  const [activeUnitId, setActiveUnitId] = useState(null);
  const [user, setUser] = useState(null);

  // Fetch all units
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  // Fetch current user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch user's TeamMember profile to get default unit
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMember', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ email: user.email }),
    enabled: !!user?.email,
  });

  const myProfile = teamMembers[0];
  const isOwner = user?.role === 'ägare';

  // Set initial active unit from: localStorage > TeamMember.unit_id > first unit
  useEffect(() => {
    if (units.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedUnit = stored && units.find(u => u.id === stored);

    if (storedUnit) {
      setActiveUnitId(storedUnit.id);
    } else if (myProfile?.unit_id) {
      setActiveUnitId(myProfile.unit_id);
      localStorage.setItem(STORAGE_KEY, myProfile.unit_id);
    } else if (units.length > 0) {
      setActiveUnitId(units[0].id);
      localStorage.setItem(STORAGE_KEY, units[0].id);
    }
  }, [units, myProfile]);

  const switchUnit = (unitId) => {
    setActiveUnitId(unitId);
    localStorage.setItem(STORAGE_KEY, unitId);
  };

  const activeUnit = units.find(u => u.id === activeUnitId);

  return (
    <UnitContext.Provider value={{
      units,
      activeUnitId,
      activeUnit,
      switchUnit,
      isOwner,
      user,
      myProfile,
      isLoading: unitsLoading || !activeUnitId,
    }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used within UnitProvider');
  return ctx;
}
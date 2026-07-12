import React from 'react';
import { useUnit } from '@/hooks/useUnitContext';
import { Building2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function UnitSwitcher() {
  const { units, activeUnit, switchUnit, isOwner } = useUnit();

  // Only owners can switch — others just see their unit name
  if (!activeUnit) return null;

  if (!isOwner) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Building2 className="w-4 h-4" />
        <span className="truncate">{activeUnit.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200">
          <Building2 className="w-4 h-4 text-[#8B1E1E]" />
          <span className="truncate max-w-[120px]">{activeUnit.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {units.map(unit => (
          <DropdownMenuItem
            key={unit.id}
            onClick={() => switchUnit(unit.id)}
            className={cn(
              "flex items-center gap-2",
              unit.id === activeUnit.id && "bg-[#8B1E1E]/10 text-[#8B1E1E] font-medium"
            )}
          >
            <Building2 className="w-4 h-4" />
            {unit.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
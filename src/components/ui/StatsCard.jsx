import React from 'react';
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, trend, trendLabel, className, iconClassName }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {(trend !== undefined || trendLabel) && (
            <div className="flex items-center gap-1.5 mt-2">
              {trend !== undefined && (
                <span className={cn(
                  "text-sm font-medium",
                  isPositive && "text-emerald-600",
                  isNegative && "text-red-600",
                  !isPositive && !isNegative && "text-gray-500"
                )}>
                  {isPositive ? '+' : ''}{trend}%
                </span>
              )}
              {trendLabel && (
                <span className="text-sm text-gray-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
        <div className={cn(
          "p-3 rounded-xl",
          iconClassName || "bg-[#8B1E1E]/10"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            iconClassName ? "" : "text-[#8B1E1E]"
          )} />
        </div>
        )}
      </div>
    </div>
  );
}
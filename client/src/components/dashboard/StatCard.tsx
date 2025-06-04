import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
    text: string;
  };
  valueColor?: string;
}

export default function StatCard({ title, value, icon: Icon, iconColor, iconBgColor, trend, valueColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-light-border dark:border-dark-border">
      <div className="flex items-center">
        <div className={cn("p-2 rounded-md", iconBgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={cn("text-2xl font-bold text-gray-800 dark:text-white", valueColor)}>{value}</p>
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn(
            "flex items-center",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {trend.isPositive ? (
                <path
                  fillRule="evenodd"
                  d="M12 7a1 1 0 01-1 1H5a1 1 0 010-2h6a1 1 0 011 1zm-1 3a1 1 0 01-1 1H5a1 1 0 110-2h5a1 1 0 011 1zm4.707 5.707a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L15 13.586V3a1 1 0 112 0v10.586l1.293-1.293a1 1 0 111.414 1.414l-3 3z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M12 7a1 1 0 01-1 1H5a1 1 0 010-2h6a1 1 0 011 1zm-1 3a1 1 0 01-1 1H5a1 1 0 110-2h5a1 1 0 011 1zm-3 5a1 1 0 01-1-1V3a1 1 0 112 0v11a1 1 0 01-1 1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <span>{trend.value}%</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-2">{trend.text}</span>
        </div>
      )}
    </div>
  );
}

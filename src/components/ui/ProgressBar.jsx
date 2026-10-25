import React from 'react';


export default function ProgressBar({
  value = 0,
  max = 100,
  height = 'h-1.5',
  className = '',
  fillClassName = 'bg-progress',
  showLabel = false,
  labelPrefix = '',
}) {
  const percentage = Math.min(Math.max((value / (max || 1)) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-muted mb-1 font-medium">
          <span>{labelPrefix}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-track rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full ${fillClassName} rounded-full transition-[width] duration-150 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}



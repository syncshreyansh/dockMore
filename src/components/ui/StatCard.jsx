import React from 'react';


export default function StatCard({
  title,
  titleSubtitle,
  value,
  valueBadge,
  valueSubtitle,
  action,
  icon: Icon,
  children,
  variant = 'panel',
  className = '',
}) {
  const bgClass =
    variant === 'sidebar'
      ? 'bg-sidebar'
      : variant === 'surface'
      ? 'bg-surface'
      : 'bg-white';
  const hasHeader = Boolean(title || titleSubtitle);

  return (
    <div
      className={`${bgClass} rounded-figma p-5 flex flex-col justify-between transition-colors duration-150 ${className}`}
    >
      <div>
        {hasHeader && (
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              {title && (
                <h4 className="text-xs uppercase font-semibold tracking-wider text-muted font-sans">
                  {title}
                </h4>
              )}
              {titleSubtitle && (
                <p className="text-xs text-muted font-medium mt-0.5">
                  {titleSubtitle}
                </p>
              )}
            </div>

            {Icon && (
              <div className="text-ink p-1">
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </div>
            )}
          </div>
        )}

        {value !== undefined && (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="font-sans font-semibold text-2xl xl:text-[28px] leading-tight text-ink tracking-tight">
                  {value}
                </div>
                {valueBadge && <div>{valueBadge}</div>}
              </div>

              {valueSubtitle && (
                <p className="text-xs text-muted mt-1 font-medium">{valueSubtitle}</p>
              )}
            </div>

            {Icon && !hasHeader && (
              <div className="text-ink p-1 shrink-0">
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </div>
            )}
          </div>
        )}

        {children && <div className="mt-2">{children}</div>}
      </div>

      {action && <div className="mt-6 pt-2">{action}</div>}
    </div>
  );
}



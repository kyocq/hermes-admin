import { cn } from '../../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  title,
  subtitle,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-xl overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className={cn('border-b border-dark-700/50', {
          'px-4 py-3': padding === 'sm',
          'px-6 py-4': padding === 'md',
          'px-8 py-5': padding === 'lg',
        })}>
          {title && <h3 className="text-lg font-semibold text-dark-100">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-dark-400">{subtitle}</p>}
        </div>
      )}
      <div className={cn({
        'p-0': padding === 'none',
        'p-4': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
      })}>
        {children}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-dark-100">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span
                className={cn('flex items-center', {
                  'text-green-400': trend.direction === 'up' && trend.value > 0,
                  'text-red-400': trend.direction === 'down' || trend.value < 0,
                })}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-dark-500">vs 上月</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
            {icon}
          </div>
        )}
      </div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-2xl" />
    </Card>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-dark-700 text-dark-300': variant === 'default',
          'bg-green-500/20 text-green-400': variant === 'success',
          'bg-yellow-500/20 text-yellow-400': variant === 'warning',
          'bg-red-500/20 text-red-400': variant === 'error',
          'bg-blue-500/20 text-blue-400': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ value, max = 100, className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={cn('h-2 bg-dark-700 rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={cn(
          'absolute z-50 px-2 py-1 text-xs text-white bg-dark-800 rounded shadow-lg',
          'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
          'transition-all duration-200 whitespace-nowrap',
          positionClasses[position]
        )}
      >
        {content}
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className, circle }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-dark-700/50',
        circle && 'rounded-full',
        !circle && 'rounded',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

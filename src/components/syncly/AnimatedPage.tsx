import { ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
}

interface StaggerChildProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function StaggerChild({ children, index = 0, className = '' }: StaggerChildProps) {
  const delay = `${index * 80}ms`;
  return (
    <div
      className={`animate-slide-up opacity-0 ${className}`}
      style={{ animationDelay: delay, animationFillMode: 'forwards' }}
    >
      {children}
    </div>
  );
}

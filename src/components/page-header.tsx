"use client";

import { BackButton } from "./back-button";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backButtonFallback?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backButtonFallback,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {showBackButton && (
        <div className="mb-4">
          <BackButton fallbackUrl={backButtonFallback} />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

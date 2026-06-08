import type { ReactNode } from "react";
import { DiamondButton } from "./diamond-button";

interface PageHeaderProps {
  title: string;
  description?: string;
  diamond?: boolean;
  actions?: ReactNode;
}

export function PageHeader({ title, description, diamond, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6 mb-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h1>
          {diamond && (
            <span className="inline-flex items-center gap-1 rounded-full bg-diamond/15 px-2.5 py-1 text-xs font-medium text-foreground">
              💎 Diamante
            </span>
          )}
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  );
}

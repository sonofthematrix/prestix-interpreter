"use client";

import { useTranslation } from "@/hooks/useTranslation";
import {
  getSectionConfig,
  getSectionIndexLabel,
} from "@/config/sections";
import { SectionAnchorLink } from "@/components/SectionAnchorLink";

export interface SectionWrapperProps {
  /** Section id from config (e.g. "roadmap", "mission"). */
  sectionId: string;
  /** Content after the title (and optional subtitle). */
  children: React.ReactNode;
  /** Optional extra class names for the section element. */
  className?: string;
  /** If true, render the subtitle paragraph from config (subtitleKey). Default true when subtitleKey is set. */
  showSubtitle?: boolean;
  /** Optional extra class names for the subtitle paragraph. */
  subtitleClassName?: string;
  /** Optional inline styles for the subtitle paragraph. */
  subtitleStyle?: React.CSSProperties;
}

/**
 * Renders a content section with index and title derived from the sections config.
 * Index (01, 02, …) and title come from config; children provide the rest of the section body.
 */
export function SectionWrapper({
  sectionId,
  children,
  className = "",
  showSubtitle = true,
  subtitleClassName,
  subtitleStyle,
}: SectionWrapperProps) {
  const { t } = useTranslation();
  const config = getSectionConfig(sectionId);
  const indexLabel = getSectionIndexLabel(sectionId);

  if (!config) {
    return <>{children}</>;
  }

  const titleId = `${config.id}-title`;
  const hasSubtitle = showSubtitle && config.subtitleKey;

  return (
    <section
      id={config.id}
      className={`border-t border-border px-4 py-12 md:px-6 md:py-16 bg-background ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="mx-auto max-w-4xl">
        <span className="text-sm font-medium text-accent">
          {indexLabel}
        </span>
        <h2
          id={titleId}
          className="mt-2 font-serif text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2 flex-wrap"
        >
          {t(config.titleKey)}
          <SectionAnchorLink sectionId={config.id} />
        </h2>
        <div className="my-4 h-px w-12 bg-accent" aria-hidden />
        {hasSubtitle && (
          <p
            className={`max-w-3xl text-foreground opacity-80 ${subtitleClassName ?? ""}`.trim()}
            style={subtitleStyle}
          >
            {t(config.subtitleKey!)}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

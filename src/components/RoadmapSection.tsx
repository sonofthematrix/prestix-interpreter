"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

function PhaseBlock({
  tag,
  titleKey,
  milestoneKey,
  weeksKey,
  descKey,
  itemKeys,
}: {
  tag: string | null;
  titleKey: string;
  milestoneKey: string;
  weeksKey: string;
  descKey: string;
  itemKeys: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="border-l-2 border-foreground/20 pl-6" style={{ borderColor: 'var(--border)' }}>
      {tag && (
        <span className="inline-block rounded bg-accent px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          {t(tag)}
        </span>
      )}
      <h3 className="mt-3 text-lg font-semibold text-foreground">
        {t(titleKey)}
      </h3>
      <p className="mt-1 font-semibold text-foreground">
        {t(milestoneKey)}
      </p>
      <p className="mt-1 text-sm text-foreground opacity-70">
        {t(weeksKey)}
      </p>
      <p className="mt-4 text-foreground opacity-90">
        {t(descKey)}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-foreground opacity-80">
        {itemKeys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </div>
  );
}

export function RoadmapSection() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <SectionWrapper sectionId="roadmap">
      <p
        className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold [&_strong]:underline-offset-2 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: t("roadmap.intro") }}
      />

        <div className="mt-10 space-y-10">
          <PhaseBlock
            tag="roadmap.phase_here"
            titleKey="roadmap.phase1_title"
            milestoneKey="roadmap.phase1_milestone"
            weeksKey="roadmap.phase1_weeks"
            descKey="roadmap.phase1_desc"
            itemKeys={[
              "roadmap.phase1_progress_1",
              "roadmap.phase1_todo_1",
              "roadmap.phase1_todo_2",
            ]}
          />

          {expanded && (
            <>
              <PhaseBlock
                tag={null}
                titleKey="roadmap.phase2_title"
                milestoneKey="roadmap.phase2_milestone"
                weeksKey="roadmap.phase2_weeks"
                descKey="roadmap.phase2_desc"
                itemKeys={[
                  "roadmap.phase2_item_1",
                  "roadmap.phase2_item_2",
                  "roadmap.phase2_item_3",
                ]}
              />
              <PhaseBlock
                tag={null}
                titleKey="roadmap.phase3_title"
                milestoneKey="roadmap.phase3_milestone"
                weeksKey="roadmap.phase3_weeks"
                descKey="roadmap.phase3_desc"
                itemKeys={[
                  "roadmap.phase3_item_1",
                  "roadmap.phase3_item_2",
                  "roadmap.phase3_item_3",
                ]}
              />
              <PhaseBlock
                tag={null}
                titleKey="roadmap.phase4_title"
                milestoneKey="roadmap.phase4_milestone"
                weeksKey="roadmap.phase4_weeks"
                descKey="roadmap.phase4_desc"
                itemKeys={[
                  "roadmap.phase4_item_1",
                  "roadmap.phase4_item_2",
                  "roadmap.phase4_item_3",
                ]}
              />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-10 rounded-lg border-2 border-border bg-muted-bg px-6 py-3 text-sm font-medium text-foreground hover:border-foreground/30 hover:bg-input-bg"
          aria-expanded={expanded}
        >
          {expanded ? t("roadmap.see_less") : t("roadmap.see_more")}
        </button>
    </SectionWrapper>
  );
}

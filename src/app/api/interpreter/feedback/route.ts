import { NextRequest, NextResponse } from "next/server";
import { jsonLearningStore } from "../../../../lib/interpreter/learningStore";
import type { InterpreterMode } from "../../../../lib/interpreter/types";

type FeedbackBody = {
  type?: unknown;
  sourceText?: unknown;
  wrongOutput?: unknown;
  correctedOutput?: unknown;
  term?: unknown;
  meaning?: unknown;
  examples?: unknown;
  rule?: unknown;
  mode?: unknown;
  note?: unknown;
};

export const dynamic = "force-dynamic";

function isInterpreterMode(value: unknown): value is InterpreterMode {
  return value === "id-en" || value === "en-id";
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: FeedbackBody;

  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ saved: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const sourceText = cleanString(body.sourceText);
  const wrongOutput = cleanString(body.wrongOutput);
  const correctedOutput = cleanString(body.correctedOutput);
  const term = cleanString(body.term);
  const meaning = cleanString(body.meaning);
  const rule = cleanString(body.rule);
  const note = cleanString(body.note);

  if (!isInterpreterMode(body.mode)) {
    return NextResponse.json({ saved: false, error: "Mode must be id-en or en-id." }, { status: 400 });
  }

  try {
    if (body.type === "glossary") {
      if (!term || !meaning) {
        return NextResponse.json(
          { saved: false, error: "term and meaning are required for glossary memory." },
          { status: 400 },
        );
      }

      const memory = await jsonLearningStore.addGlossary({
        term,
        meaning,
        mode: body.mode,
        examples: Array.isArray(body.examples)
          ? body.examples.filter((example): example is string => typeof example === "string")
          : undefined,
      });

      return NextResponse.json({ saved: true, memory });
    }

    if (body.type === "style") {
      if (!rule) {
        return NextResponse.json(
          { saved: false, error: "rule is required for style memory." },
          { status: 400 },
        );
      }

      const memory = await jsonLearningStore.addStyleRule({
        rule,
        mode: body.mode,
      });

      return NextResponse.json({ saved: true, memory });
    }

    if (body.type !== undefined && body.type !== "correction") {
      return NextResponse.json(
        { saved: false, error: "type must be correction, glossary, or style." },
        { status: 400 },
      );
    }

    if (!sourceText || !wrongOutput || !correctedOutput) {
      return NextResponse.json(
        { saved: false, error: "sourceText, wrongOutput, and correctedOutput are required." },
        { status: 400 },
      );
    }

    if (wrongOutput === correctedOutput) {
      return NextResponse.json(
        { saved: false, error: "correctedOutput must differ from wrongOutput." },
        { status: 400 },
      );
    }

    const memory = await jsonLearningStore.addCorrection({
      sourceText,
      wrongOutput,
      correctedOutput,
      mode: body.mode,
      note: note || undefined,
    });

    return NextResponse.json({ saved: true, correction: memory, memory });
  } catch {
    return NextResponse.json(
      { saved: false, error: "Could not save learning memory." },
      { status: 500 },
    );
  }
}

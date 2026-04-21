import { NextResponse } from "next/server";
import OpenAI from "openai";

const qualities = ["standard", "high"] as const;
type Quality = (typeof qualities)[number];

type RefineRequest = {
  title?: unknown;
  description?: unknown;
  instruction?: unknown;
  quality?: unknown;
};

type RefineResponse = {
  title: string;
  description: string;
};

const isQuality = (value: unknown): value is Quality =>
  typeof value === "string" && qualities.includes(value as Quality);

const getTextModelConfig = (quality: Quality) => {
  if (quality === "high") {
    return {
      model: "gpt-5.4" as const,
      reasoning: {
        effort: "medium" as const,
      },
    };
  }

  return {
    model: "gpt-5.4-mini" as const,
    reasoning: {
      effort: "none" as const,
    },
  };
};

const normalizeJsonResponse = (raw: string) => {
  const trimmed = raw.trim();
  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return withoutCodeFence.slice(firstBrace, lastBrace + 1).trim();
  }

  return withoutCodeFence;
};

const isRefineResponse = (value: unknown): value is RefineResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<RefineResponse>;

  return typeof response.title === "string" && typeof response.description === "string";
};

const buildRefinePrompt = ({
  title,
  description,
  instruction,
}: {
  title: string;
  description: string;
  instruction: string;
}) => `Rewrite the following listing copy.

Current title:
"${title}"

Current description:
"${description}"

Instruction:
${instruction}

Rules:
- Rewrite both the title and description.
- Keep meaning accurate.
- Do not invent details.
- Keep it realistic.
- Keep the same language as the original text unless the instruction clearly asks for a different language.
- Do not change the price.
- Output only valid JSON in this exact shape:
{
  "title": "",
  "description": ""
}`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OPENAI_API_KEY. Put it in a project-root .env.local file and restart the dev server.",
        },
        { status: 500 },
      );
    }

    const body = (await req.json()) as RefineRequest;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    const quality = isQuality(body.quality) ? body.quality : "standard";

    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing title or description to refine." },
        { status: 400 },
      );
    }

    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      ...getTextModelConfig(quality),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildRefinePrompt({
                title,
                description,
                instruction,
              }),
            },
          ],
        },
      ],
    });

    const raw = response.output_text;
    const normalized = normalizeJsonResponse(raw);

    let parsed: unknown;

    try {
      parsed = JSON.parse(normalized);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON",
          raw,
        },
        { status: 500 },
      );
    }

    if (!isRefineResponse(parsed)) {
      return NextResponse.json(
        {
          error: "The AI response did not match the expected refine format.",
          raw,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("REFINE ERROR:", error);

    const message = error instanceof Error ? error.message : "Failed to refine listing.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

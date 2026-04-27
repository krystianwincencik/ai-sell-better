import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { getPrisma } from "@/lib/prisma";

const qualities = ["standard", "high"] as const;
type Quality = (typeof qualities)[number];

const platforms = ["olx", "vinted", "facebook"] as const;
type Platform = (typeof platforms)[number];

type ImagePromptOption = {
  title: string;
  prompt: string;
};

type ImagePromptPayload = {
  imageOptions: ImagePromptOption[];
};

type ImagePromptContext = {
  itemName: string;
  listingTitle: string;
  category: string;
  brand: string;
  condition: string;
  platform: Platform;
  defectsNotes: string;
  size: string;
  model: string;
  year: string;
  dimensions: string;
  includedAccessories: string;
};

const SYSTEM_PROMPT = `
You are an expert prompt engineer for product listing images.

Your job is to generate 3 high-quality image generation prompts for marketplace listings.

The prompts should be optimized for clarity, realism, and trustworthiness so that buyers clearly understand the product.

Each prompt must produce a slightly different style of image so the user can choose the best one.

Important global rules:
- Always keep the product as the main subject.
- Use photorealistic lighting and sharp focus.
- Avoid cluttered backgrounds.
- Do not invent features that the product does not have.
- If text, labels, logos, or branding appear on the item, preserve them accurately.
- If the item is used or damaged, do not hide the wear.
- Avoid overly artistic or stylized imagery.
- The item must remain clearly recognizable.
- Use the attached image as the source of truth when details are missing.

You must generate THREE distinct prompts:

1. Studio Listing Image
Clean, simple, professional listing photo.
Neutral or light background.
Focus on clarity and full visibility of the item.

2. Detail / Condition Image
Closer framing or angle that highlights texture, material, condition, labels, wear, ports, seams, or important features.

3. Natural Marketplace Image
More natural environment appropriate for the platform (room setting, clothing context, desk, etc) but still clean and product-focused.

Special rules:
If the item contains readable text:
- keep the exact text
- do not change wording
- do not invent missing text

If the item has damage or wear:
- show the wear honestly

If multiple items are included:
- show them together clearly

Return ONLY JSON in this structure:

{
  "imageOptions": [
    {
      "title": "Studio Listing Image",
      "prompt": "..."
    },
    {
      "title": "Detail / Condition Image",
      "prompt": "..."
    },
    {
      "title": "Natural Marketplace Image",
      "prompt": "..."
    }
  ]
}
`;

const platformDisplayLabels: Record<Platform, string> = {
  olx: "OLX",
  vinted: "Vinted",
  facebook: "Facebook Marketplace",
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

const isQuality = (value: FormDataEntryValue | null): value is Quality =>
  typeof value === "string" && qualities.includes(value as Quality);

const isPlatform = (value: FormDataEntryValue | null): value is Platform =>
  typeof value === "string" && platforms.includes(value as Platform);

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

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

const getImageModelConfig = (quality: Quality) => {
  if (quality === "high") {
    return {
      model: "gpt-image-1" as const,
      quality: "high" as const,
      input_fidelity: "high" as const,
    };
  }

  return {
    model: "gpt-image-1-mini" as const,
    quality: "low" as const,
  };
};

const isImagePromptPayload = (value: unknown): value is ImagePromptPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ImagePromptPayload>;

  return (
    Array.isArray(payload.imageOptions) &&
    payload.imageOptions.length >= 3 &&
    payload.imageOptions.every((option) => {
      if (!option || typeof option !== "object") {
        return false;
      }

      const imageOption = option as Partial<ImagePromptOption>;
      return (
        typeof imageOption.title === "string" &&
        imageOption.title.trim().length > 0 &&
        typeof imageOption.prompt === "string" &&
        imageOption.prompt.trim().length > 0
      );
    })
  );
};

const buildUserPrompt = ({
  itemName,
  listingTitle,
  category,
  brand,
  condition,
  platform,
  defectsNotes,
  size,
  model,
  year,
  dimensions,
  includedAccessories,
}: ImagePromptContext) => `
Create 3 image prompts for this marketplace item.

Use the attached image to infer any missing details conservatively.

ITEM INFO
Name: ${itemName || "unknown"}
Listing title: ${listingTitle || "unknown"}
Category: ${category || "unknown"}
Brand: ${brand || "unknown"}
Condition: ${condition || "unknown"}
Platform: ${platformDisplayLabels[platform]}

OPTIONAL DETAILS
Size: ${size || "unknown"}
Model: ${model || "unknown"}
Year: ${year || "unknown"}
Dimensions: ${dimensions || "unknown"}
Included accessories: ${includedAccessories || "unknown"}
Defects / notes: ${defectsNotes || "none provided"}

IMAGE ANALYSIS RULES
- Determine from the image whether readable text, logos, wear, damage, or multiple included items are visible.
- If something is unclear, stay conservative.
- If the item is worn or damaged, keep it visible in the prompts.

Goal:
Create three different prompts that produce three different high-quality listing images.

The prompts should:
- make the item clear and recognizable
- help buyers understand condition and quality
- look natural for resale marketplaces

Avoid:
- fake text
- unrealistic objects
- overly stylized photography
- hiding wear or damage
`;

const buildFallbackPromptOptions = ({
  itemName,
  listingTitle,
  category,
  brand,
  condition,
  platform,
  defectsNotes,
}: ImagePromptContext): ImagePromptOption[] => {
  const itemLabel = itemName || listingTitle || `${brand} ${category}`.trim() || "item";
  const conditionNote =
    condition || defectsNotes
      ? `Show the condition honestly${condition ? `, including a ${condition.toLowerCase()} state` : ""}${
          defectsNotes ? ` and any visible issues like ${defectsNotes}` : ""
        }.`
      : "Keep any visible wear or use marks honest and realistic.";
  const platformHint =
    platform === "vinted"
      ? "Keep the styling simple and fashion-resale friendly."
      : platform === "facebook"
        ? "Keep it natural and trustworthy for a local marketplace."
        : "Keep it clear and practical for a negotiation-driven marketplace listing.";

  return [
    {
      title: "Studio Listing Image",
      prompt: `Photorealistic studio marketplace photo of the uploaded ${itemLabel}. Clean light background, full item visibility, sharp focus, realistic lighting, and accurate colors. ${conditionNote} ${platformHint}`,
    },
    {
      title: "Detail / Condition Image",
      prompt: `Photorealistic close detail shot of the uploaded ${itemLabel}. Focus on material, texture, seams, ports, labels, branding, and condition details. Keep readable text exact, show wear honestly, and use clean realistic lighting.`,
    },
    {
      title: "Natural Marketplace Image",
      prompt: `Photorealistic marketplace photo of the uploaded ${itemLabel} in a clean natural setting appropriate for ${platformDisplayLabels[platform]}. Keep the product centered, recognizable, and realistic with tidy surroundings and honest condition.`,
    },
  ];
};

const withImageGuardrails = (prompt: string) => `${prompt}

Non-negotiable rules:
- Use the uploaded photo as the ground truth.
- Keep the product identical in shape, color, branding, text, materials, and included items.
- Do not add, remove, or change product features.
- Do not hide wear, flaws, or damage that are visible.
- Keep the output photorealistic and marketplace-appropriate.`;

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
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

    const formData = await req.formData();
    const image = formData.get("image");
    const listingId = getFormValue(formData, "listingId");
    const qualityEntry = formData.get("quality");
    const platformEntry = formData.get("platform");
    const quality = isQuality(qualityEntry) ? qualityEntry : "standard";
    const platform = isPlatform(platformEntry) ? platformEntry : "olx";
    const { userId } = await auth();

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "No image file was uploaded." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The uploaded file must be an image." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageUrl = `data:${image.type};base64,${imageBuffer.toString("base64")}`;
    const client = new OpenAI({ apiKey });

    const promptContext: ImagePromptContext = {
      itemName: getFormValue(formData, "itemName"),
      listingTitle: getFormValue(formData, "listingTitle"),
      category: getFormValue(formData, "category"),
      brand: getFormValue(formData, "brand"),
      condition: getFormValue(formData, "condition"),
      platform,
      defectsNotes: getFormValue(formData, "defectsNotes"),
      size: getFormValue(formData, "size"),
      model: getFormValue(formData, "model"),
      year: getFormValue(formData, "year"),
      dimensions: getFormValue(formData, "dimensions"),
      includedAccessories: getFormValue(formData, "includedAccessories"),
    };

    let imagePromptOptions = buildFallbackPromptOptions(promptContext);

    try {
      const promptResponse = await client.responses.create({
        ...getTextModelConfig(quality),
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildUserPrompt(promptContext),
              },
              {
                type: "input_image",
                image_url: imageUrl,
                detail: "auto",
              },
            ],
          },
        ],
      });

      const raw = promptResponse.output_text;
      const normalized = normalizeJsonResponse(raw);
      const parsed: unknown = JSON.parse(normalized);

      if (isImagePromptPayload(parsed)) {
        imagePromptOptions = parsed.imageOptions.slice(0, 3);
      }
    } catch (promptError) {
      console.error("IMAGE PROMPT GENERATION ERROR:", promptError);
    }

    const responses = await Promise.allSettled(
      imagePromptOptions.map(async (option, index) => {
        const variationImage = await toFile(
          imageBuffer,
          image.name || `product-image-${index + 1}.png`,
          {
            type: image.type,
          },
        );

        return client.images.edit({
          ...getImageModelConfig(quality),
          image: variationImage,
          prompt: withImageGuardrails(option.prompt),
          stream: false,
          size: "1024x1024",
          output_format: "png",
          n: 1,
        });
      }),
    );

    const imagePayloads = responses.flatMap((response) => {
      if (response.status !== "fulfilled") {
        return [];
      }

      return response.value.data ?? [];
    });

    const images = imagePayloads
      .map((imageData) => imageData.b64_json)
      .filter((imageData): imageData is string => typeof imageData === "string")
      .map((imageData) => `data:image/png;base64,${imageData}`);

    if (images.length === 0) {
      return NextResponse.json(
        { error: "The AI response did not include any improved images." },
        { status: 500 },
      );
    }

    if (listingId && userId) {
      try {
        await prisma.listing.updateMany({
          where: {
            id: listingId,
            userId,
          },
          data: {
            imageUrl: images[0],
            improvedImages: images,
          },
        });
      } catch (saveError) {
        console.error("IMPROVED IMAGE SAVE ERROR:", saveError);
      }
    } else if (listingId && !userId) {
      console.warn("Skipping improved image persistence because no signed-in user was found.");
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("IMAGE IMPROVEMENT ERROR:", error);

    const message = error instanceof Error ? error.message : "Failed to improve image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

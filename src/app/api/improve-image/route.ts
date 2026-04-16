import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

const qualities = ["standard", "high"] as const;
type Quality = (typeof qualities)[number];

const isQuality = (value: FormDataEntryValue | null): value is Quality =>
  typeof value === "string" && qualities.includes(value as Quality);

const buildImageImprovementPrompt = () => `Improve this product photo for a marketplace listing.

Rules:
- Enhance lighting and clarity.
- Clean up distractions and make the background feel tidy.
- Keep the product exactly the same.
- Keep the colors, shape, materials, and visible details accurate.
- Make it realistic and professional.
- Do not add props, hands, extra objects, text, logos, or branding.
- Do not crop out important parts of the product.`;

const variationPrompts = [
  "Use studio lighting, cleaner shadows, and a premium catalog feel.",
  "Use soft natural lighting, gentle shadows, and a calm lifestyle feel.",
  "Use bright e-commerce lighting with a very clean, distraction-free background.",
] as const;

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

    const formData = await req.formData();
    const image = formData.get("image");
    const qualityEntry = formData.get("quality");
    const quality = isQuality(qualityEntry) ? qualityEntry : "standard";

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
    const client = new OpenAI({ apiKey });
    const responses = await Promise.allSettled(
      variationPrompts.map(async (variationPrompt, index) => {
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
          prompt: `${buildImageImprovementPrompt()}\n- Style direction: ${variationPrompt}`,
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

    return NextResponse.json({ images });
  } catch (error) {
    console.error("IMAGE IMPROVEMENT ERROR:", error);

    const message = error instanceof Error ? error.message : "Failed to improve image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

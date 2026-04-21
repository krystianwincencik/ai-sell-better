import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const platforms = ["olx", "vinted", "facebook"] as const;
type Platform = (typeof platforms)[number];
const qualities = ["standard", "high"] as const;
type Quality = (typeof qualities)[number];

type VintedExtras = {
  size: string;
};

type AdditionalDetails = {
  condition: string;
  originalPrice: string;
  defectsNotes: string;
  size: string;
  model: string;
  year: string;
  dimensions: string;
  includedAccessories: string;
};

type GeneratedListing = {
  title: string;
  description: string;
  price: string;
  category: string;
  brand: string;
  keySellingPoints: string[];
  pricing: {
    currency: string;
    platform: string;
    priceRange: {
      low: number;
      recommended: number;
      high: number;
    };
    quickSalePrice: number;
    patientSalePrice: number;
    confidence: "low" | "medium" | "high";
    reasoning: string[];
    notes: string;
  };
};

const platformDisplayLabels = {
  olx: "OLX",
  vinted: "Vinted",
  facebook: "Facebook Marketplace",
} as const;

const olxCategories = [
  "Antyki i Kolekcje",
  "Motoryzacja",
  "Dom i Ogród",
  "Elektronika",
  "Moda",
  "Rolnictwo",
  "Zwierzęta",
  "Sport i Hobby",
  "Muzyka i Edukacja",
  "Dla Dzieci",
  "Zdrowie i Uroda",
];

const facebookCategories = [
  "Pojazdy",
  "Elektronika",
  "Odzież",
  "Artykuły domowe",
  "Ogród i otoczenie",
  "Hobby",
  "Instrumenty muzyczne",
  "Zabawki i gry",
  "Artykuły sportowe",
  "Dla rodziny",
  "Artykuły dla zwierząt domowych",
];

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

const isGeneratedListing = (value: unknown): value is GeneratedListing => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const listing = value as Partial<GeneratedListing>;
  const pricing = listing.pricing;

  return (
    typeof listing.title === "string" &&
    typeof listing.description === "string" &&
    typeof listing.price === "string" &&
    typeof listing.category === "string" &&
    typeof listing.brand === "string" &&
    Array.isArray(listing.keySellingPoints) &&
    listing.keySellingPoints.every((point) => typeof point === "string") &&
    !!pricing &&
    typeof pricing === "object" &&
    typeof pricing.currency === "string" &&
    typeof pricing.platform === "string" &&
    !!pricing.priceRange &&
    typeof pricing.priceRange.low === "number" &&
    typeof pricing.priceRange.recommended === "number" &&
    typeof pricing.priceRange.high === "number" &&
    typeof pricing.quickSalePrice === "number" &&
    typeof pricing.patientSalePrice === "number" &&
    Array.isArray(pricing.reasoning) &&
    pricing.reasoning.every((reason) => typeof reason === "string") &&
    typeof pricing.notes === "string"
  );
};

const isPlatform = (value: FormDataEntryValue | null): value is Platform =>
  typeof value === "string" && platforms.includes(value as Platform);

const isQuality = (value: FormDataEntryValue | null): value is Quality =>
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

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const buildProductNameInstructions = (productName: string) => {
  if (!productName) {
    return `Product name: not provided

IMPORTANT:
- If product name is not provided, infer the item identity from the image conservatively.
- Do not invent a brand, model, or product name unless it is visible or strongly supported by the image.`;
  }

  return `Product name: ${productName}

IMPORTANT:
- If product name is provided, prioritize it over image inference.
- Use the product name as the base of the title.
  - Use the image only to enrich details such as color, condition, material, completeness, fit, and visible flaws.`;
};

const buildQualityInstructions = (quality: Quality) => {
  if (quality === "high") {
    return `Generation quality: high

IMPORTANT:
- Spend extra effort analyzing the image and user details before writing.
- Make the listing more polished, specific, and complete while staying honest.
- Prefer stronger search keywords, clearer structure, and more buyer-useful details.`;
  }

  return `Generation quality: standard

IMPORTANT:
- Keep the listing concise, clear, and practical.
- Focus on the strongest obvious details without over-explaining.
- Stay accurate and readable.`;
};

const buildBrandCategoryInstructions = ({
  brand,
  category,
  allowedCategories,
  categoryFallback,
}: {
  brand: string;
  category: string;
  allowedCategories?: string[];
  categoryFallback: string;
}) => {
  const categoryRule = allowedCategories
    ? `- Category must match exactly one of these allowed platform categories: ${allowedCategories.join(", ")}`
    : `- ${categoryFallback}`;

  return `Extra user details:
- Brand: ${brand || "not specified"}
- Category: ${category || "not specified"}

Also determine:
- The most appropriate category
- The brand (if visible or known)

Rules:
- If a brand is provided by the user, prioritize it.
- If product name includes a brand, use it.
- If brand is unclear, return an empty string.
${categoryRule}`;
};

const buildAdditionalDetailsInstructions = (details: AdditionalDetails) => `Additional item details:
- Condition: ${details.condition || "not specified"}
- Original price: ${details.originalPrice || "not specified"}
- Defects / notes: ${details.defectsNotes || "not specified"}
- Size: ${details.size || "not specified"}
- Model: ${details.model || "not specified"}
- Year: ${details.year || "not specified"}
- Dimensions: ${details.dimensions || "not specified"}
- Included accessories: ${details.includedAccessories || "not specified"}

Rules:
- Prioritize provided details over image inference when they help identify the item, completeness, or pricing.
- Use these details in both the listing copy and the pricing estimate when relevant.
- Treat defects, missing parts, and used condition as material pricing factors.`;

const buildOutputRequirements = (categoryRule: string) => `OUTPUT REQUIREMENTS:
Return ONLY valid JSON in this exact shape:

{
  "title": "",
  "description": "",
  "price": "",
  "category": "",
  "brand": "",
  "keySellingPoints": [],
  "pricing": {
    "currency": "PLN",
    "platform": "",
    "priceRange": {
      "low": 0,
      "recommended": 0,
      "high": 0
    },
    "quickSalePrice": 0,
    "patientSalePrice": 0,
    "confidence": "low | medium | high",
    "reasoning": [],
    "notes": ""
  }
}

OUTPUT RULES:
- Title: one line only
- Description: structured and readable
- Price: must exactly match pricing.priceRange as "low-high PLN" using the same numbers
- Category: ${categoryRule}
- Brand: use the provided or detected brand, otherwise return an empty string
- Key selling points: 3-5 short bullet-like phrases
- pricing.currency: always "PLN"
- pricing.platform: match the current platform exactly
- pricing.reasoning: 3 short practical factors
- pricing.notes: short practical advice
- No markdown
- No extra text outside JSON`;

const buildPricingPrompt = ({
  platform,
  productName,
  brand,
  category,
  details,
}: {
  platform: Platform;
  productName: string;
  brand: string;
  category: string;
  details: AdditionalDetails;
}) => `PRICING INTELLIGENCE INSTRUCTIONS:
You are a pricing intelligence assistant for resale marketplace listings.

Your job is to estimate a realistic selling price for an item using general market knowledge and common resale pricing patterns.

You do NOT have access to live marketplace data.
Do NOT pretend to browse, search, or reference real listings.
Do NOT invent sources.
Instead, produce a grounded estimate based on item type, brand, condition, demand, and typical resale behavior.

INPUT:
You may receive:
- product name and/or image
- platform (${platformDisplayLabels[platform]})
- optional details such as brand, condition, size, category, color, material, completeness, and age

Item details for pricing:
- Product name: ${productName || "not provided"}
- Platform: ${platformDisplayLabels[platform]}
- Brand: ${brand || "not specified"}
- Category: ${category || "not specified"}
- Size: ${details.size || "not specified"}
- Condition: ${details.condition || "not specified"}
- Original price: ${details.originalPrice || "not specified"}
- Defects / notes: ${details.defectsNotes || "not specified"}
- Model: ${details.model || "not specified"}
- Year: ${details.year || "not specified"}
- Dimensions: ${details.dimensions || "not specified"}
- Included accessories: ${details.includedAccessories || "not specified"}

TASK:

1. Understand the item
- Identify what the product most likely is
- Determine category, brand strength, and buyer demand
- Assess how condition, completeness, age, and seasonality affect value
- If the item is unclear, be conservative and say so in the notes

2. Estimate market positioning
- Infer what similar items typically sell for in the resale market
- Think in terms of low-end, mid-range, and high-end positioning
- Decide how wide the price range should be based on certainty
- Use broad ranges when the item is unusual, unclear, or weakly branded

3. Apply platform behavior

Vinted:
- usually lower-priced and more competitive
- buyers expect deals
- pricing should generally be lean and realistic

OLX:
- negotiation-heavy
- sellers often list above target to leave room for offers
- the starting price may be higher than the amount the seller expects to get

Facebook Marketplace:
- local and flexible
- pricing should be fair, simple, and easy to negotiate
- demand can vary by area and category

4. Generate pricing
You must estimate:
- low price = fast-sale price
- recommended price = best default listing price
- high price = optimistic listing price before negotiation
- quick sale price = fastest realistic sale price
- patient sale price = higher price for a slower sale

PRICING RULES:
- Use ranges, not fake precision
- Keep the recommended price within the overall range
- Keep quick sale at or below the low end when appropriate
- Keep patient sale at or above the high end when appropriate
- If confidence is low, widen the range
- Strong brands, rare items, or high demand justify higher pricing
- Weak brands, generic items, damage, or missing parts justify lower pricing
- Condition must materially affect the estimate
- Avoid unrealistic optimistic pricing
- Ensure the item could realistically sell at the suggested price
- Prefer conservative estimates over inflated ones

IMPORTANT:
- Return realistic pricing, not optimistic pricing
- Do not claim exact research or specific listings
- Do not fabricate sources
- The goal is a price that will actually sell`;

const buildVintedPrompt = ({
  platform,
  productName,
  brand,
  category,
  vintedExtras,
  details,
}: {
  platform: Platform;
  productName: string;
  brand: string;
  category: string;
  vintedExtras: VintedExtras;
  details: AdditionalDetails;
}) => `You are an expert Vinted seller and listing writer.

Your job is to create a high-performing Vinted listing from the provided image and any extra user details.

${buildProductNameInstructions(productName)}

${buildBrandCategoryInstructions({
  brand,
  category,
  categoryFallback:
    "If category is provided, prioritize it. If not, infer a concise Vinted category from the image or return an empty string if unclear.",
})}

${buildAdditionalDetailsInstructions(details)}

Extra Vinted details:
- Size: ${vintedExtras.size || "not specified"}
- Condition: ${details.condition || "not specified"}

Use the strongest patterns from successful Vinted listings:
- Titles must be concise, searchable, and natural
- Titles should prioritize the most important keywords first
- Descriptions must be structured, honest, and easy to scan
- The listing should feel real, trustworthy, and attractive to buyers

INTERNAL GUIDELINES YOU MUST FOLLOW:
1. Title style:
- Aim for about 60-80 characters if possible
- Start with the most important searchable information
- Best structure is usually:
  Brand + Item Type + Color/Pattern + Size + Condition
- If brand is known, include it
- If a distinctive style, material, or detail helps search, include it
- Avoid filler words, emojis, all caps, hashtags, and unrelated keywords
- Make the title readable by humans and useful for search

2. Description style:
- Keep it concise but informative
- Use short lines, bullets, or short paragraphs
- Include:
  - size
  - condition
  - material/fabric if visible or provided
  - measurements if available
  - key features or fit/style details
  - a short personal note if it feels natural
  - shipping info only if relevant and true
- Be specific and honest
- Mention flaws, wear, missing tags, or other issues if visible or known
- Avoid huge unbroken paragraphs
- Avoid one-line vague descriptions

3. Trust and quality rules:
- Do not invent details that are not visible or provided
- If something is unclear, infer carefully and conservatively
- Prioritize honesty over hype
- Make the item sound desirable but realistic
- Keep the tone friendly, natural, and trustworthy

4. What works best:
- Clear keyword-rich titles
- Structured descriptions
- Honest condition statements
- Specific details instead of generic praise
- A human, casual seller tone

5. What to avoid:
- Titles like "Cute top" or "Dress"
- Keyword stuffing
- Random emojis
- Overly long descriptions
- Empty fluff
- Misleading claims about condition or size

${buildPricingPrompt({
  platform,
  productName,
  brand,
  category,
  details,
})}

${buildOutputRequirements(
  "use the provided or inferred Vinted category, otherwise return an empty string",
)}

If the image is a clothing item, prioritize:
- brand
- item type
- color/pattern
- size
- condition
- fabric/material
- measurements if available

If the image is not clothing, still keep the same Vinted style:
- searchable title
- concise description
- honest condition
- clear item identity`;

const buildOlxPrompt = ({
  platform,
  productName,
  brand,
  category,
  details,
}: {
  platform: Platform;
  productName: string;
  brand: string;
  category: string;
  details: AdditionalDetails;
}) => `You are an expert OLX seller and listing writer.

Your job is to create a high-performing OLX listing from the provided image and any extra user details.

${buildProductNameInstructions(productName)}

${buildBrandCategoryInstructions({
  brand,
  category,
  allowedCategories: olxCategories,
  categoryFallback: "If category is not provided, infer the most suitable OLX category from the image.",
})}

${buildAdditionalDetailsInstructions(details)}

Use the strongest patterns from successful OLX listings:
- Titles must be concise, specific, and searchable
- Titles should lead with the most important information first
- Descriptions must be clear, structured, and useful
- The listing should feel real, trustworthy, and easy for buyers to scan

INTERNAL GUIDELINES YOU MUST FOLLOW:

1. Title style:
- Start with the actual item or product name first
- Then add the most important searchable details
- Include brand/model if known
- Include key specs when relevant:
  - year
  - size
  - capacity
  - material
  - condition
  - color
  - engine/specs for vehicles
  - measurements for furniture or clothing
  - quantity or set info when relevant
- Use natural, readable wording
- Keep it short, direct, and information-dense
- Avoid filler words, hype, emojis, ALL CAPS, and vague phrases
- Do not begin with unnecessary fluff unless the category naturally benefits from "Sprzedam" or a similar intro
- In most cases, the strongest title is:
  [Brand/Item] [Model/Type] [Key Spec] [Condition/Size]
- Use separators like commas, dashes, or pipes only if they improve readability

2. Description style:
- Keep it structured and easy to scan
- Use short paragraphs or bullet-like lines
- Start with a brief intro that states what is being sold
- Then include the most important details buyers expect
- Focus on:
  - condition
  - exact specs
  - completeness / what is included
  - history or usage
  - important extras
  - compatibility, if relevant
  - reason for sale only if it feels natural
- End with a polite call to action if appropriate
- Be factual, honest, and readable
- Avoid giant unbroken paragraphs
- Avoid descriptions that are too short or too vague

3. Trust and quality rules:
- Do not invent details that are not visible or provided
- If something is unclear, infer carefully and conservatively
- Prioritize honesty over hype
- Mention flaws, wear, missing parts, or other issues if visible or known
- Make the item sound desirable but realistic

4. Category-aware guidance:
Use category-specific details when relevant:
- Antyki i Kolekcje: rarity, age, provenance, material, set/collection info
- Motoryzacja: brand, model, year, engine, mileage, service history, condition
- Dom i Ogród: dimensions, material, brand, set contents, installation type, condition
- Elektronika: brand, model, storage/RAM, color, battery/condition, warranty, accessories
- Moda: size, brand, type, material, color, fit, condition, measurements
- Rolnictwo: brand, model, year, hours, power, condition, equipment, service history
- Zwierzęta: breed/species, age, sex, health, vaccinations, temperament, documents
- Sport i Hobby: brand, model, size/length, condition, accessories, performance specs
- Muzyka i Edukacja: brand, model, edition/year, condition, extras, usage history
- Dla Dzieci: brand, set contents, age suitability, completeness, condition, safety info
- Zdrowie i Uroda: brand, product name, size/volume, condition, authenticity, expiry if relevant

5. What works best:
- Specificity
- Completeness
- Clear structure
- Honest condition
- Searchable keywords placed early
- A tone that is factual, polite, and natural

6. What to avoid:
- Vague titles like "Okazja", "Sprzedam", "Hit", "Super stan" with no details
- Excess punctuation or all-caps
- Keyword stuffing
- Irrelevant buzzwords
- Overly short descriptions
- Overly promotional language
- Typos and sloppy formatting

${buildPricingPrompt({
  platform,
  productName,
  brand,
  category,
  details,
})}

${buildOutputRequirements(`choose exactly one of: ${olxCategories.join(", ")}`)}

If the item is a vehicle or machine:
- prioritize brand, model, year, engine/power, mileage or hours, and condition

If the item is clothing:
- prioritize brand, type, size, color, material, fit, and condition

If the item is electronics:
- prioritize brand, model, memory/storage, color, battery or condition, and included accessories

If the item is a collectible:
- prioritize item type, collection details, rarity, age, and condition

If the image shows an item that fits one of the listed OLX categories, adapt the output to that category naturally.`;

const buildFacebookPrompt = ({
  platform,
  productName,
  brand,
  category,
  details,
}: {
  platform: Platform;
  productName: string;
  brand: string;
  category: string;
  details: AdditionalDetails;
}) => `You are an expert Facebook Marketplace seller and listing writer.

Your job is to create a high-performing Facebook Marketplace listing from the provided image and any extra user details.

${buildProductNameInstructions(productName)}

${buildBrandCategoryInstructions({
  brand,
  category,
  allowedCategories: facebookCategories,
  categoryFallback:
    "If category is not provided, infer the most suitable Facebook Marketplace category from the image.",
})}

${buildAdditionalDetailsInstructions(details)}

Use the strongest patterns from successful Facebook Marketplace listings:
- Titles must be concise, clear, and searchable
- Titles should lead with the most important information first
- Descriptions must be factual, structured, and easy to scan
- The listing should feel trustworthy, natural, and buyer-focused

INTERNAL GUIDELINES YOU MUST FOLLOW:

1. Title style:
- Start with the most searchable words first, usually brand + item/model
- Include key specs early:
  - year
  - size
  - color
  - condition
  - capacity
  - mileage
  - dimensions
  - storage
  - model number
  - included extras
- Keep titles short and mobile-friendly, ideally around 50-80 characters when possible
- Use natural wording that real buyers would search for
- Avoid ALL CAPS, excessive punctuation, emojis, spammy hype, or vague terms like "great deal"
- Do not make the title overly promotional
- Good title structure is usually:
  [Brand] [Item/Model] - [Key Detail(s)]
- If relevant, include condition words like:
  new, like new, excellent condition, lightly used, clean title, mint

2. Description style:
- Start with a short hook that says what is being sold and why it stands out
- Then give the most important facts first
- Use bullet points or short paragraphs for readability
- Include:
  - condition
  - specs
  - size or measurements
  - year, mileage, storage, or model number when relevant
  - included accessories or extras
  - any flaws or wear
  - price justification if useful
  - pickup or delivery details if relevant
- End with a clear call to action such as:
  - Message me for more details
  - Message me to schedule pickup
  - Let me know if interested
- Keep the tone friendly, professional, and factual
- Avoid long stories, fluff, or marketing slogans

3. Trust and quality rules:
- Do not invent details that are not visible or provided
- If something is unclear, infer carefully and conservatively
- Prioritize honesty over hype
- Mention flaws, wear, missing parts, or defects if visible or known
- Be specific about what is included
- Make the item sound desirable but realistic

4. Category-aware guidance:
Use category-specific details naturally when relevant:
- Vehicles: year, make, model, trim, mileage, condition, service history, clean title, features
- Electronics: brand, model, storage, battery, condition, accessories, unlocked status
- Clothing: brand, item type, size, gender, material, fit, measurements, condition
- Home Goods: dimensions, material, brand/style, condition, included parts, wear
- Garden / Outdoor: item type, brand, size/power, usage, maintenance, condition, extras
- Hobby / Collectibles: brand, series, edition, completeness, rarity, condition
- Musical Instruments: brand, model, condition, accessories, tone/specs, usage history
- Toys / Games: brand, exact item name, set number, completeness, condition, age range
- Family / Baby: brand, model, age range, safety, completeness, condition, wear
- Pet Supplies: item type, size, brand, condition, material, accessories, ease of cleaning

5. What works best:
- Brand/model first
- Key specs early
- Short, readable structure
- Honest condition language
- Useful buyer-facing details
- A clear final call to action

6. What to avoid:
- Vague titles like "for sale", "great condition", "must see"
- ALL CAPS
- Too many exclamation points
- Missing price
- Missing brand/model/specs when relevant
- Duplicate or copy-paste descriptions
- Overly long, rambling text
- Fake urgency or misleading claims

${buildPricingPrompt({
  platform,
  productName,
  brand,
  category,
  details,
})}

${buildOutputRequirements(`choose exactly one of: ${facebookCategories.join(", ")}`)}

If the item is a vehicle:
- prioritize year, make, model, mileage, condition, and key features

If the item is electronics:
- prioritize brand, model, storage, condition, accessories, and whether it is unlocked or tested

If the item is clothing:
- prioritize brand, item type, size, color, fit, material, and condition

If the item is furniture or home goods:
- prioritize dimensions, material, condition, style, and included parts

If the item is a collectible, hobby item, toy, or instrument:
- prioritize brand, model, edition/series, completeness, and condition

Keep the output realistic for Facebook Marketplace, where buyers prefer direct, factual, and trustworthy listings.`;

const buildPrompt = ({
  platform,
  category,
  brand,
  productName,
  quality,
  vintedExtras,
  details,
}: {
  platform: Platform;
  category: string;
  brand: string;
  productName: string;
  quality: Quality;
  vintedExtras: VintedExtras;
  details: AdditionalDetails;
}) => {
  const qualityInstructions = buildQualityInstructions(quality);

  switch (platform) {
    case "vinted":
      return `${qualityInstructions}

${buildVintedPrompt({
        platform,
        productName,
        brand,
        category,
        vintedExtras,
        details,
      })}`;
    case "olx":
      return `${qualityInstructions}

${buildOlxPrompt({
        platform,
        productName,
        brand,
        category,
        details,
      })}`;
    case "facebook":
      return `${qualityInstructions}

${buildFacebookPrompt({
        platform,
        productName,
        brand,
        category,
        details,
      })}`;
  }
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
    const { userId } = await auth();
    const image = formData.get("image");
    const platformEntry = formData.get("platform");
    const platform = isPlatform(platformEntry) ? platformEntry : "olx";
    const qualityEntry = formData.get("quality");
    const quality = isQuality(qualityEntry) ? qualityEntry : "standard";
    const category = getFormValue(formData, "category");
    const brand = getFormValue(formData, "brand");
    const productName = getFormValue(formData, "productName");
    const details: AdditionalDetails = {
      condition: getFormValue(formData, "condition"),
      originalPrice: getFormValue(formData, "originalPrice"),
      defectsNotes: getFormValue(formData, "defectsNotes"),
      size: getFormValue(formData, "size"),
      model: getFormValue(formData, "model"),
      year: getFormValue(formData, "year"),
      dimensions: getFormValue(formData, "dimensions"),
      includedAccessories: getFormValue(formData, "includedAccessories"),
    };
    const vintedExtras: VintedExtras = {
      size: details.size,
    };

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "No image file was uploaded." },
        { status: 400 },
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The uploaded file must be an image." },
        { status: 400 },
      );
    }

    const base64Image = Buffer.from(await image.arrayBuffer()).toString("base64");
    const imageUrl = `data:${image.type};base64,${base64Image}`;
    const prompt = buildPrompt({
      platform,
      category,
      brand,
      productName,
      quality,
      vintedExtras,
      details,
    });
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      ...getTextModelConfig(quality),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
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

    if (!isGeneratedListing(parsed)) {
      return NextResponse.json(
        { error: "The AI response did not match the expected listing format." },
        { status: 500 },
      );
    }

    let savedListingId: string | undefined;

    try {
      const savedListing = await prisma.listing.create({
        data: {
          userId,
          title: parsed.title,
          description: parsed.description,
          platform,
          category: parsed.category || null,
          brand: parsed.brand || null,
          keySellingPoints: parsed.keySellingPoints,
          priceLow: parsed.pricing.priceRange.low,
          priceRecommended: parsed.pricing.priceRange.recommended,
          priceHigh: parsed.pricing.priceRange.high,
          quickSalePrice: parsed.pricing.quickSalePrice,
          patientSalePrice: parsed.pricing.patientSalePrice,
          imageUrl,
        },
      });

      savedListingId = savedListing.id;
    } catch (saveError) {
      console.error("LISTING SAVE ERROR:", saveError);
    }

    return NextResponse.json(
      savedListingId
        ? {
            ...parsed,
            savedListingId,
          }
        : parsed,
    );
  } catch (error) {
    console.error("ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error generating listing.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

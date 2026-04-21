"use client";

import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Check, Copy, RefreshCcw, Settings, Upload } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState, type ComponentType } from "react";

type Platform = "olx" | "vinted" | "facebook";
type Quality = "standard" | "high";
type Language = "en" | "pl";

type VintedExtras = {
  size: string;
};

type Listing = {
  title: string;
  description: string;
  price: string;
  category?: string;
  brand?: string;
  keySellingPoints: string[];
  savedListingId?: string;
  pricing?: {
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

type RefinedListingCopy = {
  title: string;
  description: string;
};

type ImprovedImagesPayload = {
  images: string[];
};

type ErrorPayload = {
  error?: string;
  raw?: string;
};

type MarketplaceIconProps = {
  className?: string;
};

const isListing = (value: unknown): value is Listing => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const listing = value as Partial<Listing>;

  return (
    typeof listing.title === "string" &&
    typeof listing.description === "string" &&
    typeof listing.price === "string" &&
    Array.isArray(listing.keySellingPoints) &&
    listing.keySellingPoints.every((point) => typeof point === "string")
  );
};

const isErrorPayload = (value: unknown): value is ErrorPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "error" in value || "raw" in value;
};

const isRefinedListingCopy = (value: unknown): value is RefinedListingCopy => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const listing = value as Partial<RefinedListingCopy>;

  return typeof listing.title === "string" && typeof listing.description === "string";
};

const isImprovedImagesPayload = (value: unknown): value is ImprovedImagesPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ImprovedImagesPayload>;

  return Array.isArray(payload.images) && payload.images.every((image) => typeof image === "string");
};

const skeletonClassName =
  "animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200";
const maxFileSize = 5 * 1024 * 1024;
const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const vintedSizes = [
  { value: "XXS", label: { en: "XXS", pl: "XXS" } },
  { value: "XS", label: { en: "XS", pl: "XS" } },
  { value: "S", label: { en: "S", pl: "S" } },
  { value: "M", label: { en: "M", pl: "M" } },
  { value: "L", label: { en: "L", pl: "L" } },
  { value: "XL", label: { en: "XL", pl: "XL" } },
  { value: "XXL", label: { en: "XXL", pl: "XXL" } },
  { value: "One size", label: { en: "One size", pl: "Uniwersalny" } },
];
const vintedConditions = [
  { value: "New with tags", label: { en: "New with tags", pl: "Nowe z metką" } },
  { value: "Very good", label: { en: "Very good", pl: "Bardzo dobry" } },
  { value: "Good", label: { en: "Good", pl: "Dobry" } },
];
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

const uiCopy: Record<
  Language,
  {
    appTitle: string;
    languageLabel: string;
    signIn: string;
    signUp: string;
    chooseMarketplace: string;
    productNamePlaceholder: string;
    productNameHint: string;
    uploadPrompt: string;
    dropzoneTitle: string;
    dropzoneSubtitle: string;
    remove: string;
    generating: string;
    generateListing: string;
    customize: string;
    highQuality: string;
    highQualityOn: string;
    standard: string;
    vintedDetails: string;
    size: string;
    selectSize: string;
    condition: string;
    selectCondition: string;
    brand: string;
    optional: string;
    vintedCategory: string;
    vintedCategoryPlaceholder: string;
    olxCategory: string;
    facebookCategory: string;
    selectCategory: string;
    previewAlt: string;
    productAlt: string;
    copyTitle: string;
    copyPrice: string;
    description: string;
    copyDescription: string;
    keyFeatures: string;
    generateNewListing: string;
    generateAnotherListing: string;
    toggleHighQualityAria: string;
    uploadImageFirstAlert: string;
    customizeResultPlaceholder: string;
    customizeResultHeader: string;
    apply: string;
    applying: string;
    improvingImage: string;
    improvedImages: string;
    chooseBestImage: string;
    recommendedPrice: string;
    fastLabel: string;
    profitLabel: string;
    priceMeterTooltip: string;
    originalImage: string;
    selected: string;
  }
> = {
  en: {
    appTitle: "AI Sell Better",
    languageLabel: "Language",
    signIn: "Sign in",
    signUp: "Sign up",
    chooseMarketplace: "Choose marketplace",
    productNamePlaceholder: "Product name (optional) e.g. Zara hoodie, iPhone 13",
    productNameHint: "Helps AI be more accurate",
    uploadPrompt: "Upload an image to generate a listing",
    dropzoneTitle: "Click or drag an image here",
    dropzoneSubtitle: "PNG, JPG up to 5MB",
    remove: "Remove",
    generating: "Generating...",
    generateListing: "Generate listing",
    customize: "Customize",
    highQuality: "High quality",
    highQualityOn: "More detailed",
    standard: "Standard",
    vintedDetails: "Vinted details",
    size: "Size",
    selectSize: "Select size",
    condition: "Condition",
    selectCondition: "Select condition",
    brand: "Brand",
    optional: "Optional",
    vintedCategory: "Vinted category",
    vintedCategoryPlaceholder: "Dress, hoodie, shoes...",
    olxCategory: "OLX category",
    facebookCategory: "Facebook category",
    selectCategory: "Select category",
    previewAlt: "Preview",
    productAlt: "Product",
    copyTitle: "Copy title",
    copyPrice: "Copy price",
    description: "Description",
    copyDescription: "Copy description",
    keyFeatures: "Key features:",
    generateNewListing: "Generate new listing",
    generateAnotherListing: "Generate another listing",
    toggleHighQualityAria: "Toggle high quality generation",
    uploadImageFirstAlert: "Please upload an image first",
    customizeResultPlaceholder: "Make it shorter, more persuasive, or rewrite for Vinted",
    customizeResultHeader: "Edit with AI",
    apply: "Apply",
    applying: "Applying...",
    improvingImage: "Improving image...",
    improvedImages: "Improved images",
    chooseBestImage: "Choose best image",
    recommendedPrice: "Recommended",
    fastLabel: "Fast",
    profitLabel: "Profit",
    priceMeterTooltip: "Best balance between speed and profit",
    originalImage: "Original image",
    selected: "Selected",
  },
  pl: {
    appTitle: "AI Sell Better",
    languageLabel: "Język",
    signIn: "Zaloguj się",
    signUp: "Załóż konto",
    chooseMarketplace: "Wybierz platformę",
    productNamePlaceholder: "Nazwa produktu (opcjonalnie), np. bluza Zara, iPhone 13",
    productNameHint: "Pomaga AI lepiej rozpoznać przedmiot",
    uploadPrompt: "Dodaj zdjęcie, aby wygenerować ofertę",
    dropzoneTitle: "Kliknij albo przeciągnij zdjęcie tutaj",
    dropzoneSubtitle: "PNG lub JPG, maks. 5 MB",
    remove: "Usuń",
    generating: "Generowanie...",
    generateListing: "Generuj ofertę",
    customize: "Więcej opcji",
    highQuality: "Wyższa jakość",
    highQualityOn: "Dokładniejszy wynik",
    standard: "Standard",
    vintedDetails: "Szczegóły dla Vinted",
    size: "Rozmiar",
    selectSize: "Wybierz rozmiar",
    condition: "Stan",
    selectCondition: "Wybierz stan",
    brand: "Marka",
    optional: "Opcjonalnie",
    vintedCategory: "Kategoria na Vinted",
    vintedCategoryPlaceholder: "np. sukienka, bluza, buty",
    olxCategory: "Kategoria na OLX",
    facebookCategory: "Kategoria na Facebooku",
    selectCategory: "Wybierz kategorię",
    previewAlt: "Podgląd",
    productAlt: "Produkt",
    copyTitle: "Kopiuj tytuł",
    copyPrice: "Kopiuj cenę",
    description: "Opis",
    copyDescription: "Kopiuj opis",
    keyFeatures: "Najważniejsze atuty:",
    generateNewListing: "Generuj ponownie",
    generateAnotherListing: "Zacznij od nowa",
    toggleHighQualityAria: "Włącz wyższą jakość generowania",
    uploadImageFirstAlert: "Najpierw dodaj zdjęcie",
    customizeResultPlaceholder: "Skróć tekst, napisz go bardziej przekonująco albo dopasuj do Vinted",
    customizeResultHeader: "Popraw z AI",
    apply: "Zastosuj",
    applying: "Trwa poprawianie...",
    improvingImage: "Poprawiam zdjęcie...",
    improvedImages: "Poprawione zdjęcia",
    chooseBestImage: "Wybierz najlepsze zdjęcie",
    recommendedPrice: "Polecana",
    fastLabel: "Szybko",
    profitLabel: "Zysk",
    priceMeterTooltip: "Najlepszy balans między szybką sprzedażą a zyskiem",
    originalImage: "Zdjęcie oryginalne",
    selected: "Wybrane",
  },
};

const errorTranslations: Record<string, string> = {
  "The server returned an unexpected response.": "Serwer zwrócił nieoczekiwaną odpowiedź.",
  "Failed to generate listing.": "Nie udało się wygenerować oferty.",
  "The AI response did not match the expected listing format.":
    "Odpowiedź AI ma nieprawidłowy format.",
  "Something went wrong while generating the listing.":
    "Coś poszło nie tak podczas generowania oferty.",
  "Please upload an image file.": "Dodaj plik graficzny.",
  "Please choose an image under 5MB.": "Wybierz zdjęcie mniejsze niż 5 MB.",
  "Copy failed. Please try again.": "Nie udało się skopiować. Spróbuj ponownie.",
  "Failed to refine listing.": "Nie udało się poprawić oferty.",
  "Instruction is required.": "Wpisz instrukcję.",
  "Missing title or description to refine.": "Brakuje tytułu albo opisu do poprawy.",
  "The AI response did not match the expected refine format.":
    "Odpowiedź AI ma nieprawidłowy format poprawionej treści.",
  "Missing OPENAI_API_KEY. Put it in a project-root .env.local file and restart the dev server.":
    "Brak klucza API. Dodaj OPENAI_API_KEY do pliku .env.local i uruchom serwer ponownie.",
  "AI returned invalid JSON": "AI zwróciło nieprawidłowy JSON",
  "No image file was uploaded.": "Nie dodano zdjęcia.",
  "The uploaded file must be an image.": "Dodany plik musi być zdjęciem.",
  "Unknown error generating listing.": "Wystąpił nieznany błąd podczas generowania oferty.",
  Unauthorized: "Zaloguj się, aby generować i zapisywać oferty.",
};

const translateVisibleError = (message: string, language: Language) => {
  if (language === "en") {
    return message;
  }

  const [firstPart, ...rest] = message.split("\n\n");
  const translatedFirstPart = errorTranslations[firstPart] ?? firstPart;

  if (rest.length === 0) {
    return translatedFirstPart;
  }

  return `${translatedFirstPart}\n\n${rest.join("\n\n")}`;
};

const formatPrice = (price: string) => {
  const normalizedPrice = price.trim().replace(/\s*(PLN|zł)\s*$/i, "").trim();
  return `${normalizedPrice} PLN`;
};

const formatPriceValue = (value: number) => {
  return Math.round(value).toString();
};

const getPriceDisplay = (listing: Listing) => {
  if (listing.pricing) {
    const {
      priceRange: { low, high },
    } = listing.pricing;
    const midpoint = low + (high - low) / 2;

    return {
      label: `${formatPriceValue(low)}–${formatPriceValue(high)} PLN`,
      showMeter: true,
      position: "50%",
      positionValue: 50,
      recommendedLabel: `${formatPriceValue(midpoint)} PLN`,
      low,
      high,
    };
  }

  const price = listing.price;
  const values =
    price
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((value) => Number(value.replace(",", ".")))
      .filter((value) => Number.isFinite(value)) ?? [];

  if (values.length === 0) {
    return {
      label: formatPrice(price),
      showMeter: false,
      position: "50%",
      positionValue: 50,
      recommendedLabel: null,
      low: null,
      high: null,
    };
  }

  if (values.length === 1) {
    return {
      label: `${formatPriceValue(values[0])} PLN`,
      showMeter: false,
      position: "50%",
      positionValue: 50,
      recommendedLabel: null,
      low: null,
      high: null,
    };
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const low = sortedValues[0];
  const high = sortedValues[sortedValues.length - 1];
  const midpoint = low + (high - low) / 2;

  return {
    label: `${formatPriceValue(low)}–${formatPriceValue(high)} PLN`,
    showMeter: true,
    position: "50%",
    positionValue: 50,
    recommendedLabel: `${formatPriceValue(midpoint)} PLN`,
    low,
    high,
  };
};

const getPriceValueFromPosition = (low: number, high: number, position: number) => {
  const value = low + ((high - low) * position) / 100;
  return `${formatPriceValue(value)} PLN`;
};

const OlxIcon = ({ className = "h-4 w-4" }: MarketplaceIconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
    <circle cx="6" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.8" />
    <path d="M11 8v8h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M16.75 9.25 21 14m0-4.75L16.75 14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VintedIcon = ({ className = "h-4 w-4" }: MarketplaceIconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
    <path
      d="M6 7.5c.7 5 2.3 8.5 4.8 8.5 1.7 0 3-1.6 3.7-4.3.8-3.1 1.4-4.7 3.5-4.7"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 6.8c.9 0 1.5.6 1.5 1.4 0 .9-.6 1.5-1.5 1.5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

const FacebookIcon = ({ className = "h-4 w-4" }: MarketplaceIconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M13.3 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.9v1.9H8v2.8h2.3v7h3Z" />
  </svg>
);

const marketplaceOptions: Array<{
  platform: Platform;
  label: string;
  icon: ComponentType<MarketplaceIconProps>;
}> = [
  { platform: "olx", label: "OLX", icon: OlxIcon },
  { platform: "vinted", label: "Vinted", icon: VintedIcon },
  { platform: "facebook", label: "Facebook", icon: FacebookIcon },
];

const MarketplaceButton = ({
  platform,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  platform: Platform;
  label: string;
  icon: ComponentType<MarketplaceIconProps>;
  isActive: boolean;
  onClick: (platform: Platform) => void;
}) => (
  <button
    type="button"
    onClick={() => onClick(platform)}
    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition active:scale-95 ${
      isActive
        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        : "bg-blue-50 text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
    }`}
  >
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full ${
        isActive ? "bg-white/15 text-white" : "bg-blue-600/10 text-blue-700"
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span>{label}</span>
  </button>
);

export default function Home() {
  const { isSignedIn } = useAuth();
  const [language, setLanguage] = useState<Language>("en");
  const [platform, setPlatform] = useState<Platform>("olx");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [productName, setProductName] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [defectsNotes, setDefectsNotes] = useState("");
  const [itemModel, setItemModel] = useState("");
  const [itemYear, setItemYear] = useState("");
  const [itemDimensions, setItemDimensions] = useState("");
  const [includedAccessories, setIncludedAccessories] = useState("");
  const [quality, setQuality] = useState<Quality>("standard");
  const [showCustomization, setShowCustomization] = useState(false);
  const [vintedExtras, setVintedExtras] = useState<VintedExtras>({
    size: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [improvedImages, setImprovedImages] = useState<string[]>([]);
  const [selectedImprovedImage, setSelectedImprovedImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [priceMeterPosition, setPriceMeterPosition] = useState<number | null>(null);
  const [isDraggingPriceMeter, setIsDraggingPriceMeter] = useState(false);
  const ui = uiCopy[language];
  const advancedCopy =
    language === "pl"
      ? {
          sectionTitle: "Dodatkowe szczegóły",
          originalPrice: "Cena pierwotna",
          originalPricePlaceholder: "np. 299 PLN",
          defectsNotes: "Wady / uwagi",
          defectsNotesPlaceholder: "np. lekkie ślady użycia, brak pudełka",
          itemModel: "Model",
          itemYear: "Rok",
          itemDimensions: "Wymiary",
          itemDimensionsPlaceholder: "np. 120 x 60 x 75 cm",
          includedAccessories: "Akcesoria w zestawie",
          includedAccessoriesPlaceholder: "np. ładowarka, kabel, etui",
        }
      : {
          sectionTitle: "Advanced details",
          originalPrice: "Original price",
          originalPricePlaceholder: "e.g. 299 PLN",
          defectsNotes: "Defects / notes",
          defectsNotesPlaceholder: "e.g. light wear, missing box...",
          itemModel: "Model",
          itemYear: "Year",
          itemDimensions: "Dimensions",
          itemDimensionsPlaceholder: "e.g. 120 x 60 x 75 cm",
          includedAccessories: "Included accessories",
          includedAccessoriesPlaceholder: "e.g. charger, cable, case...",
        };
  const refineSectionTitle =
    language === "pl" ? "Dopracuj ofertę" : "Refine your listing";
  const refineInputPlaceholder =
    language === "pl"
      ? "Skróć tekst, napisz go bardziej przekonująco albo popraw błędy"
      : "Make it shorter, more persuasive, or fix grammar";
  const refineButtonLabel = language === "pl" ? "Popraw" : "Improve";
  const refineButtonPendingLabel =
    language === "pl" ? "Poprawianie..." : "Improving...";
  const refineQuickActions =
    language === "pl"
      ? [
          "Skróć tekst",
          "Napisz bardziej przekonująco",
          "Popraw błędy",
          "Przepisz tytuł",
          "Przepisz opis",
        ]
      : [
          "Make it shorter",
          "Make it more persuasive",
          "Fix grammar",
          "Rewrite Title",
          "Rewrite Description",
        ];
  const compactSignInLabel = language === "pl" ? "Login" : "Log in";
  const compactSignUpLabel = language === "pl" ? "Dołącz" : "Join";
  const priceDisplay = result ? getPriceDisplay(result) : null;
  const activePriceMeterPosition = priceDisplay?.showMeter
    ? (priceMeterPosition ?? priceDisplay.positionValue)
    : 50;
  const activeRecommendedPrice =
    priceDisplay?.showMeter && priceDisplay.low !== null && priceDisplay.high !== null
      ? getPriceValueFromPosition(priceDisplay.low, priceDisplay.high, activePriceMeterPosition)
      : priceDisplay?.recommendedLabel ?? null;
  const normalizedAdvancedContext = `${category} ${productName}`.toLowerCase();
  const showClothingFields =
    platform === "vinted" ||
    /moda|odzież|clothing|dress|hoodie|jacket|shirt|pants|shoes|bluza|spodnie|buty/.test(
      normalizedAdvancedContext,
    );
  const showElectronicsFields =
    /elektronika|electronics|tech|phone|iphone|laptop|console|camera|tablet|watch|tv/.test(
      normalizedAdvancedContext,
    );
  const showFurnitureFields =
    /dom i ogród|artykuły domowe|furniture|home goods|chair|table|desk|sofa|bed|wardrobe|shelf|dresser/.test(
      normalizedAdvancedContext,
    );
  const improveRequestIdRef = useRef(0);

  const updatePriceMeterPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const nextPosition = ((event.clientX - rect.left) / rect.width) * 100;
    setPriceMeterPosition(Math.min(100, Math.max(0, nextPosition)));
  };

  const resetImprovedImagesState = () => {
    improveRequestIdRef.current += 1;
    setImprovedImages([]);
    setSelectedImprovedImage(null);
    setLoadingImages(false);
  };

  useEffect(() => {
    setPriceMeterPosition(null);
    setIsDraggingPriceMeter(false);
  }, [result?.price]);

  const improveImagesAsync = async (sourceImage: File, requestId: number, listing: Listing) => {
    try {
      const formData = new FormData();
      formData.append("image", sourceImage);
      formData.append("quality", quality);
      formData.append("platform", platform);
      formData.append("itemName", productName || listing.title);
      formData.append("listingTitle", listing.title);
      formData.append("category", listing.category ?? category);
      formData.append("brand", listing.brand ?? brand);
      formData.append("condition", condition);
      formData.append("defectsNotes", defectsNotes);
      formData.append("size", vintedExtras.size);
      formData.append("model", itemModel);
      formData.append("year", itemYear);
      formData.append("dimensions", itemDimensions);
      formData.append("includedAccessories", includedAccessories);
      if (listing.savedListingId) {
        formData.append("listingId", listing.savedListingId);
      }

      const response = await fetch("/api/improve-image", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: "The server returned an unexpected response." };

      if (!response.ok) {
        throw new Error(isErrorPayload(payload) ? (payload.error ?? "Failed to improve image.") : "Failed to improve image.");
      }

      if (!isImprovedImagesPayload(payload)) {
        throw new Error("The AI response did not match the expected image format.");
      }

      if (improveRequestIdRef.current !== requestId) {
        return;
      }

      setImprovedImages(payload.images);
      setSelectedImprovedImage(payload.images[0] ?? null);
    } catch (improvementError) {
      console.error("IMAGE IMPROVEMENT ERROR:", improvementError);
    } finally {
      if (improveRequestIdRef.current === requestId) {
        setLoadingImages(false);
      }
    }
  };

  const handlePlatformChange = (nextPlatform: Platform) => {
    setPlatform(nextPlatform);
    setCategory("");
  };

  const handleGenerate = async () => {
    if (!image) {
      alert(ui.uploadImageFirstAlert);
      return;
    }

    resetImprovedImagesState();
    setError(null);
    setResult(null);
    setCopiedField(null);
    setCustomPrompt("");
    setIsCustomizing(false);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("platform", platform);
      formData.append("category", category);
      formData.append("brand", brand);
      formData.append("condition", condition);
      formData.append("productName", productName);
      formData.append("originalPrice", originalPrice);
      formData.append("defectsNotes", defectsNotes);
      formData.append("size", vintedExtras.size);
      formData.append("model", itemModel);
      formData.append("year", itemYear);
      formData.append("dimensions", itemDimensions);
      formData.append("includedAccessories", includedAccessories);
      formData.append("quality", quality);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await res.json()
        : { error: "The server returned an unexpected response." };

      if (!res.ok) {
        if (isErrorPayload(payload)) {
          const details = payload.raw
            ? `${payload.error ?? "Failed to generate listing."}\n\n${payload.raw}`
            : (payload.error ?? "Failed to generate listing.");

          throw new Error(details);
        }

        throw new Error("Failed to generate listing.");
      }

      if (!isListing(payload)) {
        throw new Error("The AI response did not match the expected listing format.");
      }

      const improveRequestId = improveRequestIdRef.current + 1;
      improveRequestIdRef.current = improveRequestId;
      setImprovedImages([]);
      setLoadingImages(true);
      setResult(payload);
      void improveImagesAsync(image, improveRequestId, payload);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while generating the listing.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelectedImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    resetImprovedImagesState();
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setCopiedField(null);
    setCustomPrompt("");
    setIsCustomizing(false);
  };

  const updateVintedExtra = (key: keyof VintedExtras, value: string) => {
    setVintedExtras((currentExtras) => ({
      ...currentExtras,
      [key]: value,
    }));
  };

  const selectImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    if (file.size > maxFileSize) {
      setError("Please choose an image under 5MB.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    resetImprovedImagesState();
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setCopiedField(null);
  };

  const handlePastedImage = useEffectEvent((file: File) => {
    selectImageFile(file);
  });

  useEffect(() => {
    if (result || isLoading) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
      const pastedFile = imageItem?.getAsFile();

      if (!pastedFile) {
        return;
      }

      event.preventDefault();
      handlePastedImage(pastedFile);
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [isLoading, result]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    selectImageFile(file);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);

      setTimeout(() => {
        setCopiedField((currentField) => (currentField === field ? null : currentField));
      }, 1500);
    } catch {
      setError("Copy failed. Please try again.");
    }
  };

  const handleCustomEdit = async () => {
    if (!result || !customPrompt.trim()) {
      return;
    }

    setError(null);
    setIsCustomizing(true);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          instruction: customPrompt.trim(),
          quality,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: "The server returned an unexpected response." };

      if (!response.ok) {
        if (isErrorPayload(payload)) {
          const details = payload.raw
            ? `${payload.error ?? "Failed to refine listing."}\n\n${payload.raw}`
            : (payload.error ?? "Failed to refine listing.");

          throw new Error(details);
        }

        throw new Error("Failed to refine listing.");
      }

      if (!isRefinedListingCopy(payload)) {
        throw new Error("The AI response did not match the expected refine format.");
      }

      setResult((currentResult) =>
        currentResult
          ? {
              ...currentResult,
              title: payload.title,
              description: payload.description,
            }
          : currentResult,
      );
      setCustomPrompt("");
    } catch (refineError) {
      const message =
        refineError instanceof Error
          ? refineError.message
          : "Failed to refine listing.";

      setError(message);
    } finally {
      setIsCustomizing(false);
    }
  };

  const renderCopyButton = (text: string, field: string, label: string) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="cursor-pointer rounded-full p-1 text-gray-400 transition hover:scale-110 hover:text-gray-700 active:scale-95"
      aria-label={label}
      type="button"
    >
      <span className="relative block h-4 w-4">
        <Copy
          className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${
            copiedField === field ? "scale-75 opacity-0" : "scale-100 opacity-100"
          }`}
        />
        <Check
          className={`absolute inset-0 h-4 w-4 text-emerald-600 transition-all duration-200 ${
            copiedField === field ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-gray-900 transition hover:text-blue-600"
          >
            {ui.appTitle}
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isSignedIn ? (
              <>
                <SignInButton>
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-xl bg-white px-2.5 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 sm:px-3 sm:text-sm"
                  >
                    <span className="sm:hidden">{compactSignInLabel}</span>
                    <span className="hidden sm:inline">{ui.signIn}</span>
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-xl bg-blue-600 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-blue-700 sm:px-3 sm:text-sm"
                  >
                    <span className="sm:hidden">{compactSignUpLabel}</span>
                    <span className="hidden sm:inline">{ui.signUp}</span>
                  </button>
                </SignUpButton>
              </>
            ) : (
              <div className="rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
                <UserButton />
              </div>
            )}

            <label htmlFor="language-select" className="sr-only">
              {ui.languageLabel}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="en">EN</option>
              <option value="pl">PL</option>
            </select>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-8">
        {!result && !isLoading && (
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-md">
          <div className="mb-4">
            <p className="mb-3 text-sm font-medium text-gray-600">{ui.chooseMarketplace}</p>
            <div className="grid grid-cols-3 gap-2">
              {marketplaceOptions.map((option) => (
                <MarketplaceButton
                  key={option.platform}
                  platform={option.platform}
                  label={option.label}
                  icon={option.icon}
                  isActive={platform === option.platform}
                  onClick={handlePlatformChange}
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder={ui.productNamePlaceholder}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {!productName && (
              <p className="mb-2 text-left text-xs text-gray-400">{ui.productNameHint}</p>
            )}
          </div>

          <p className="mb-4 text-gray-600">{ui.uploadPrompt}</p>

          <div
            className={`w-full rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
              preview
                ? "border-gray-300 bg-white"
                : isDragging
                  ? "scale-[1.01] border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-400 bg-gray-50 hover:bg-gray-100"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);

              const file = e.dataTransfer.files?.[0];
              if (!file) return;

              selectImageFile(file);
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />

            {!preview && (
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-3"
              >
                <div className="rounded-full bg-white p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>

                <p className="font-medium text-gray-700">{ui.dropzoneTitle}</p>
                <p className="text-sm text-gray-500">{ui.dropzoneSubtitle}</p>
              </label>
            )}

            {preview && (
              <div className="flex flex-col items-center gap-3">
                <Image
                  src={preview}
                  alt={ui.previewAlt}
                  width={300}
                  height={300}
                  unoptimized
                  className="max-h-60 rounded-xl object-cover"
                />

                <p className="max-w-full truncate text-sm text-gray-500">{image?.name}</p>

                <button
                  onClick={clearSelectedImage}
                  className="cursor-pointer text-xs text-red-500 transition hover:underline"
                  type="button"
                >
                  {ui.remove}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!image || isLoading}
            className="mt-4 w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isLoading ? ui.generating : ui.generateListing}
          </button>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomization((currentState) => !currentState)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition active:scale-95 ${
                showCustomization
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>{ui.customize}</span>
            </button>

            <div className="flex w-[48%] items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-gray-700">{ui.highQuality}</p>
                <p className="text-xs text-gray-500">{quality === "high" ? ui.highQualityOn : ui.standard}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={quality === "high"}
                aria-label={ui.toggleHighQualityAria}
                onClick={() =>
                  setQuality((currentQuality) =>
                    currentQuality === "high" ? "standard" : "high",
                  )
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  quality === "high" ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    quality === "high" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {showCustomization && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-left">
              <p className="mb-3 text-sm font-medium text-gray-700">
                {advancedCopy.sectionTitle}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-gray-600">
                  <span className="mb-1 block">{ui.condition}</span>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">{ui.selectCondition}</option>
                    {vintedConditions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[language]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-600">
                  <span className="mb-1 block font-medium text-gray-700">{ui.brand}</span>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder={ui.optional}
                    className={inputClassName}
                  />
                </label>

                <label className="text-sm text-gray-600">
                  <span className="mb-1 block font-medium text-gray-700">
                    {platform === "vinted"
                      ? ui.vintedCategory
                      : platform === "olx"
                        ? ui.olxCategory
                        : ui.facebookCategory}
                  </span>

                  {platform === "vinted" ? (
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder={ui.vintedCategoryPlaceholder}
                      className={inputClassName}
                    />
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">{ui.selectCategory}</option>
                      {(platform === "olx" ? olxCategories : facebookCategories).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="text-sm text-gray-600">
                  <span className="mb-1 block font-medium text-gray-700">
                    {advancedCopy.originalPrice}
                  </span>
                  <input
                    type="text"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder={advancedCopy.originalPricePlaceholder}
                    className={inputClassName}
                  />
                </label>
              </div>

              <div className="mt-3">
                <label className="text-sm text-gray-600">
                  <span className="mb-1 block font-medium text-gray-700">
                    {advancedCopy.defectsNotes}
                  </span>
                  <textarea
                    value={defectsNotes}
                    onChange={(e) => setDefectsNotes(e.target.value)}
                    placeholder={advancedCopy.defectsNotesPlaceholder}
                    className={`${inputClassName} min-h-24 resize-none`}
                  />
                </label>
              </div>

              {showClothingFields && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block font-medium text-gray-700">{ui.size}</span>
                    <select
                      value={vintedExtras.size}
                      onChange={(e) => updateVintedExtra("size", e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">{ui.selectSize}</option>
                      {vintedSizes.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {showElectronicsFields && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block font-medium text-gray-700">
                      {advancedCopy.itemModel}
                    </span>
                    <input
                      type="text"
                      value={itemModel}
                      onChange={(e) => setItemModel(e.target.value)}
                      placeholder={ui.optional}
                      className={inputClassName}
                    />
                  </label>

                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block font-medium text-gray-700">
                      {advancedCopy.itemYear}
                    </span>
                    <input
                      type="text"
                      value={itemYear}
                      onChange={(e) => setItemYear(e.target.value)}
                      placeholder={ui.optional}
                      className={inputClassName}
                    />
                  </label>
                </div>
              )}

              {showFurnitureFields && (
                <div className="mt-3">
                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block font-medium text-gray-700">
                      {advancedCopy.itemDimensions}
                    </span>
                    <input
                      type="text"
                      value={itemDimensions}
                      onChange={(e) => setItemDimensions(e.target.value)}
                      placeholder={advancedCopy.itemDimensionsPlaceholder}
                      className={inputClassName}
                    />
                  </label>
                </div>
              )}

              {showElectronicsFields && (
                <div className="mt-3">
                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block font-medium text-gray-700">
                      {advancedCopy.includedAccessories}
                    </span>
                    <textarea
                      value={includedAccessories}
                      onChange={(e) => setIncludedAccessories(e.target.value)}
                      placeholder={advancedCopy.includedAccessoriesPlaceholder}
                      className={`${inputClassName} min-h-24 resize-none`}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {translateVisibleError(error, language)}
            </p>
          )}
        </div>
      )}

      {isLoading && !result && (
        <div className="w-full max-w-md space-y-4">
          <div className={`h-60 w-full rounded-2xl ${skeletonClassName}`}></div>

          <div className="space-y-3 p-2">
            <div className={`h-6 w-3/4 ${skeletonClassName}`}></div>
            <div className={`h-6 w-1/2 ${skeletonClassName}`}></div>
            <div className={`h-4 w-full ${skeletonClassName}`}></div>
            <div className={`h-4 w-5/6 ${skeletonClassName}`}></div>
            <div className={`h-4 w-2/3 ${skeletonClassName}`}></div>
          </div>
        </div>
      )}

      {result && (
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-md transition hover:shadow-lg">
            <div className="flex flex-col md:flex-row md:gap-2">
              {preview && (
                <div className="p-3 md:w-[45%] md:p-4">
                  <div className="space-y-3">
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-black/5">
                      <Image
                        src={selectedImprovedImage ?? preview}
                        alt={ui.productAlt}
                        width={500}
                        height={500}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {(loadingImages || improvedImages.length > 0) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {loadingImages ? ui.improvingImage : ui.chooseBestImage}
                        </p>

                        {loadingImages ? (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
                            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
                            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {improvedImages.map((improvedImage, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setSelectedImprovedImage(improvedImage)}
                                className={`relative overflow-hidden rounded-xl border-2 transition duration-200 hover:scale-105 hover:shadow-md ${
                                  selectedImprovedImage === improvedImage
                                    ? "border-blue-500 opacity-100 shadow-md"
                                    : "border-transparent opacity-70 hover:opacity-100"
                                }`}
                              >
                                {selectedImprovedImage === improvedImage && (
                                  <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-blue-600/95 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                                    <Check className="h-3 w-3" />
                                    <span>{ui.selected}</span>
                                  </span>
                                )}

                                <Image
                                  src={improvedImage}
                                  alt={`${ui.improvedImages} ${index + 1}`}
                                  width={300}
                                  height={300}
                                  unoptimized
                                  className="h-24 w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`space-y-6 p-6 text-left ${preview ? "md:w-[55%] md:p-6" : ""}`}>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <h2 className="text-lg font-semibold leading-snug">{result.title}</h2>
                    {renderCopyButton(result.title, "title", ui.copyTitle)}
                  </div>

                  <div className="flex items-start gap-1">
                    <div className="w-full max-w-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {priceDisplay?.label ?? formatPrice(result.price)}
                        </p>

                        {priceDisplay?.showMeter && activeRecommendedPrice && (
                          <span className="font-medium text-gray-900">
                            {activeRecommendedPrice}
                          </span>
                        )}
                      </div>

                      {priceDisplay?.showMeter && (
                        <>
                          <div
                            className="group relative mt-2 h-2 cursor-pointer select-none touch-none rounded-full bg-gradient-to-r from-blue-100 via-blue-300 to-indigo-500"
                            onPointerEnter={updatePriceMeterPosition}
                            onPointerMove={updatePriceMeterPosition}
                            onPointerLeave={() => {
                              if (!isDraggingPriceMeter) {
                                setPriceMeterPosition(null);
                              }
                            }}
                            onPointerDown={(event) => {
                              setIsDraggingPriceMeter(true);
                              event.currentTarget.setPointerCapture(event.pointerId);
                              updatePriceMeterPosition(event);
                            }}
                            onPointerUp={(event) => {
                              setIsDraggingPriceMeter(false);
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                            onPointerCancel={(event) => {
                              setIsDraggingPriceMeter(false);
                              setPriceMeterPosition(null);
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                          >
                            <div
                              className={`absolute top-1/2 h-3 w-3 rounded-full bg-blue-600 shadow ring-2 ring-white transition-[left,transform] duration-150 ease-out group-hover:scale-110 ${
                                isDraggingPriceMeter ? "scale-110" : ""
                              }`}
                              style={{
                                left: `${activePriceMeterPosition}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />

                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                              {ui.priceMeterTooltip}
                            </div>
                          </div>

                          <div className="mt-1 grid grid-cols-3 text-xs text-gray-400">
                            <span>{ui.fastLabel}</span>
                            <span className="text-center">{ui.recommendedPrice}</span>
                            <span className="text-right">{ui.profitLabel}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="my-2 h-px bg-gray-100" />

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {ui.description}
                  </p>

                  <div className="flex items-start gap-2">
                    <p className="max-w-[85%] text-sm leading-relaxed text-gray-700">
                      {result.description}
                    </p>
                    {renderCopyButton(result.description, "desc", ui.copyDescription)}
                  </div>
                </div>

                <div className="space-y-2">
                  {platform !== "vinted" && (
                    <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {ui.keyFeatures}
                    </h3>
                  )}
                  <ul className="list-inside list-disc space-y-2 text-sm text-gray-600">
                    {result.keySellingPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {refineSectionTitle}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {refineQuickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setCustomPrompt(action)}
                      className="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition hover:bg-gray-200 sm:px-3 sm:text-xs"
                    >
                      {action}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder={refineInputPlaceholder}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={handleCustomEdit}
                    disabled={!customPrompt.trim() || isCustomizing}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {isCustomizing ? refineButtonPendingLabel : refineButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {translateVisibleError(error, language)}
            </p>
          )}

          <div className="mt-6 flex w-full gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-medium text-white transition hover:bg-blue-700 active:scale-95 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              <RefreshCcw className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">
                {language === "pl" ? "Ponownie" : "Regenerate"}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">{ui.generateNewListing}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                clearSelectedImage();
                setError(null);
                setCopiedField(null);
              }}
              className="min-w-0 flex-1 cursor-pointer rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 active:scale-95 sm:px-4 sm:py-3 sm:text-sm"
            >
              <span className="whitespace-nowrap sm:hidden">
                {language === "pl" ? "Od nowa" : "Start over"}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                {ui.generateAnotherListing}
              </span>
            </button>
          </div>
        </div>
      )}

      </main>

      <footer className="w-full px-6 pb-4 text-left text-xs text-gray-400 transition hover:text-gray-500">
        AI Sell Better {"\u00A9"} 2026
      </footer>
    </div>
  );
}


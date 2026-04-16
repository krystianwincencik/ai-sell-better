"use client";

import { Check, Copy, RefreshCcw, Settings, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState, type ComponentType } from "react";

type Platform = "olx" | "vinted" | "facebook";
type Quality = "standard" | "high";
type Language = "en" | "pl";

type VintedExtras = {
  size: string;
  condition: string;
};

type Listing = {
  title: string;
  description: string;
  price: string;
  category?: string;
  brand?: string;
  keySellingPoints: string[];
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
  { value: "New with tags", label: { en: "New with tags", pl: "Nowe z metkÄ…" } },
  { value: "Very good", label: { en: "Very good", pl: "Bardzo dobry" } },
  { value: "Good", label: { en: "Good", pl: "Dobry" } },
];
const olxCategories = [
  "Antyki i Kolekcje",
  "Motoryzacja",
  "Dom i OgrĂłd",
  "Elektronika",
  "Moda",
  "Rolnictwo",
  "ZwierzÄ™ta",
  "Sport i Hobby",
  "Muzyka i Edukacja",
  "Dla Dzieci",
  "Zdrowie i Uroda",
];
const facebookCategories = [
  "Pojazdy",
  "Elektronika",
  "OdzieĹĽ",
  "ArtykuĹ‚y domowe",
  "OgrĂłd i otoczenie",
  "Hobby",
  "Instrumenty muzyczne",
  "Zabawki i gry",
  "ArtykuĹ‚y sportowe",
  "Dla rodziny",
  "ArtykuĹ‚y dla zwierzÄ…t domowych",
];

const uiCopy: Record<
  Language,
  {
    appTitle: string;
    languageLabel: string;
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
    originalImage: string;
    selected: string;
  }
> = {
  en: {
    appTitle: "AI Sell Better",
    languageLabel: "Language",
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
    originalImage: "Original image",
    selected: "Selected",
  },
  pl: {
    appTitle: "AI Sell Better",
    languageLabel: "JÄ™zyk",
    chooseMarketplace: "Wybierz platformÄ™",
    productNamePlaceholder: "Nazwa produktu (opcjonalnie), np. bluza Zara, iPhone 13",
    productNameHint: "Pomaga AI lepiej rozpoznaÄ‡ produkt",
    uploadPrompt: "Dodaj zdjÄ™cie, aby wygenerowaÄ‡ ofertÄ™",
    dropzoneTitle: "Kliknij lub przeciÄ…gnij zdjÄ™cie tutaj",
    dropzoneSubtitle: "PNG, JPG do 5 MB",
    remove: "UsuĹ„",
    generating: "Generowanie...",
    generateListing: "Generuj ofertÄ™",
    customize: "Dostosuj",
    highQuality: "Lepsza jakoĹ›Ä‡",
    highQualityOn: "WiÄ™cej detali",
    standard: "Standard",
    vintedDetails: "SzczegĂłĹ‚y Vinted",
    size: "Rozmiar",
    selectSize: "Wybierz rozmiar",
    condition: "Stan",
    selectCondition: "Wybierz stan",
    brand: "Marka",
    optional: "Opcjonalnie",
    vintedCategory: "Kategoria Vinted",
    vintedCategoryPlaceholder: "Sukienka, bluza, buty...",
    olxCategory: "Kategoria OLX",
    facebookCategory: "Kategoria Facebook",
    selectCategory: "Wybierz kategoriÄ™",
    previewAlt: "PodglÄ…d",
    productAlt: "Produkt",
    copyTitle: "Kopiuj tytuĹ‚",
    copyPrice: "Kopiuj cenÄ™",
    description: "Opis",
    copyDescription: "Kopiuj opis",
    keyFeatures: "NajwaĹĽniejsze cechy:",
    generateNewListing: "Generuj nowÄ… ofertÄ™",
    generateAnotherListing: "Generuj kolejnÄ… ofertÄ™",
    toggleHighQualityAria: "PrzeĹ‚Ä…cz lepszÄ… jakoĹ›Ä‡ generowania",
    uploadImageFirstAlert: "Najpierw dodaj zdjÄ™cie",
    customizeResultPlaceholder: "SkrĂłÄ‡ tekst, uczyĹ„ go bardziej przekonujÄ…cym lub przepisz pod Vinted",
    customizeResultHeader: "Edytuj z AI",
    apply: "Zastosuj",
    applying: "Trwa...",
    improvingImage: "Trwa poprawa zdjÄ™cia...",
    improvedImages: "Poprawione zdjÄ™cia",
    chooseBestImage: "Wybierz najlepsze zdjÄ™cie",
    originalImage: "Oryginalne zdjÄ™cie",
    selected: "Wybrane",
  },
};

const errorTranslations: Record<string, string> = {
  "The server returned an unexpected response.": "Serwer zwrĂłciĹ‚ nieoczekiwanÄ… odpowiedĹş.",
  "Failed to generate listing.": "Nie udaĹ‚o siÄ™ wygenerowaÄ‡ oferty.",
  "The AI response did not match the expected listing format.":
    "OdpowiedĹş AI ma nieprawidĹ‚owy format.",
  "Something went wrong while generating the listing.":
    "WystÄ…piĹ‚ bĹ‚Ä…d podczas generowania oferty.",
  "Please upload an image file.": "Dodaj plik graficzny.",
  "Please choose an image under 5MB.": "Wybierz zdjÄ™cie mniejsze niĹĽ 5 MB.",
  "Copy failed. Please try again.": "Nie udaĹ‚o siÄ™ skopiowaÄ‡. SprĂłbuj ponownie.",
  "Failed to refine listing.": "Nie udaĹ‚o siÄ™ poprawiÄ‡ oferty.",
  "Instruction is required.": "Wpisz instrukcjÄ™.",
  "Missing title or description to refine.": "Brakuje tytuĹ‚u lub opisu do poprawy.",
  "The AI response did not match the expected refine format.":
    "OdpowiedĹş AI ma nieprawidĹ‚owy format poprawionej treĹ›ci.",
  "Missing OPENAI_API_KEY. Put it in a project-root .env.local file and restart the dev server.":
    "Brak klucza API. Dodaj OPENAI_API_KEY do pliku .env.local i uruchom serwer ponownie.",
  "AI returned invalid JSON": "AI zwrĂłciĹ‚o nieprawidĹ‚owy JSON",
  "No image file was uploaded.": "Nie dodano zdjÄ™cia.",
  "The uploaded file must be an image.": "Dodany plik musi byÄ‡ zdjÄ™ciem.",
  "Unknown error generating listing.": "Nieznany bĹ‚Ä…d podczas generowania oferty.",
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
  const normalizedPrice = price.trim().replace(/\s*(PLN|zĹ‚)\s*$/i, "").trim();
  return `${normalizedPrice} PLN`;
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
  const [language, setLanguage] = useState<Language>("en");
  const [platform, setPlatform] = useState<Platform>("olx");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [quality, setQuality] = useState<Quality>("standard");
  const [showCustomization, setShowCustomization] = useState(false);
  const [vintedExtras, setVintedExtras] = useState<VintedExtras>({
    size: "",
    condition: "",
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
  const ui = uiCopy[language];
  const pageWidthClassName = result ? "max-w-2xl" : "max-w-md";
  const improveRequestIdRef = useRef(0);

  const resetImprovedImagesState = () => {
    improveRequestIdRef.current += 1;
    setImprovedImages([]);
    setSelectedImprovedImage(null);
    setLoadingImages(false);
  };

  const improveImagesAsync = async (sourceImage: File, requestId: number) => {
    try {
      const formData = new FormData();
      formData.append("image", sourceImage);
      formData.append("quality", quality);

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
    setBrand("");
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
      formData.append("productName", productName);
      formData.append("quality", quality);

      if (platform === "vinted") {
        formData.append("brand", brand);
        formData.append("size", vintedExtras.size);
        formData.append("condition", vintedExtras.condition);
      }

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
      void improveImagesAsync(image, improveRequestId);
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
      <main className="flex flex-1 flex-col items-center justify-center p-6">
      <header className={`mb-6 flex w-full items-center justify-between ${pageWidthClassName}`}>
        <h1 className="text-xl font-bold text-gray-900">{ui.appTitle}</h1>

        <div className="flex items-center gap-2">
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
      </header>

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

          {showCustomization && platform === "vinted" && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-left">
              <p className="mb-3 text-sm font-medium text-gray-700">{ui.vintedDetails}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-gray-600">
                  <span className="mb-1 block">{ui.size}</span>
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

                <label className="text-sm text-gray-600">
                  <span className="mb-1 block">{ui.condition}</span>
                  <select
                    value={vintedExtras.condition}
                    onChange={(e) => updateVintedExtra("condition", e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">{ui.selectCondition}</option>
                    {vintedConditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label[language]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                  <span className="mb-1 block font-medium text-gray-700">{ui.vintedCategory}</span>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={ui.vintedCategoryPlaceholder}
                    className={inputClassName}
                  />
                </label>
              </div>
            </div>
          )}

          {showCustomization && platform === "olx" && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-left">
              <label className="text-sm text-gray-600">
                <span className="mb-1 block font-medium text-gray-700">{ui.olxCategory}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">{ui.selectCategory}</option>
                  {olxCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {showCustomization && platform === "facebook" && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-left">
              <label className="text-sm text-gray-600">
                <span className="mb-1 block font-medium text-gray-700">{ui.facebookCategory}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">{ui.selectCategory}</option>
                  {facebookCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
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

                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">{formatPrice(result.price)}</p>
                    {renderCopyButton(formatPrice(result.price), "price", ui.copyPrice)}
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
                    {ui.customizeResultHeader}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder={ui.customizeResultPlaceholder}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={handleCustomEdit}
                    disabled={!customPrompt.trim() || isCustomizing}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {isCustomizing ? ui.applying : ui.apply}
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
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>{ui.generateNewListing}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                clearSelectedImage();
                setError(null);
                setCopiedField(null);
              }}
              className="flex-1 cursor-pointer rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 active:scale-95"
            >
              {ui.generateAnotherListing}
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


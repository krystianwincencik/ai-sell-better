"use client";

import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useState, type PointerEvent } from "react";

export type SavedListingDetail = {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string | null;
  brand: string | null;
  keySellingPoints?: string[];
  improvedImages?: string[];
  priceLow: number;
  priceRecommended: number;
  priceHigh: number;
  imageUrl: string;
  createdAt: string;
};

const clampPosition = (position: number) => Math.min(100, Math.max(0, position));

const formatPlatform = (platform: string) => {
  switch (platform) {
    case "olx":
      return "OLX";
    case "vinted":
      return "Vinted";
    case "facebook":
      return "Facebook Marketplace";
    default:
      return platform;
  }
};

const formatPriceValue = (value: number) => Math.round(value).toString();

const getMeterPosition = () => 50;

const getPriceValueFromPosition = (low: number, high: number, position: number) => {
  const value = low + ((high - low) * position) / 100;
  return `${formatPriceValue(value)} PLN`;
};

export function SavedListingDetailCard({ listing }: { listing: SavedListingDetail }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [priceMeterPosition, setPriceMeterPosition] = useState<number | null>(null);
  const [isDraggingPriceMeter, setIsDraggingPriceMeter] = useState(false);
  const keySellingPoints = Array.isArray(listing.keySellingPoints) ? listing.keySellingPoints : [];
  const galleryImages =
    Array.isArray(listing.improvedImages) && listing.improvedImages.length > 0
      ? listing.improvedImages
      : [listing.imageUrl];
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] ?? listing.imageUrl);
  const defaultPriceMeterPosition = getMeterPosition();
  const activePriceMeterPosition = priceMeterPosition ?? defaultPriceMeterPosition;
  const activeRecommendedPrice = getPriceValueFromPosition(
    listing.priceLow,
    listing.priceHigh,
    activePriceMeterPosition,
  );

  const copyToClipboard = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);

    window.setTimeout(() => {
      setCopiedField((currentField) => (currentField === field ? null : currentField));
    }, 1500);
  };

  const updatePriceMeterPosition = (event: PointerEvent<HTMLDivElement>) => {
    const bar = event.currentTarget.getBoundingClientRect();
    const nextPosition = clampPosition(((event.clientX - bar.left) / bar.width) * 100);
    setPriceMeterPosition(nextPosition);
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
    <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-md transition hover:shadow-lg">
      <div className="flex flex-col md:flex-row md:gap-2">
        <div className="p-3 md:w-[45%] md:p-4">
          <div className="space-y-3">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-black/5">
              <Image
                src={selectedImage}
                alt={listing.title}
                width={500}
                height={500}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Choose best image
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((improvedImage, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(improvedImage)}
                      className={`relative overflow-hidden rounded-xl border-2 transition duration-200 hover:scale-105 hover:shadow-md ${
                        selectedImage === improvedImage
                          ? "border-blue-500 opacity-100 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {selectedImage === improvedImage && (
                        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-blue-600/95 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                          <Check className="h-3 w-3" />
                          <span>Selected</span>
                        </span>
                      )}

                      <Image
                        src={improvedImage}
                        alt={`Improved image ${index + 1}`}
                        width={300}
                        height={300}
                        unoptimized
                        className="h-24 w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {formatPlatform(listing.platform)}
              </span>
              {listing.category && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {listing.category}
                </span>
              )}
              {listing.brand && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {listing.brand}
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                Saved {new Date(listing.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 text-left md:w-[55%] md:p-6">
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <h1 className="text-lg font-semibold leading-snug text-gray-900">{listing.title}</h1>
              {renderCopyButton(listing.title, "title", "Copy title")}
            </div>

            <div className="flex items-start gap-1">
              <div className="w-full max-w-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPriceValue(listing.priceLow)}-{formatPriceValue(listing.priceHigh)} PLN
                  </p>

                  <span className="font-medium text-gray-900">{activeRecommendedPrice}</span>
                </div>

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
                    Best balance between speed and profit
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 text-xs text-gray-400">
                  <span>Fast</span>
                  <span className="text-center">Recommended</span>
                  <span className="text-right">Profit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="my-2 h-px bg-gray-100" />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Description
            </p>

            <div className="flex items-start gap-2">
              <p className="max-w-[85%] whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {listing.description}
              </p>
              {renderCopyButton(listing.description, "description", "Copy description")}
            </div>
          </div>

          {keySellingPoints.length > 0 && (
            <div className="space-y-2">
              {listing.platform !== "vinted" && (
                <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Key features
                </h2>
              )}

              <ul className="list-inside list-disc space-y-2 text-sm text-gray-600">
                {keySellingPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

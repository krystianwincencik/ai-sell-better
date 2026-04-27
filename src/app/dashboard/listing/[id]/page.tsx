import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { SavedListingDetailCard } from "@/components/saved-listing-detail-card";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const prisma = getPrisma();
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const { id } = await params;
  const listing = await prisma.listing.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!listing) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Saved listing</p>
            <h1 className="text-2xl font-bold text-gray-900">Listing details</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review the full listing, copy the text, and fine-tune the price range.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 active:scale-95"
            >
              Back to dashboard
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
            >
              Back to generator
            </Link>
          </div>
        </div>

        <SavedListingDetailCard
          listing={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            platform: listing.platform,
            category: listing.category,
            brand: listing.brand,
            keySellingPoints: Array.isArray(listing.keySellingPoints)
              ? listing.keySellingPoints
              : [],
            improvedImages: Array.isArray(listing.improvedImages) ? listing.improvedImages : [],
            priceLow: listing.priceLow,
            priceRecommended: listing.priceRecommended,
            priceHigh: listing.priceHigh,
            imageUrl: listing.imageUrl,
            createdAt: listing.createdAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}

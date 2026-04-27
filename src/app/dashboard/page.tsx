import { auth } from "@clerk/nextjs/server";
import type { Listing } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";

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

const formatPrice = (value: number) => `${Math.round(value)} PLN`;

export default async function DashboardPage() {
  const prisma = getPrisma();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const listings: Listing[] = await prisma.listing.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Saved listings</p>
            <h1 className="text-2xl font-bold text-gray-900">Your Listings</h1>
            <p className="mt-1 text-sm text-gray-500">
              All generated listings saved to your account.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.01] hover:bg-blue-700 active:scale-95"
          >
            Back to generator
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No listings yet</h2>
            <p className="mt-2 text-sm text-gray-500">
              Generate your first listing and it will show up here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => {
              const listingImage =
                Array.isArray(listing.improvedImages) && listing.improvedImages.length > 0
                  ? listing.improvedImages[0]
                  : listing.imageUrl;

              return (
                <Link
                  key={listing.id}
                  href={`/dashboard/listing/${listing.id}`}
                  className="block"
                >
                  <article className="overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                  <div className="flex flex-col gap-0 md:flex-row">
                    <div className="border-b border-gray-100 bg-gray-50 md:w-56 md:border-b-0 md:border-r">
                      <div className="relative aspect-[4/5] w-full">
                        <Image
                          src={listingImage}
                          alt={listing.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex-1 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">
                            {formatPlatform(listing.platform)}
                          </p>
                          <h2 className="mt-1 text-lg font-semibold text-gray-900">
                            {listing.title}
                          </h2>
                          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-gray-600">
                            {listing.description}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:min-w-52">
                          <p>
                            Recommended:{" "}
                            <span className="font-semibold text-gray-900">
                              {formatPrice(listing.priceRecommended)}
                            </span>
                          </p>
                          <p className="mt-1 text-gray-500">
                            Range: {formatPrice(listing.priceLow)} -{" "}
                            {formatPrice(listing.priceHigh)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {listing.category && (
                          <span className="rounded-full bg-gray-100 px-3 py-1">
                            {listing.category}
                          </span>
                        )}
                        {listing.brand && (
                          <span className="rounded-full bg-gray-100 px-3 py-1">
                            {listing.brand}
                          </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          Saved {listing.createdAt.toLocaleDateString("en-US")}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                          Open listing
                        </span>
                      </div>
                    </div>
                  </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

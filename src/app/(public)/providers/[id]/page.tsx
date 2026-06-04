import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, Clock, CheckCircle, Shield } from "lucide-react";
import { getProviderById } from "@/server/services/provider.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await getProviderById(id);
  if (!provider) return { title: "Provider Not Found | Sparq" };
  return {
    title: `${provider.businessName || provider.user.name} | Sparq`,
    description: provider.bio?.slice(0, 160),
  };
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getProviderById(id);

  if (!provider) {
    notFound();
  }

  const name = provider.businessName || provider.user.name || "Provider";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="size-28 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {provider.user.image ? (
            <img
              src={provider.user.image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
              <span className="text-4xl font-bold text-indigo-300">
                {name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{name}</h1>
            <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Verified
            </div>
          </div>
          {provider.avgRating && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-semibold">{provider.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-neutral-500">({provider.reviewCount} reviews)</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {provider.serviceTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {type === "NAILS" ? "Nails" : "Lashes"}
              </Badge>
            ))}
            <Badge variant="outline">
              {provider.serviceMode === "STUDIO"
                ? "Studio"
                : provider.serviceMode === "MOBILE"
                ? "Mobile"
                : "Studio & Mobile"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-neutral-500">
            <MapPin className="w-4 h-4" />
            {provider.suburbs.map((s) => s.suburb).join(", ")}
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Link href={`/providers/${id}/book`}>
            <Button
              size="lg"
              className="w-full rounded-full bg-neutral-900 px-8 text-base text-white hover:bg-neutral-700 md:w-auto"
            >
              Book now
            </Button>
          </Link>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Bio */}
      {provider.bio && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">About</h2>
          <p className="text-gray-600 leading-relaxed">{provider.bio}</p>
        </section>
      )}

      {/* Services */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Services</h2>
        <div className="grid gap-3">
          {provider.services.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{service.title}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {service.durationMinutes} min
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {service.category === "NAILS" ? "Nails" : "Lashes"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold">${service.basePrice}</span>
                  <div>
                    <Link href={`/providers/${id}/book?serviceId=${service.id}`}>
                      <Button size="sm" variant="outline" className="mt-1">
                        Book
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      {provider.portfolioImages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Portfolio</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {provider.portfolioImages.map((img) => (
              <div
                key={img.id}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={img.url}
                  alt={img.caption || "Portfolio"}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Reviews ({provider.reviewCount})
        </h2>
        {provider.reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {provider.reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {review.customer.name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {review.customer.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-600">
                      <Shield className="w-3 h-3" />
                      Verified booking
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Trust info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Booking through Sparq
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>Your payment is held securely until the provider confirms your booking.</p>
          <p>All reviews are from verified platform bookings.</p>
          <p>Contact details are shared only after booking confirmation.</p>
        </CardContent>
      </Card>
    </div>
  );
}

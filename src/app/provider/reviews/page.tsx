"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingWithDetails } from "@/types";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string | null;
  serviceTitle: string | null;
  bookingDate: string;
}

export default function ProviderReviewsPage() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data: BookingWithDetails[]) => {
        if (!Array.isArray(data)) return;
        const extracted: ReviewData[] = data
          .filter((b) => b.review != null)
          .map((b) => ({
            id: b.review!.id,
            rating: b.review!.rating,
            comment: b.review!.comment ?? null,
            createdAt: b.review!.createdAt as unknown as string,
            customerName: b.customer?.name ?? null,
            serviceTitle: b.service?.title ?? null,
            bookingDate: b.bookingDate as unknown as string,
          }));
        setReviews(extracted);
      })
      .catch(() => toast.error("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, []);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">Reviews from your customers</p>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="text-center sm:text-left">
                <p className="text-5xl font-bold">{avgRating?.toFixed(1) ?? "—"}</p>
                {avgRating !== null && (
                  <div className="mt-1.5">
                    <StarRating rating={Math.round(avgRating)} />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex-1 space-y-1.5 w-full">
                {ratingCounts.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs w-3 text-muted-foreground">{star}</span>
                    <Star className="size-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{
                          width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review list */}
      {!loading && reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {reviews
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((review) => (
                  <div key={review.id} className="py-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {review.customerName ?? "Anonymous"}
                        </span>
                        {review.serviceTitle && (
                          <span className="text-xs text-muted-foreground">
                            &middot; {review.serviceTitle}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.createdAt), "d MMM yyyy")}
                      </span>
                    </div>
                    <StarRating rating={review.rating} />
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                    )}
                    {review.bookingDate && (
                      <p className="text-xs text-muted-foreground">
                        Appointment: {format(new Date(review.bookingDate), "d MMM yyyy")}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

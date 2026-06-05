"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

type BookingWithReview = {
  id: string;
  bookingDate: string;
  service: { title: string };
  provider: {
    name: string | null;
    providerProfile: { businessName: string | null };
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

export default function ReviewsPage() {
  const [bookings, setBookings] = useState<BookingWithReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data: BookingWithReview[]) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const reviewed = bookings.filter((b) => b.review !== null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Reviews you have left for providers
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-gray-400 text-sm">Loading reviews...</p>
        </div>
      ) : reviewed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No reviews yet</p>
          <p className="text-gray-400 text-xs mt-1">
            After completing a booking, you can leave a review for the provider.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewed.map((booking) => {
            const review = booking.review!;
            const providerName =
              booking.provider.providerProfile?.businessName ||
              booking.provider.name ||
              "Provider";

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {booking.service.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{providerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Booking on{" "}
                      {format(parseISO(booking.bookingDate), "d MMM yyyy")}
                    </p>
                  </div>
                  {review.createdAt && (
                    <p className="text-xs text-gray-400 shrink-0">
                      {format(parseISO(review.createdAt), "d MMM yyyy")}
                    </p>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <StarRating rating={review.rating} />
                  {review.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/customer/bookings/${booking.id}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View booking
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs text-gray-500 font-medium">{rating}/5</span>
    </div>
  );
}

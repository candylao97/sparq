"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  CreditCard,
  Star,
  RefreshCw,
  XCircle,
  User,
} from "lucide-react";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

type BookingDetail = {
  id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceMode: string;
  address: string | null;
  notes: string | null;
  totalAmount: number;
  cancellationReason: string | null;
  service: { id: string; title: string; durationMinutes: number; basePrice: number };
  provider: {
    id: string;
    name: string | null;
    providerProfile: { id: string; businessName: string | null };
  };
  customer: { id: string; name: string | null; email: string | null };
  payment: { status: string; amount: number } | null;
  review: { id: string; rating: number; comment: string | null } | null;
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setBooking(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleReviewSubmit = (review: { rating: number; comment: string }) => {
    setBooking((prev) =>
      prev ? { ...prev, review: { id: "new", ...review } } : prev
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">Loading booking...</p>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Booking not found</p>
        <Link href="/customer/bookings" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> Back to bookings
          </Button>
        </Link>
      </div>
    );
  }

  const providerName =
    booking.provider.providerProfile?.businessName ||
    booking.provider.name ||
    "Provider";
  const providerProfileId = booking.provider.providerProfile?.id;

  const canCancel =
    booking.status === "PENDING_PROVIDER_RESPONSE" ||
    booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const canRebook = isCompleted;
  const canReview = isCompleted && !booking.review;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back link */}
      <Link
        href="/customer/bookings"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to bookings
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{booking.service.title}</h1>
            <p className="text-sm text-gray-600 mt-0.5">with {providerName}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Date">
            {format(parseISO(booking.bookingDate), "EEEE, d MMMM yyyy")}
          </InfoRow>
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Time">
            {booking.startTime}
            {booking.endTime ? ` – ${booking.endTime}` : ""}
          </InfoRow>
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Mode">
            {booking.serviceMode === "MOBILE" ? "Home visit" : "Studio visit"}
          </InfoRow>
          <InfoRow icon={<User className="w-4 h-4" />} label="Duration">
            {booking.service.durationMinutes} min
          </InfoRow>
        </div>

        {booking.address && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Address</p>
            <p className="text-sm text-gray-800">{booking.address}</p>
          </div>
        )}

        {booking.notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Notes</p>
            <p className="text-sm text-gray-800">{booking.notes}</p>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-500 font-medium mb-0.5">Cancellation reason</p>
            <p className="text-sm text-red-800">{booking.cancellationReason}</p>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          Payment
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service price</span>
            <span className="font-medium">${booking.service.basePrice}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">${booking.totalAmount}</span>
          </div>
          {booking.payment && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment status</span>
              <span className="font-medium text-gray-700">
                {PAYMENT_STATUS_LABELS[booking.payment.status] ?? booking.payment.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(canCancel || canRebook || canReview) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {canRebook && providerProfileId && (
              <Link
                href={`/providers/${providerProfileId}/book?serviceId=${booking.service.id}`}
              >
                <Button size="sm" variant="secondary">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rebook
                </Button>
              </Link>
            )}
            {canCancel && (
              <CancelButton
                bookingId={booking.id}
                onCancelled={() =>
                  setBooking((prev) =>
                    prev ? { ...prev, status: "CANCELLED_BY_CUSTOMER" } : prev
                  )
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Review section */}
      {isCompleted && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            Review
          </h2>
          {booking.review ? (
            <ExistingReview review={booking.review} />
          ) : (
            <ReviewForm bookingId={booking.id} onSubmit={handleReviewSubmit} />
          )}
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{children}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${getStatusColor(status)}`}>
      {label}
    </span>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING_PROVIDER_RESPONSE":
      return "bg-yellow-100 text-yellow-800";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    case "CANCELLED_BY_CUSTOMER":
    case "CANCELLED_BY_PROVIDER":
    case "EXPIRED":
      return "bg-gray-100 text-gray-700";
    case "REFUNDED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function CancelButton({
  bookingId,
  onCancelled,
}: {
  bookingId: string;
  onCancelled: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Cancelled by customer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to cancel booking");
      } else {
        toast.success("Booking cancelled");
        onCancelled();
        setShowConfirm(false);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
      >
        <XCircle className="w-3.5 h-3.5" />
        Cancel booking
      </Button>
    );
  }

  return (
    <div className="w-full border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
      <p className="text-sm font-medium text-red-800">
        Are you sure you want to cancel this booking?
      </p>
      <textarea
        className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
        placeholder="Reason for cancellation (optional)"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? "Cancelling..." : "Yes, cancel booking"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          Keep booking
        </Button>
      </div>
    </div>
  );
}

function ExistingReview({
  review,
}: {
  review: { id: string; rating: number; comment: string | null };
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
            }`}
          />
        ))}
      </div>
      {review.comment && (
        <p className="text-sm text-gray-700">{review.comment}</p>
      )}
    </div>
  );
}

function ReviewForm({
  bookingId,
  onSubmit,
}: {
  bookingId: string;
  onSubmit: (review: { rating: number; comment: string }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit review");
      } else {
        toast.success("Review submitted!");
        onSubmit({ rating, comment });
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hovered || rating;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-2">Your rating</p>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                aria-label={`Rate ${value} star${value !== 1 ? "s" : ""}`}
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    value <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Comment (optional)</p>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          placeholder="Share your experience..."
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        <p className="text-xs text-gray-400 text-right mt-0.5">
          {comment.length}/1000
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || rating === 0}
        size="sm"
      >
        {loading ? "Submitting..." : "Submit review"}
      </Button>
    </div>
  );
}

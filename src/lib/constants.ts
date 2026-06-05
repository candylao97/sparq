export const LAUNCH_SUBURBS = [
  "Melbourne CBD",
  "Southbank",
  "Docklands",
  "Carlton",
  "Fitzroy",
  "Richmond",
  "South Yarra",
  "Brunswick",
] as const;

export type LaunchSuburb = (typeof LAUNCH_SUBURBS)[number];

export const SERVICE_CATEGORIES = ["Nails", "Lashes"] as const;
export type ServiceCategoryLabel = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_MODES = [
  { value: "STUDIO", label: "Studio / Provider Location" },
  { value: "MOBILE", label: "Home Visit / Mobile" },
  { value: "BOTH", label: "Both" },
] as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_PROVIDER_RESPONSE: "Pending Response",
  DECLINED: "Declined",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED_BY_CUSTOMER: "Cancelled by Customer",
  CANCELLED_BY_PROVIDER: "Cancelled by Provider",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
  DISPUTED: "Disputed",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  AUTH_PENDING: "Authorization Pending",
  AUTHORISED: "Authorised",
  CAPTURED: "Captured",
  AUTH_RELEASED: "Authorization Released",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export const PROVIDER_RESPONSE_WINDOW_HOURS = Number(
  process.env.PROVIDER_RESPONSE_WINDOW_HOURS || "24"
);

export const APP_NAME = "Sparq";
export const APP_DESCRIPTION =
  "Find and book trusted nail and lash artists in Melbourne";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

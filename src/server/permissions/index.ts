import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect("/");
  }
  return session;
}

export async function requireCustomer() {
  return requireRole(UserRole.CUSTOMER);
}

export async function requireProvider() {
  return requireRole(UserRole.PROVIDER);
}

export async function requireAdmin() {
  return requireRole(UserRole.ADMIN);
}

export async function getSession() {
  return auth();
}

export function canAccessBooking(
  userId: string,
  booking: { customerId: string; provider: { userId: string } },
  role: UserRole
): boolean {
  if (role === UserRole.ADMIN) return true;
  if (role === UserRole.CUSTOMER && booking.customerId === userId) return true;
  if (role === UserRole.PROVIDER && booking.provider.userId === userId) return true;
  return false;
}

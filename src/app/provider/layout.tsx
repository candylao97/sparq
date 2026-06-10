import { requireProvider } from "@/server/permissions";
import {
  ProviderNavSidebar,
  ProviderNavMobile,
} from "@/components/provider/provider-nav";
import { ProviderAccountMenu } from "@/components/provider/provider-account-menu";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireProvider();
  const { name, email, image } = session.user;
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile: identity bar + tabs */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <span className="text-sm font-semibold text-neutral-900">
            My Account
          </span>
          <ProviderAccountMenu name={name} email={email} image={image} />
        </div>
        <ProviderNavMobile />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 md:flex md:flex-col">
            <div className="sticky top-8">
              {/* Identity */}
              <div className="mb-6 flex flex-col items-start gap-3">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-xl font-semibold text-white">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="size-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">
                    {name ?? "Account"}
                  </p>
                  {email && (
                    <p className="truncate text-xs text-neutral-500">{email}</p>
                  )}
                </div>
              </div>

              <ProviderNavSidebar />
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

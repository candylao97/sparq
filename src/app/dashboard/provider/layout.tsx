export default function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: 'calc(100vh - 80px)' }}>
      {children}
    </div>
  )
}

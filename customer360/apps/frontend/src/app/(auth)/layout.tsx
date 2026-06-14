export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {children}
    </div>
  );
}

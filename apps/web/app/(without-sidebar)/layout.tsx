export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="w-full flex-1">{children}</main>;
}
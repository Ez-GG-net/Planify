import { GoBackButton } from "@/components/marketing/go-back-button";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Page not found",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground w-full">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-8xl flex-1 flex-col items-center justify-center px-5 py-24 text-center sm:px-8 sm:py-32">
        <h1 className="mt-4 max-w-7xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="text-destructive">Error 404:</span> Page not found
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          The page you're looking for may have been moved, renamed, or
          never existed in the first place.
        </p>
        <GoBackButton className="mt-8 h-11 gap-2 px-6 text-lg" />
      </section>
    </main>
  );
}

import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SiteHeader } from "@/components/marketing/site-header";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground w-full">
      <SiteHeader />
      <Hero />
      <HowItWorks />
    </main>
  );
}

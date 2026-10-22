"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "Go back" action for the 404 page.
 */
export function GoBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="lg"
      className={className}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Go back
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { authClient, useSession } from "@/lib/auth-client";
import { UserAvatar } from "./user-avatar";

/**
 * Sidebar footer widget: sign-in entry point when anonymous, user identity
 * + sign-out when authenticated. Session state comes from Better Auth's
 * reactive hook (fetches GET /auth/get-session on the API origin).
 */
export function UserButton({ callbackPath }: { callbackPath: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        <span className="text-sm">Checking session…</span>
      </div>
    );
  }

  if (!session) {
    return (
      // Base UI pattern: render={<a/>} instead of Radix's asChild.
      <SidebarMenuButton tooltip="Sign in" render={<a href={`/sign-in?callbackPath=${encodeURIComponent(callbackPath)}`} />}>
        <LogIn aria-hidden />
        <span>Sign in</span>
      </SidebarMenuButton>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 px-1 py-0.5">
      <UserAvatar
        src={session.user.image}
        name={session.user.name}
      />
    
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">
          {session.user.name}
        </p>
      
        <p className="truncate text-xs text-muted-foreground">
          {session.user.email}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        aria-label="Sign out"
        onClick={() => {
          void authClient.signOut().then(() => router.refresh());
        }}
      >
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}

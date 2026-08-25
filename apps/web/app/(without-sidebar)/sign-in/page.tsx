"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import GoogleSignInButton from "@/components/sign-in/with-google/google-sign-in-button";
import { signInWithGoogle } from "@/lib/sign-in/sign-in-with-google";

/**
 * Sign-in entry point. Google OAuth is handled entirely by Better Auth on
 * the API: this button redirects to <api>/auth/signin/google, and the
 * provider callback lands back on <api>/auth/callback/google, which
 * then redirects to callbackURL ("/") with the session cookie set.
 *
 * Requires the redirect URI http://localhost:3001/api/auth/callback/google
 * to be registered in the Google Cloud console.
 */
export default function SignInPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);



  return (
<div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
  <div className="w-full max-w-sm">
    <div className="rounded-xl border bg-background p-8 shadow-sm">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Planify
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to create and manage your schedules.
        </p>
      </div>

      {/* Google */}
    <GoogleSignInButton onClick={()=>signInWithGoogle({ onError: (error) => setError(error), onStart: () => setPending(true) })} disabled={pending} />

      {error && (
        <p
          role="alert"
          className="mt-4 text-center text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing, you agree to use Planify responsibly.
      </p>
    </div>
  </div>
</div>
  );
}

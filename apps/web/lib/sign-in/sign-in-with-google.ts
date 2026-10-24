import { authClient } from "../auth-client";
function getSafeCallbackURL(value: string | undefined | null): string {
  if (!value) return "/";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
export async function signInWithGoogle({ onError, onStart }: { onError?: (error: string) => void; onStart?: () => void }) {
    onStart?.();
    const callbackPath = getSafeCallbackURL(decodeURIComponent(new URLSearchParams(window.location.search).get("callbackPath") ?? "/view/schedules")); // Later, maybe change this parameter to a 2 letter code (e.g. "cp") to save network bandwidth
    await authClient.signIn
      .social({ provider: "google", callbackURL: `${window.location.origin}/${callbackPath}` })
      .then(({ error }) => {
        if (error) {
          onError?.(error.message ?? "Sign-in failed. Try again.");
        }
        // On success Better Auth navigates away; no local state to update.
        //onFinish?.();
      })
      .catch(() => {
        onError?.("Could not reach the sign-in service.");
      });
  }
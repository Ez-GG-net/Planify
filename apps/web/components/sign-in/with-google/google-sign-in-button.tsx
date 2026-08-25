import { LoaderCircle } from "lucide-react";

export default function GoogleSignInButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {

return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {disabled ? (
          <>
            <LoaderCircle
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            {/* Google G logo */}
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
              />
              <path
                fill="#34A853"
                d="M12 21.99c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.99Z"
              />
              <path
                fill="#FBBC05"
                d="M6.54 14.07A5.86 5.86 0 0 1 6.23 12c0-.72.12-1.42.31-2.07V7.4H3.3A10 10 0 0 0 2.25 12c0 1.66.4 3.23 1.05 4.6l3.24-2.53Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.9c1.43 0 2.7.49 3.71 1.45l2.78-2.78C16.84 2.99 14.63 2 12 2a9.74 9.74 0 0 0-8.7 5.4l3.24 2.53C7.31 7.62 9.46 5.9 12 5.9Z"
              />
            </svg>

            <span>Continue with Google</span>
          </>
        )}
      </button>
)
}
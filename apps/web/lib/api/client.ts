// lib/api/client.ts

/*
 * ---------------------------------------------------------------------------
 * Shared fetch layer for every client-side API helper in lib/api.
 *
 * `request` centralizes headers and the ok-check so endpoints only describe
 * what makes them unique (URL, method, body, error copy). `api` adds JSON
 * parsing for the common case; streaming endpoints (e.g. chat SSE) use
 * `request` directly to reach the raw body.
 * ---------------------------------------------------------------------------
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiInit extends RequestInit {
    /**
     * Error message thrown when the response is not ok. Provided messages
     * win over whatever the server returned, keeping user-facing failure
     * copy stable per endpoint.
     */
    errorMessage?: string;
}

export async function request(url: string, init?: ApiInit): Promise<Response> {
    const { errorMessage, ...fetchInit } = init ?? {};

    const safeUrl = new URL(url, API_BASE).toString();
    const response = await fetch(safeUrl, {
        headers: {
            "Content-Type": "application/json",
        },
        // The API is authenticated via session cookies, so they must be
        // sent on every cross-origin call. Callers may override.
        credentials: "include",
        ...fetchInit,
    });

    if (!response.ok) {
        // Prefer endpoint-provided copy; fall back to the server's own
        // detail, then the status text.
        const detail = await response.text().catch(() => "");

        throw new Error(
            errorMessage ?? (detail || response.statusText || "Request failed")
        );
    }

    return response;
}

/** JSON request helper: throws on !ok, parses and returns the payload. */
export async function api<T>(url: string, init?: ApiInit): Promise<T> {
    const response = await request(url, init);

    return (await response.json()) as T;
}

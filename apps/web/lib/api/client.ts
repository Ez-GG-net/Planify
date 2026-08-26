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
     * Error message thrown when the response is not ok and no specific error
     * message is available from the server. Server messages are used when
     * available, keeping provided error message as fallback.
     */
    fallbackErrorMessage?: string;
}

/**
 * Thin wrapper around fetch for API calls. Adds credentials, JSON headers,
 * and maps non-2xx responses into thrown errors with the server's message.
 *
 * Network-level failures (API server down, DNS failure, CORS block) throw
 * a clear error so callers don't surface raw `TypeError: Failed to fetch`.
 */
export async function request(url: string, init?: ApiInit): Promise<Response> {
    const { fallbackErrorMessage, ...fetchInit } = init ?? {};

    const safeUrl = new URL(url, API_BASE).toString();

    let response: Response;
    try {
        response = await fetch(safeUrl, {
            headers: {
                "Content-Type": "application/json",
            },
            // The API is authenticated via session cookies, so they must be
            // sent on every cross-origin call. Callers may override.
            credentials: "include",
            ...fetchInit,
        });
    } catch (error) {
        // fetch throws TypeError on network errors (DNS failure, connection
        // refused, CORS preflight failure, etc.). Wrap in a meaningful message.
        if (error instanceof TypeError) {
            throw new Error(
                fallbackErrorMessage ?? "Cannot reach the API server. Is it running?",
            );
        }
        throw error;
    }

    if (!response.ok) {
        // Try to read the server's error envelope: { error: { code, message } }
        let serverError = { code: null, message: null };
        try {
            const body = await response.json();
            serverError = body?.error ?? "";
        } catch {
            // Response body wasn't JSON — fall through to status text
        }
        throw new Error(
            serverError.message ??
                (fallbackErrorMessage ||
                `Request failed (${response.status} ${response.statusText})`), { cause: serverError.code ?? response.status.toString() }
        );
    }

    return response;
}

/** JSON request helper: throws on !ok, parses and returns the payload. */
export async function api<T>(url: string, init?: ApiInit): Promise<T> {
    const response = await request(url, init);

    return (await response.json()) as T;
}

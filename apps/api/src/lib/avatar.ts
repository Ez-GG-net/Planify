import { config } from "../config";
import { db } from "../db";
import { userAvatar } from "../db/schema";

/**
 * Self-hosted avatars (capture-once policy):
 *
 * When a new user is created with an image URL hosted by an OAuth provider,
 * the bytes are downloaded once into Postgres and `user.image` is rewritten
 * to this API's own serving endpoint. Nothing re-fetches afterwards — if the
 * user changes their Google photo, our copy intentionally stays stale.
 *
 * Failure philosophy: any problem (bad URL, non-image content, oversize,
 * network error) returns null so the caller keeps the original value.
 * A degraded Google-hosted avatar beats blocking sign-up.
 */

const ALLOWED_HOST_PATTERN =
  /^(lh\d+\.googleusercontent\.com|accounts\.google\.com)$/;

const MAX_AVATAR_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 5_000;

/** Requested render size for Google's =sNN-c style directives. */
const TARGET_SIZE = 256;

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Rewrites Google's trailing size directive (=s96-c etc.) to the target
 * size, or appends one when missing — without it Google may serve the
 * original multi-megabyte upload.
 */
function withTargetSize(url: URL): URL {
  const sized = new URL(url.href);
  if (/googleusercontent\.com$/.test(sized.hostname)) {
    sized.pathname = /=s\d+[a-z-]*$/.test(sized.pathname)
      ? sized.pathname.replace(/=s\d+[a-z-]*$/, `=s${TARGET_SIZE}`)
      : `${sized.pathname}=s${TARGET_SIZE}`;
  }
  return sized;
}

async function downloadAvatar(
  url: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  // SSRF guard: redirects must not escape the allowlisted hosts.
  const finalHost = new URL(response.url).hostname;
  if (!response.ok || !ALLOWED_HOST_PATTERN.test(finalHost)) return null;

  const mimeType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim();
  if (!mimeType.startsWith("image/")) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;

  return { bytes, mimeType };
}

/**
 * Downloads an externally hosted profile image into Postgres and returns
 * the self-hosted serving URL to persist on the user row — or null when
 * nothing was captured (non-external value, download failure, ...).
 */
export async function captureExternalAvatar(
  userId: string,
  image: string | null | undefined,
): Promise<string | null> {
  if (!image) return null;

  const parsed = parseHttpsUrl(image);
  if (!parsed || !ALLOWED_HOST_PATTERN.test(parsed.hostname)) return null;

  try {
    const downloaded = await downloadAvatar(withTargetSize(parsed).href);
    if (!downloaded) return null;

    await db.insert(userAvatar).values({
      userId,
      mimeType: downloaded.mimeType,
      data: downloaded.bytes,
      byteSize: downloaded.bytes.byteLength,
      sourceUrl: image,
    });

    return `${config.auth.baseUrl}/users/${userId}/avatar`;
  } catch (error) {
    console.error("[avatar] capture failed:", error);
    return null;
  }
}

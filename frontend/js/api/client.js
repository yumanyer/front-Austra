import { getConfig } from "./config.js";

export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = details.status;
    this.cause = details.cause;
  }
}

function isApiError(error) {
  return error instanceof ApiError;
}

export async function requestJson(path, options = {}) {
  const config = getConfig();
  if (!path || !config.API_URL) {
    throw new ApiError("configuration", "API base URL is not configured");
  }

  const controller = new AbortController();
  const timeout = Number(options.timeout ?? config.REQUEST_TIMEOUT_MS);
  const timer = globalThis.setTimeout(() => controller.abort(), timeout);
  const abortHandler = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(`${config.API_URL}${path}`, {
      method: options.method || "GET",
      headers: { Accept: "application/json", ...(options.headers || {}) },
      signal: controller.signal,
      cache: options.cache || "no-store",
    });

    if (!response.ok) {
      throw new ApiError("http", `Backend request failed (${response.status})`, { status: response.status });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError("invalid_json", "Backend returned invalid JSON", { cause: error });
    }
  } catch (error) {
    if (isApiError(error)) throw error;
    if (error?.name === "AbortError") {
      throw new ApiError(options.signal?.aborted ? "aborted" : "timeout", options.signal?.aborted ? "Request was aborted" : "Request timed out", { cause: error });
    }
    throw new ApiError("network", "Backend could not be reached", { cause: error });
  } finally {
    globalThis.clearTimeout(timer);
    options.signal?.removeEventListener("abort", abortHandler);
  }
}

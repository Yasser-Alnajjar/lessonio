import HttpClient from "axios";
import { getSession } from "next-auth/react";

import { getCookie } from "./cookies";

// Base URL resolution:
// - Server-side (SSR): BACKEND_URL, reaching Laravel directly.
// - Client-side (browser): NEXT_PUBLIC_API_BASE_URL, or "" (relative URLs)
//   so nginx can route to the backend in production.
const isServer = () => typeof window === "undefined";

const getClientBaseUrl = () => {
  const clientBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!clientBaseUrl) return "";

  // Relative URLs avoid origin mismatches when the API is same-origin or local.
  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    if (
      clientBaseUrl === currentOrigin ||
      clientBaseUrl.includes("localhost")
    ) {
      return "";
    }
  }
  return clientBaseUrl;
};

const baseUrl = isServer()
  ? process.env.BACKEND_URL || "http://127.0.0.1:8000"
  : getClientBaseUrl();

const axios = HttpClient.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Dynamically imported to keep server-only auth code out of the client bundle.
async function getServerSideSession() {
  try {
    const { auth } = await import("@auth");
    return await auth();
  } catch (error) {
    console.warn("Failed to get server session:", error);
    return null;
  }
}

axios.interceptors.request.use(
  async (config) => {
    try {
      const sessionPromise = isServer() ? getServerSideSession() : getSession();

      const [session, locale] = await Promise.all([
        sessionPromise,
        Promise.resolve(getCookie("NEXT_LOCALE")),
      ]);

      if (locale) {
        config.headers["Accept-Language"] = locale;
      }

      if (session?.jwt?.accessToken) {
        config.headers.Authorization = `Bearer ${session.jwt.accessToken}`;
      }
    } catch (error) {
      // If session retrieval fails (e.g., during SSR), continue without auth.
      console.warn("Failed to get session for auth headers:", error);
    }

    // Skip SSL verification for internal Docker network calls.
    if (isServer() && process.env.SKIP_SSL_VERIFY === "true") {
      const { Agent } = await import("https");
      config.httpsAgent = new Agent({ rejectUnauthorized: false });
    }

    // FormData uploads MUST NOT carry the forced application/json Content-Type
    // that the axios instance sets as a default. Drop it so the runtime
    // serializer (browser FormData / node form-data) adds the right
    // `multipart/form-data; boundary=...` header itself, or Laravel's
    // multipart parser never populates $request->file(...).
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }

    return config;
  },
  async (error) => {
    console.error("Request interceptor failed:", error);
    return Promise.reject(error);
  },
);

// 401s arrive as RESPONSES, so the sign-out must live in a response
// interceptor (the request-error handler above never sees HTTP statuses).
// When the backend token is expired/revoked, end the UI session too instead
// of leaving a zombie UI.
// axios.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const url = String(error?.config?.url || "");
//     // Only requests that were actually SENT with a token can prove the token
//     // is bad. Unauthenticated 401s (public pages before login, or a pre-login
//     // request whose response lands just after login) must never sign out —
//     // that caused a redirect loop on the login page and a race that killed
//     // fresh logins.
//     const sentWithToken = !!error?.config?.headers?.Authorization;
//     if (
//       error?.response?.status === 401 &&
//       typeof window !== "undefined" &&
//       !url.includes("/auth/") &&
//       sentWithToken
//     ) {
//       await signOut({
//         callbackUrl: "/auth/login?error=SessionExpired",
//       }).catch(() => {});
//     }
//     return Promise.reject(error);
//   },
// );

export { axios };

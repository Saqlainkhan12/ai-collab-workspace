const API_BASE = (
  typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL
    ? "/api"
    : ((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")) + "/api"
);

export function getDefaultHeaders(userId = 1) {
  return {
    "Content-Type": "application/json",
    "X-User-ID": String(userId),
  };
}

export { API_BASE };


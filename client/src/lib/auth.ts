import { createAuthClient } from "@neondatabase/auth";

// URL ini HANYA digunakan jika import.meta.env.VITE_AUTH_URL tidak diset.
// Agar auth berfungsi di production dan lokal tanpa Hono Proxy,
// VITE_AUTH_URL harus berupa URL asli dari console.neon.tech > Auth URL.
// Contoh: https://auth.neon.tech/proj-xxxxxxxxxxxx
export const authClient = createAuthClient(
  import.meta.env.VITE_AUTH_URL || "https://auth.neon.tech/dummy-project"
);

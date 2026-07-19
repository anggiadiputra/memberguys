import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

export const authClient = createAuthClient(
  import.meta.env.VITE_AUTH_URL || "https://auth.neon.tech/dummy-project",
  {
    adapter: BetterAuthReactAdapter(),
  }
);

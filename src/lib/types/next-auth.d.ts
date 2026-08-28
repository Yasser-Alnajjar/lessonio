import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string | null;
    accessToken: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string | null;
    };
    jwt: {
      accessToken: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string | null;
    accessToken: string;
  }
}

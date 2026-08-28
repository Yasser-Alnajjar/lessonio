import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import HttpClient from "axios";

// Server-side requests go straight to the Laravel API (internal/dev network);
// there is no browser involved here, so relative URLs don't apply.
const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

interface BackendUser {
  id: string;
  email: string;
  role: string | null;
}

interface LoginResponse {
  data: {
    token: string;
    user: BackendUser;
  };
}

interface MeResponse {
  data: BackendUser | null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          if (!credentials?.email || !credentials?.password) return null;

          try {
            const { data } = await HttpClient.post<LoginResponse>(
              `${backendUrl}/api/v1/auth/login`,
              {
                email: credentials.email,
                password: credentials.password,
              },
              { headers: { Accept: "application/json" } },
            );

            const { token, user } = data.data;
            return {
              id: user.id,
              email: user.email,
              role: user.role,
              accessToken: token,
            };
          } catch {
            return null;
          }
        },
      }),
      // Exchanges the one-time Sanctum token Laravel appends to the OAuth
      // callback redirect (`OAuthController@callback`) for a real NextAuth
      // session. See `src/app/api/auth/oauth-callback/route.ts` — Laravel has
      // no equivalent of a browser-set httpOnly session cookie for OAuth, so
      // the token round-trips through the URL once and is verified here.
      Credentials({
        id: "oauth-token",
        name: "OAuth Token",
        credentials: { token: { type: "text" } },
        authorize: async (credentials) => {
          const token = credentials?.token;
          if (!token || typeof token !== "string") return null;

          try {
            const { data } = await HttpClient.get<MeResponse>(
              `${backendUrl}/api/v1/auth/me`,
              {
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (!data.data) return null;

            return {
              id: data.data.id,
              email: data.data.email,
              role: data.data.role,
              accessToken: token,
            };
          } catch {
            return null;
          }
        },
      }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
      jwt: async ({ token, user }) => {
        if (user) {
          token.id = user.id as string;
          token.role = user.role;
          token.accessToken = user.accessToken;
        }
        return token;
      },
      session: async ({ session, token }) => {
        session.user.id = token.id;
        session.user.role = token.role;
        session.jwt = { accessToken: token.accessToken };
        return session;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  });

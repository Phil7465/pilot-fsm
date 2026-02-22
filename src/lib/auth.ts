import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("Credentials validation failed");
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          console.error("User not found:", email);
          return null;
        }
        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          console.error("Invalid password for user:", email);
          return null;
        }

        console.log("User authenticated successfully:", email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        console.log("JWT callback - User added to token:", user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "DRIVER") ?? "DRIVER";
        console.log("Session callback - Session created for:", session.user.email);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback:", { url, baseUrl });
      
      // If it's a relative URL, just return it
      if (url.startsWith("/")) {
        console.log("Redirecting to relative URL:", url);
        return url;
      }
      
      // Parse the URLs
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        console.log("Parsed URLs:", {
          urlHost: urlObj.hostname,
          baseHost: baseUrlObj.hostname,
        });
        
        // Allow same hostname
        if (urlObj.hostname === baseUrlObj.hostname) {
          console.log("Same hostname, allowing redirect");
          return url;
        }
        
        // Allow localhost and local network IPs
        const localHosts = ["localhost", "127.0.0.1"];
        const isLocalSource = localHosts.includes(baseUrlObj.hostname) || 
                             baseUrlObj.hostname.startsWith("192.168.") ||
                             baseUrlObj.hostname.startsWith("10.");
        const isLocalTarget = localHosts.includes(urlObj.hostname) || 
                             urlObj.hostname.startsWith("192.168.") ||
                             urlObj.hostname.startsWith("10.");
        
        // If both are local, allow the redirect
        if (isLocalSource && isLocalTarget) {
          console.log("Both are local, allowing redirect");
          return url;
        }
        
        console.log("Hostname mismatch, using default redirect");
      } catch (e) {
        console.error("Redirect URL parsing error:", e);
      }
      
      // Default to a safe relative URL
      console.log("Defaulting to /dashboard");
      return "/dashboard";
    },
    async signIn({ user }) {
      console.log("SignIn callback - Allowing sign in for:", user?.email);
      // Allow sign in
      return true;
    },
  },
};

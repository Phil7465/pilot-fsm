import OAuthClient from "intuit-oauth";
import { prisma } from "@/lib/prisma";

const baseConfig = {
  clientId: process.env.QBO_CLIENT_ID ?? "",
  clientSecret: process.env.QBO_CLIENT_SECRET ?? "",
  environment: (process.env.QBO_ENVIRONMENT ?? "sandbox") as "sandbox" | "production",
  redirectUri: process.env.QBO_REDIRECT_URI ?? "http://localhost:3000/api/integrations/quickbooks/callback",
};

export function getOAuthClient(token?: { accessToken: string; refreshToken: string; realmId: string }) {
  const client = new OAuthClient({
    clientId: baseConfig.clientId,
    clientSecret: baseConfig.clientSecret,
    environment: baseConfig.environment,
    redirectUri: baseConfig.redirectUri,
  });

  if (token) {
    client.setToken({
      token_type: "bearer",
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400,
      realmId: token.realmId,
    });
  }

  return client;
}

export async function getActiveQuickBooksCredential() {
  const credential = await prisma.quickBooksCredential.findFirst();
  return credential;
}

export async function refreshAccessToken() {
  const credential = await getActiveQuickBooksCredential();
  if (!credential) throw new Error("QuickBooks is not connected");

  const client = getOAuthClient({
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    realmId: credential.realmId,
  });

  try {
    const token = await client.refreshUsingToken(credential.refreshToken);
    
    if (!token) {
      throw new Error("Token refresh failed - no token returned");
    }

    if (!token.access_token || !token.refresh_token || !token.expires_in) {
      throw new Error("Token refresh returned invalid data. Your QuickBooks connection may have expired. Please reconnect.");
    }

    await prisma.quickBooksCredential.update({
      where: { id: credential.id },
      data: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    });

    return token.access_token;
  } catch (error: any) {
    console.error("Token refresh error:", error);
    throw new Error(`Failed to refresh QuickBooks token: ${error.message}. You may need to reconnect QuickBooks.`);
  }
}

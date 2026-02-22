import OAuthClient from "intuit-oauth";

export function getQuickBooksClient() {
  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID || "",
    clientSecret: process.env.QBO_CLIENT_SECRET || "",
    environment: process.env.QBO_ENVIRONMENT === "production" ? "production" : "sandbox",
    redirectUri: process.env.QBO_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`,
  });

  return oauthClient;
}

export function getAuthorizationUrl() {
  const qbClient = getQuickBooksClient();
  const authUri = qbClient.authorizeUri({
    scope: [(OAuthClient as any).scopes.Accounting, (OAuthClient as any).scopes.OpenId],
    state: "testState",
  });
  return authUri;
}

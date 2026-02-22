declare module "intuit-oauth" {
  export default class OAuthClient {
    constructor(options: {
      clientId: string;
      clientSecret: string;
      environment: "sandbox" | "production";
      redirectUri: string;
    });

    static tokenDeserialize(serialized: string): OAuthClient;

    setToken(token: {
      token_type: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      realmId: string;
    }): void;

    authorizeUri(config: { scope: string[]; state: string }): string;

    createToken(code: string): Promise<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      realmId: string;
    }>;

    refreshUsingToken(refreshToken: string): Promise<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
    }>;
  }
}

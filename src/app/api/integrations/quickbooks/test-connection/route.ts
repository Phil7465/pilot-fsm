import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { getActiveQuickBooksCredential, refreshAccessToken } from "@/lib/quickbooks/client";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  try {
    const credential = await getActiveQuickBooksCredential();
    if (!credential) {
      return NextResponse.json(
        { error: "QuickBooks not connected" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(credential.expiresAt);
    const isExpired = expiresAt < now;

    if (isExpired) {
      try {
        await refreshAccessToken();
      } catch (error: any) {
        return NextResponse.json(
          { 
            error: "Token expired and refresh failed", 
            details: error.message 
          },
          { status: 401 }
        );
      }
    }

    // Get fresh credential after potential refresh
    const freshCredential = await getActiveQuickBooksCredential();
    if (!freshCredential) {
      return NextResponse.json(
        { error: "Credential not found after refresh" },
        { status: 500 }
      );
    }

    // Try to fetch company info from QuickBooks
    const baseUrl = process.env.QBO_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    const url = `${baseUrl}/v3/company/${freshCredential.realmId}/companyinfo/${freshCredential.realmId}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${freshCredential.accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: `QuickBooks API error: ${response.status}`,
          details: errorText,
          realmId: freshCredential.realmId,
          environment: process.env.QBO_ENVIRONMENT || 'sandbox',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const companyName = data?.CompanyInfo?.CompanyName || 'Unknown';

    return NextResponse.json({
      success: true,
      companyName,
      realmId: freshCredential.realmId,
      environment: process.env.QBO_ENVIRONMENT || 'sandbox',
      tokenExpiry: freshCredential.expiresAt.toISOString(),
    });

  } catch (error: any) {
    console.error("QuickBooks connection test failed:", error);
    return NextResponse.json(
      { 
        error: "Connection test failed",
        details: error.message,
        environment: process.env.QBO_ENVIRONMENT || 'sandbox',
      },
      { status: 500 }
    );
  }
}

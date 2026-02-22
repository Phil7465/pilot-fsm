import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOAuthClient, getActiveQuickBooksCredential, refreshAccessToken } from "@/lib/quickbooks/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First try to get cached accounts
    const cachedAccounts = await prisma.quickBooksAccount.findMany({
      orderBy: { fullyQualifiedName: 'asc' }
    });

    // If we have cached accounts less than a day old, return them
    if (cachedAccounts.length > 0) {
      const latestUpdate = cachedAccounts.reduce((latest, acc) => 
        acc.updatedAt > latest ? acc.updatedAt : latest, 
        cachedAccounts[0].updatedAt
      );
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (latestUpdate > oneDayAgo) {
        return NextResponse.json({ accounts: cachedAccounts, cached: true });
      }
    }

    // Fetch fresh accounts from QuickBooks
    const credential = await getActiveQuickBooksCredential();
    if (!credential) {
      return NextResponse.json({ error: "QuickBooks not connected" }, { status: 400 });
    }

    // Check if token needs refresh
    if (new Date(credential.expiresAt) < new Date()) {
      await refreshAccessToken();
    }

    const updated = await getActiveQuickBooksCredential();
    if (!updated) {
      return NextResponse.json({ error: "QuickBooks not connected" }, { status: 400 });
    }

    const client = getOAuthClient({
      accessToken: updated.accessToken,
      refreshToken: updated.refreshToken,
      realmId: updated.realmId,
    });

    // Fetch accounts from QuickBooks - only Income and Expense accounts
    const baseUrl = process.env.QBO_ENVIRONMENT === 'production' 
      ? 'https://quickbooks.api.intuit.com' 
      : 'https://sandbox-quickbooks.api.intuit.com';
    
    const query = "SELECT * FROM Account WHERE AccountType IN ('Income', 'Expense', 'Other Income', 'Other Expense', 'Cost of Goods Sold') AND Active = true MAXRESULTS 1000";
    const encodedQuery = encodeURIComponent(query);
    const url = `${baseUrl}/v3/company/${updated.realmId}/query?query=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${updated.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const qbAccounts = data.QueryResponse?.Account || [];

    // Clear old cached accounts and insert new ones
    await prisma.quickBooksAccount.deleteMany({});

    const accountsToCreate = qbAccounts.map((acc: any) => ({
      quickbooksId: acc.Id,
      name: acc.Name,
      fullyQualifiedName: acc.FullyQualifiedName || acc.Name,
      accountType: acc.AccountType,
      accountSubType: acc.AccountSubType || null,
      active: acc.Active,
    }));

    if (accountsToCreate.length > 0) {
      await prisma.quickBooksAccount.createMany({
        data: accountsToCreate,
      });
    }

    const newAccounts = await prisma.quickBooksAccount.findMany({
      orderBy: { fullyQualifiedName: 'asc' }
    });

    return NextResponse.json({ accounts: newAccounts, cached: false });
  } catch (error) {
    console.error("Failed to fetch QuickBooks accounts:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch accounts", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

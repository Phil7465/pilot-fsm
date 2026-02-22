import { prisma } from "@/lib/prisma";
import { getActiveQuickBooksCredential, getOAuthClient, refreshAccessToken } from "./client";
import { authenticatedClient, makeQBRequest } from "./sync";

export async function fetchQuickBooksAccounts() {
  const { accessToken, realmId } = await authenticatedClient();
  
  const query = "SELECT * FROM Account WHERE AccountType='Income' OR AccountType='Expense' MAXRESULTS 1000";
  
  try {
    const response = await makeQBRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(query)}`);
    
    const accounts = response.QueryResponse?.Account || [];
    
    // Cache in database
    await Promise.all(
      accounts.map((account: any) =>
        prisma.quickBooksAccount.upsert({
          where: { quickbooksId: account.Id },
          create: {
            quickbooksId: account.Id,
            name: account.Name,
            fullyQualifiedName: account.FullyQualifiedName || account.Name,
            accountType: account.AccountType,
            accountSubType: account.AccountSubType,
            active: account.Active !== false,
          },
          update: {
            name: account.Name,
            fullyQualifiedName: account.FullyQualifiedName || account.Name,
            accountType: account.AccountType,
            accountSubType: account.AccountSubType,
            active: account.Active !== false,
          },
        })
      )
    );
    
    return accounts;
  } catch (error: any) {
    console.error("Failed to fetch QuickBooks accounts:", error);
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }
}

export async function getIncomeAccounts() {
  // Try to return cached accounts first
  const cached = await prisma.quickBooksAccount.findMany({
    where: { accountType: "Income", active: true },
    orderBy: { name: "asc" },
  });
  
  if (cached.length > 0) {
    return cached;
  }
  
  // If no cached accounts, fetch from QB
  await fetchQuickBooksAccounts();
  
  return prisma.quickBooksAccount.findMany({
    where: { accountType: "Income", active: true },
    orderBy: { name: "asc" },
  });
}

export async function getExpenseAccounts() {
  const cached = await prisma.quickBooksAccount.findMany({
    where: { accountType: "Expense", active: true },
    orderBy: { name: "asc" },
  });
  
  if (cached.length > 0) {
    return cached;
  }
  
  await fetchQuickBooksAccounts();
  
  return prisma.quickBooksAccount.findMany({
    where: { accountType: "Expense", active: true },
    orderBy: { name: "asc" },
  });
}

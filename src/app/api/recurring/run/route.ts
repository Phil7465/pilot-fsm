import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { runRecurringBillingJob } from "@/lib/recurring";

export async function POST() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  await runRecurringBillingJob();
  return NextResponse.json({ status: "run" });
}

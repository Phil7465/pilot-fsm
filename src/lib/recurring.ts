import { prisma } from "@/lib/prisma";
import { calculateInvoiceTotals } from "@/lib/finance";
import { Decimal } from "@prisma/client/runtime/library";

export async function runRecurringBillingJob() {
  const duePlans = await prisma.recurringInvoice.findMany({
    where: { nextRunDate: { lte: new Date() }, active: true },
    include: { lineItems: true, customer: true },
  });

  for (const plan of duePlans) {
    const totals = calculateInvoiceTotals(
      {
        customerId: plan.customerId,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        lineItems: plan.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          vatCode: item.vatCode,
          incomeAccount: item.incomeAccount,
        })),
      },
      true
    );

    await prisma.invoice.create({
      data: {
        number: `SUB-${plan.id}-${Date.now()}`,
        customerId: plan.customerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 86400000),
        subtotal: new Decimal(totals.subtotal),
        vatTotal: new Decimal(totals.vatTotal),
        total: new Decimal(totals.total),
        balanceDue: new Decimal(totals.total),
        createdById: plan.customer.createdById ?? (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.id ?? plan.customerId,
        recurringParentId: plan.id,
        lineItems: {
          create: plan.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatCode: item.vatCode,
            incomeAccount: item.incomeAccount,
            total: new Decimal(Number(item.quantity) * Number(item.unitPrice)),
          })),
        },
      },
    });

    await prisma.recurringInvoice.update({
      where: { id: plan.id },
      data: { nextRunDate: addInterval(plan.nextRunDate, plan.interval) },
    });
  }
}

function addInterval(date: Date, interval: "MONTHLY") {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

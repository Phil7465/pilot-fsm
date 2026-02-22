import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  addressLine: z.string().min(3),
  city: z.string().min(2),
  postcode: z.string().min(2),
  country: z.string().default("GB"),
  vatStatus: z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT"]).default("STANDARD"),
});

const lineItemSchema = z.object({
  serviceTemplateId: z.string().optional().nullable(),
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  vatCode: z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT"]),
  incomeAccount: z.string().min(2),
});

// Transform empty strings / null / undefined to undefined, then validate as optional cuid
const optionalCuid = z.preprocess(
  (v) => (v === "" || v === null || v === undefined) ? undefined : v,
  z.string().cuid().optional()
);

export const jobSchema = z.object({
  customerId: z.string().cuid(),
  deliveryAddress: z.string().min(3),
  invoiceAddress: z.string().optional().nullable(),
  serviceDate: z.string(),
  assignedStaffId: optionalCuid,
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
});

export const invoiceSchema = z.object({
  customerId: z.string().cuid(),
  jobId: optionalCuid,
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema.omit({ serviceTemplateId: true })).min(1),
});

export const paymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  method: z.enum(["CARD", "DIRECT_DEBIT", "CASH", "BANK_TRANSFER"]),
  reference: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;

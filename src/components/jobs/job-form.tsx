"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { jobSchema, type JobInput } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function JobForm({
  customers,
  staff,
  services,
}: {
  customers: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    unitPrice: any;
    vatCode: string;
    incomeAccount: string;
  }>;
}) {
  const defaultCustomerId = customers[0]?.id;
  const defaultStaffId = staff[0]?.id;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sameAsDelivery, setSameAsDelivery] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customerId: defaultCustomerId,
      assignedStaffId: defaultStaffId,
      serviceDate: new Date().toISOString().slice(0, 10),
      deliveryAddress: "",
      status: "SCHEDULED",
      lineItems: [],
    } as any,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const deliveryAddress = watch("deliveryAddress");
  const [timePeriod, setTimePeriod] = useState<"AM" | "PM">("AM");

  // Update invoice address when checkbox changes
  const handleCheckboxChange = (checked: boolean) => {
    setSameAsDelivery(checked);
    if (checked) {
      setValue("invoiceAddress", deliveryAddress);
    } else {
      setValue("invoiceAddress", "");
    }
  };

  if (customers.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold">Create Job</h2>
        <p className="text-sm text-slate-500">Add a customer before creating jobs.</p>
      </div>
    );
  }

  async function onSubmit(values: JobInput) {
    setError(null);
    setSuccess(null);
    
    // Combine date with AM/PM time period
    const date = new Date(values.serviceDate);
    const hour = timePeriod === "AM" ? 9 : 14; // 9 AM or 2 PM
    date.setHours(hour, 0, 0, 0);
    
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        serviceDate: date.toISOString(),
      }),
    });
    if (!res.ok) {
      setError("Failed to create job");
      return;
    }
    setSuccess("Job created");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Create Job</h2>
        <p className="text-sm text-slate-500">Link to customer, assign staff, add line items.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Customer *</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("customerId")}
            defaultValue={customers[0]?.id}
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Assign staff</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("assignedStaffId")}
            defaultValue={staff[0]?.id}
          >
            <option value="">Unassigned</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Delivery/Collection Date *</label>
          <input 
            type="date" 
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" 
            {...register("serviceDate")}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Time Period</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setTimePeriod("AM")}
              className={`flex-1 rounded-xl border px-4 py-2 font-medium transition-colors ${
                timePeriod === "AM"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setTimePeriod("PM")}
              className={`flex-1 rounded-xl border px-4 py-2 font-medium transition-colors ${
                timePeriod === "PM"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
              }`}
            >
              PM
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Status</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("status")}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Address Details</h3>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Delivery Address *</label>
            <textarea 
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" 
              rows={2}
              {...register("deliveryAddress")}
              placeholder="Where the service will be performed"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={sameAsDelivery}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Invoice address is the same as delivery address
            </label>
          </div>

          {!sameAsDelivery && (
            <div>
              <label className="text-sm font-medium text-slate-600">Invoice Address</label>
              <textarea 
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" 
                rows={2}
                {...register("invoiceAddress")}
                placeholder="Billing address (if different from delivery)"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Notes</label>
        <textarea 
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" 
          rows={3}
          {...register("notes")}
          placeholder="Additional information about this job"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Line items</p>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const service = services.find(s => s.id === e.target.value);
                  if (service) {
                    append({
                      serviceTemplateId: service.id,
                      description: service.name,
                      quantity: 1,
                      unitPrice: parseFloat(service.unitPrice.toString()),
                      vatCode: service.vatCode as any,
                      incomeAccount: service.incomeAccount,
                    } as any);
                    e.target.value = "";
                  }
                }
              }}
            >
              <option value="">+ Add from service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - £{Number(service.unitPrice).toFixed(2)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                append({
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  vatCode: "STANDARD",
                  incomeAccount: "4000",
                  serviceTemplateId: null,
                } as any)
              }
              className="text-sm text-brand-600"
            >
              + Manual item
            </button>
          </div>
        </div>
        
        {/* Header row */}
        <div className="grid gap-3 px-3 md:grid-cols-5">
          <div className="text-xs font-medium text-slate-600 md:col-span-2">Description</div>
          <div className="text-xs font-medium text-slate-600">Quantity</div>
          <div className="text-xs font-medium text-slate-600">Unit Price</div>
          <div className="text-xs font-medium text-slate-600">VAT Rate</div>
        </div>
        
        {fields.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            No line items yet — add a service from the dropdown above
          </p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-5">
            <input placeholder="Description" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" {...register(`lineItems.${index}.description` as const)} />
            <input type="number" step="1" placeholder="1" className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.quantity` as const, { valueAsNumber: true })} />
            <input type="number" step="0.01" placeholder="0.00" className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.unitPrice` as const, { valueAsNumber: true })} />
            <select className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.vatCode` as const)}>
              <option value="STANDARD">VAT 20%</option>
              <option value="REDUCED">VAT 5%</option>
              <option value="ZERO">Zero</option>
              <option value="EXEMPT">Exempt</option>
            </select>
            <button type="button" onClick={() => remove(index)} className="text-xs text-red-500">
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        Save job
      </button>
    </form>
  );
}

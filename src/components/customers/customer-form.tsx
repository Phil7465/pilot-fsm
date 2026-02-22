"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/validation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@prisma/client";

interface CustomerFormProps {
  customer?: Customer;
  onCancel?: () => void;
}

export function CustomerForm({ customer, onCancel }: CustomerFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      vatStatus: "STANDARD",
      country: "GB",
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      reset(customer);
    } else {
      reset({
        vatStatus: "STANDARD",
        country: "GB",
      });
    }
  }, [customer, reset]);

  async function onSubmit(values: CustomerInput) {
    setError(null);
    setSuccess(null);
    
    const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
    const method = customer ? "PATCH" : "POST";
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setError(customer ? "Failed to update customer" : "Failed to save customer");
      return;
    }
    
    if (!customer) {
      reset();
    }
    setSuccess(customer ? "Customer updated" : "Customer created");
    router.refresh();
  }

  async function handleDelete() {
    if (!customer) return;
    
    const confirmed = confirm(`Delete customer "${customer.name}"? This will also mark them as inactive in QuickBooks.`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete customer");
      return;
    }

    setSuccess("Customer deleted");
    setTimeout(() => {
      if (onCancel) onCancel();
      router.refresh();
    }, 1000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {customer ? "Edit customer" : "Create customer"}
          </h2>
          <p className="text-sm text-slate-500">Name, contact info, VAT treatment.</p>
        </div>
        {customer && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Name</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("name")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Company</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("company")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Phone</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("phone")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Email</label>
          <input type="email" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("email")} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-600">Address line</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("addressLine")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">City</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("city")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Postcode</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("postcode")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Country</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("country")} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">VAT Status</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("vatStatus")}>
            <option value="STANDARD">Standard</option>
            <option value="REDUCED">Reduced</option>
            <option value="ZERO">Zero</option>
            <option value="EXEMPT">Exempt</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
          {customer ? "Update customer" : "Save customer"}
        </button>
        {customer && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-xl bg-red-500 px-6 py-2 font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

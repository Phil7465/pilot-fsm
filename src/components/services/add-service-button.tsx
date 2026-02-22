"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddServiceButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description") || null,
      unitPrice: parseFloat(formData.get("unitPrice") as string),
      vatCode: formData.get("vatCode"),
      incomeAccount: formData.get("incomeAccount"),
      isRecurring: formData.get("isRecurring") === "on",
    };

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to create service");
        return;
      }

      router.refresh();
      setIsOpen(false);
    } catch (error) {
      console.error("Create error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Add Service
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Add New Service
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Service Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Trailer Delivery"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional service description"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Unit Price *
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  VAT Rate *
                </label>
                <select
                  name="vatCode"
                  required
                  defaultValue="STANDARD"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="STANDARD">Standard (20%)</option>
                  <option value="REDUCED">Reduced (5%)</option>
                  <option value="ZERO">Zero (0%)</option>
                  <option value="EXEMPT">Exempt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Income Account *
                </label>
                <input
                  type="text"
                  name="incomeAccount"
                  required
                  defaultValue="4000"
                  placeholder="4000"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isRecurring"
                  id="isRecurring"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-sm text-slate-700">
                  Recurring service
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Service"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { VatCode } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  description: string | null;
  unitPrice: any;
  vatCode: VatCode;
  incomeAccount: string;
  isRecurring: boolean;
}

interface Props {
  services: Service[];
}

export function ServiceList({ services }: Props) {
  const router = useRouter();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEdit(service: Service, formData: FormData) {
    setIsSubmitting(true);
    try {
      const data = {
        name: formData.get("name"),
        description: formData.get("description") || null,
        unitPrice: parseFloat(formData.get("unitPrice") as string),
        vatCode: formData.get("vatCode"),
        incomeAccount: formData.get("incomeAccount"),
        isRecurring: formData.get("isRecurring") === "on",
      };

      const res = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to update service");
        return;
      }

      setEditingService(null);
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to delete service");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Service Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Description
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Unit Price
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                VAT Rate
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {services.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No services found. Create your first service to get started.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {service.description || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                    £{Number(service.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {service.vatCode === "STANDARD"
                        ? "20%"
                        : service.vatCode === "REDUCED"
                        ? "5%"
                        : service.vatCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingService(service)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        disabled={isSubmitting}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {services.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-600">
            Showing {services.length} {services.length === 1 ? "service" : "services"}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Edit Service
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit(editingService, new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Service Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingService.name}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingService.description || ""}
                  rows={2}
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
                  defaultValue={editingService.unitPrice.toString()}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  VAT Rate *
                </label>
                <select
                  name="vatCode"
                  defaultValue={editingService.vatCode}
                  required
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
                  defaultValue={editingService.incomeAccount}
                  required
                  placeholder="4000"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isRecurring"
                  id="isRecurring"
                  defaultChecked={editingService.isRecurring}
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
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
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

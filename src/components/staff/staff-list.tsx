"use client";

import { Role } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
  _count: {
    jobsAssigned: number;
  };
}

interface Props {
  staff: StaffMember[];
}

export function StaffList({ staff }: Props) {
  const router = useRouter();
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<StaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEdit(member: StaffMember, formData: FormData) {
    setIsSubmitting(true);
    try {
      const data: any = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || null,
        role: formData.get("role"),
      };

      const password = formData.get("password") as string;
      if (password) {
        data.password = password;
      }

      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to update staff member");
        return;
      }

      setEditingMember(null);
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`Are you sure you want to delete ${member.name}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to delete staff member");
        return;
      }

      setDeletingMember(null);
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
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Jobs Assigned
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                  No staff members found
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{member.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {member.phone || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {member._count.jobsAssigned}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      {member._count.jobsAssigned > 0 ? (
                        <Link
                          href={`/jobs?staff=${member.id}`}
                          className="text-sm font-medium text-slate-600 hover:text-slate-700"
                        >
                          View Jobs ({member._count.jobsAssigned})
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={isSubmitting}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {staff.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-600">
            Showing {staff.length} staff {staff.length === 1 ? "member" : "members"}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Edit Staff Member
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit(editingMember, new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingMember.name}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingMember.email}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingMember.phone || ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  name="role"
                  defaultValue={editingMember.role}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="DRIVER">Driver</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  New Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  name="password"
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
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
                  onClick={() => setEditingMember(null)}
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

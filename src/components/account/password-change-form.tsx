"use client";

import { useState, FormEvent } from "react";

interface Props {
  userId: string;
}

export function PasswordChangeForm({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Password changed successfully" });
        (e.target as HTMLFormElement).reset();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Change Password</h2>
        <p className="text-sm text-slate-500">
          Update your password to keep your account secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">New Password</label>
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
        </div>

        <div>
          <label className="text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Changing Password..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

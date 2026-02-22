"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    
    const data = new FormData(event.currentTarget);
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl,
    });
    
    // This won't be reached if redirect is successful
    if (result?.error) {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back to Pilot Field Service Pro
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
        <p className="text-center text-sm text-slate-500">
          Demo accounts: admin@pilotfsm.test / driver@pilotfsm.test
          <br />
          <span className="text-xs">Password: ChangeMe123!</span>
        </p>
      </form>
    </div>
  );
}

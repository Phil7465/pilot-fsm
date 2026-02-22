"use client";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function UserMenu({ user }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2" style={{ borderColor: 'var(--color-sidebar-font, #e2e8f0)' }}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">{user.name || "User"}</div>
        <div className="truncate text-xs opacity-60">{user.email}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SyncSettings = {
  id: string;
  syncCustomers: boolean;
  syncItems: boolean;
  syncInvoices: boolean;
  syncPayments: boolean;
  autoSync: boolean;
  syncIntervalMins: number;
};

export function SyncSettingsForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: keyof SyncSettings, value: boolean | number) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  if (loading || !settings) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Loading sync settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.syncCustomers}
            onChange={(e) => updateSetting("syncCustomers", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-medium">Sync Customers</div>
            <div className="text-xs text-slate-500">
              Pull customers from QuickBooks into the app
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.syncItems}
            onChange={(e) => updateSetting("syncItems", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-medium">Sync Items</div>
            <div className="text-xs text-slate-500">
              Pull service items from QuickBooks into service templates
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.syncInvoices}
            onChange={(e) => updateSetting("syncInvoices", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-medium">Sync Invoices</div>
            <div className="text-xs text-slate-500">
              Pull invoices from QuickBooks (amounts and VAT from QBO, never recalculated)
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.syncPayments}
            onChange={(e) => updateSetting("syncPayments", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-medium">Sync Payments</div>
            <div className="text-xs text-slate-500">
              Pull payments from QuickBooks and update invoice balances
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.autoSync}
            onChange={(e) => updateSetting("autoSync", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-medium">Automatic Sync (QBO → App)</div>
            <div className="text-xs text-slate-500">
              Automatically sync data with QuickBooks at regular intervals
            </div>
          </div>
        </label>

        {settings.autoSync && (
          <div className="ml-7 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Sync every</label>
            <select
              value={settings.syncIntervalMins}
              onChange={(e) => updateSetting("syncIntervalMins", Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Sync Settings"}
      </button>
    </div>
  );
}

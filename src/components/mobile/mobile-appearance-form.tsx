"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AppearanceSettings {
  sidebarBg: string;
  sidebarFont: string;
  cardBg: string;
  background: string;
}

const defaultSettings: AppearanceSettings = {
  sidebarBg: "#ffffff",
  sidebarFont: "#475569",
  cardBg: "#ffffff",
  background: "#f8fafc",
};

const presets = [
  { name: "Default", sidebarBg: "#ffffff", sidebarFont: "#475569", cardBg: "#ffffff", background: "#f8fafc" },
  { name: "Dark", sidebarBg: "#1e293b", sidebarFont: "#e2e8f0", cardBg: "#ffffff", background: "#f1f5f9" },
  { name: "Navy", sidebarBg: "#1e3a5f", sidebarFont: "#bfdbfe", cardBg: "#ffffff", background: "#f0f4f8" },
  { name: "Forest", sidebarBg: "#14532d", sidebarFont: "#bbf7d0", cardBg: "#ffffff", background: "#f0fdf4" },
  { name: "Plum", sidebarBg: "#581c87", sidebarFont: "#e9d5ff", cardBg: "#ffffff", background: "#faf5ff" },
  { name: "Charcoal", sidebarBg: "#374151", sidebarFont: "#d1d5db", cardBg: "#ffffff", background: "#f3f4f6" },
];

export function MobileAppearanceForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("appearance");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSettings({
        sidebarBg: parsed.sidebarBg || defaultSettings.sidebarBg,
        sidebarFont: parsed.sidebarFont || defaultSettings.sidebarFont,
        cardBg: parsed.cardBg || defaultSettings.cardBg,
        background: parsed.background || defaultSettings.background,
      });
    }
  }, []);

  function applyPreset(preset: typeof presets[0]) {
    const newSettings = {
      sidebarBg: preset.sidebarBg,
      sidebarFont: preset.sidebarFont,
      cardBg: preset.cardBg,
      background: preset.background,
    };
    setSettings(newSettings);
  }

  function handleColorChange(key: keyof AppearanceSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Preserve any existing settings (like logo) that we don't manage here
    const existing = localStorage.getItem("appearance");
    const existingParsed = existing ? JSON.parse(existing) : {};
    const merged = { ...existingParsed, ...settings };

    localStorage.setItem("appearance", JSON.stringify(merged));
    document.documentElement.style.setProperty("--color-sidebar", settings.sidebarBg);
    document.documentElement.style.setProperty("--color-sidebar-font", settings.sidebarFont);
    document.documentElement.style.setProperty("--color-card", settings.cardBg);
    document.documentElement.style.setProperty("--color-background", settings.background);

    window.dispatchEvent(new Event("themeUpdated"));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  function handleReset() {
    setSettings(defaultSettings);
    const existing = localStorage.getItem("appearance");
    const existingParsed = existing ? JSON.parse(existing) : {};
    const merged = { ...existingParsed, ...defaultSettings };
    localStorage.setItem("appearance", JSON.stringify(merged));

    document.documentElement.style.removeProperty("--color-sidebar");
    document.documentElement.style.removeProperty("--color-sidebar-font");
    document.documentElement.style.removeProperty("--color-card");
    document.documentElement.style.removeProperty("--color-background");

    window.dispatchEvent(new Event("themeUpdated"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        {/* Colour Presets */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Quick Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-left transition active:bg-slate-50"
                >
                  <div className="flex gap-0.5">
                    <div
                      className="h-5 w-5 rounded-l-md border border-slate-200"
                      style={{ backgroundColor: preset.sidebarBg }}
                    />
                    <div
                      className="h-5 w-5 rounded-r-md border border-slate-200"
                      style={{ backgroundColor: preset.sidebarFont }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Colour Pickers */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Custom Colours</label>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Navigation Bar</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.sidebarBg}
                  onChange={(e) => handleColorChange("sidebarBg", e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <span className="text-xs text-slate-400">{settings.sidebarBg}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Navigation Text</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.sidebarFont}
                  onChange={(e) => handleColorChange("sidebarFont", e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <span className="text-xs text-slate-400">{settings.sidebarFont}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Card</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.cardBg}
                  onChange={(e) => handleColorChange("cardBg", e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <span className="text-xs text-slate-400">{settings.cardBg}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Background</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.background}
                  onChange={(e) => handleColorChange("background", e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <span className="text-xs text-slate-400">{settings.background}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Preview</p>
            <div className="flex gap-2 rounded-lg p-2" style={{ backgroundColor: settings.background }}>
              <div className="w-16 rounded-lg p-2" style={{ backgroundColor: settings.sidebarBg }}>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded" style={{ backgroundColor: settings.sidebarFont, opacity: 0.7 }} />
                  <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: settings.sidebarFont, opacity: 0.5 }} />
                  <div className="h-1.5 w-full rounded" style={{ backgroundColor: settings.sidebarFont, opacity: 0.7 }} />
                </div>
              </div>
              <div className="flex-1 rounded-lg p-2" style={{ backgroundColor: settings.cardBg }}>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded bg-slate-200" />
                  <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition active:bg-brand-600"
            >
              {saved ? "Saved!" : "Apply"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition active:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
    </div>
  );
}

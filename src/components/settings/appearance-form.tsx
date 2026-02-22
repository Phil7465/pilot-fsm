"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AppearanceSettings {
  sidebarBg: string;
  sidebarFont: string;
  cardBg: string;
  background: string;
  logo: string | null;
}

const defaultSettings: AppearanceSettings = {
  sidebarBg: "#ffffff",
  sidebarFont: "#475569",
  cardBg: "#ffffff",
  background: "#f8fafc",
  logo: null,
};

export function AppearanceForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("appearance");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSettings(parsed);
      setLogoPreview(parsed.logo);
    }
  }, []);

  function handleColorChange(key: keyof AppearanceSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setSettings((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setSettings((prev) => ({ ...prev, logo: null }));
  }

  function handleSave() {
    localStorage.setItem("appearance", JSON.stringify(settings));
    document.documentElement.style.setProperty("--color-sidebar", settings.sidebarBg);
    document.documentElement.style.setProperty("--color-sidebar-font", settings.sidebarFont);
    document.documentElement.style.setProperty("--color-card", settings.cardBg);
    document.documentElement.style.setProperty("--color-background", settings.background);
    
    // Dispatch custom event to notify all theme initializers
    window.dispatchEvent(new Event("themeUpdated"));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    
    router.refresh();
  }

  function handleReset() {
    setSettings(defaultSettings);
    setLogoPreview(null);
    localStorage.removeItem("appearance");
    document.documentElement.style.removeProperty("--color-sidebar");
    document.documentElement.style.removeProperty("--color-sidebar-font");
    document.documentElement.style.removeProperty("--color-card");
    document.documentElement.style.removeProperty("--color-background");
    
    // Dispatch custom event to notify all theme initializers
    window.dispatchEvent(new Event("themeUpdated"));
    
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-slate-500">Customize colors and branding.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Sidebar background</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={settings.sidebarBg}
              onChange={(e) => handleColorChange("sidebarBg", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200"
            />
            <input
              type="text"
              value={settings.sidebarBg}
              onChange={(e) => handleColorChange("sidebarBg", e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Sidebar font color</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={settings.sidebarFont}
              onChange={(e) => handleColorChange("sidebarFont", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200"
            />
            <input
              type="text"
              value={settings.sidebarFont}
              onChange={(e) => handleColorChange("sidebarFont", e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Card background</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={settings.cardBg}
              onChange={(e) => handleColorChange("cardBg", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200"
            />
            <input
              type="text"
              value={settings.cardBg}
              onChange={(e) => handleColorChange("cardBg", e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Page background</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={settings.background}
              onChange={(e) => handleColorChange("background", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200"
            />
            <input
              type="text"
              value={settings.background}
              onChange={(e) => handleColorChange("background", e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Sidebar logo (PNG with transparent background)</label>
          <div className="mt-2 space-y-3">
            {logoPreview && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <img src={logoPreview} alt="Logo preview" className="h-12 w-auto object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="ml-auto rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/png"
              onChange={handleLogoUpload}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="btn-primary flex-1">
          {saved ? "✓ Saved!" : "Save appearance"}
        </button>
        <button
          onClick={handleReset}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function PWAInstallCard() {
  const [appUrl, setAppUrl] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Try to detect network IP, fallback to current origin
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      
      // If localhost, suggest user should use network IP
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        setAppUrl(origin);
        setIsEditing(true); // Show edit mode by default for localhost
      } else {
        setAppUrl(origin);
      }
    }
  }, []);

  const displayUrl = customUrl || appUrl;
  const mobileUrl = displayUrl + "/schedule";

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomUrl(e.target.value);
  }

  function toggleEdit() {
    setIsEditing(!isEditing);
    if (isEditing && !customUrl) {
      setCustomUrl(appUrl);
    }
  }

  if (!appUrl) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Mobile App Installation</h2>
        <p className="text-sm text-slate-500">
          Scan this QR code with a mobile device to install the app
        </p>
      </div>

      {isLocalhost && !customUrl && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-900">
            <strong>⚠️ Network IP Required:</strong> You&apos;re on localhost. Mobile devices 
            need your network IP address (e.g., http://192.168.0.226:3000). 
            <button 
              onClick={() => setIsEditing(true)}
              className="ml-1 underline font-medium"
            >
              Click here to set it
            </button>
          </p>
        </div>
      )}

      <div className="flex flex-col items-center space-y-4">
        {/* QR Code */}
        <div className="rounded-2xl border-4 border-slate-200 bg-white p-4">
          <QRCodeSVG
            value={mobileUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* App URL */}
        <div className="w-full space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Network URL (your computer&apos;s IP address):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={handleUrlChange}
                  placeholder="e.g., http://192.168.0.226:3000"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={toggleEdit}
                  className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-slate-500">
                💡 To find your IP: Windows: Run <code className="bg-slate-200 px-1 rounded">ipconfig</code> in CMD. 
                Mac: System Settings → Network. Use the IPv4 address shown.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <code className="flex-1 text-xs text-slate-700 break-all">
                {mobileUrl}
              </code>
              <button
                onClick={toggleEdit}
                className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                Edit
              </button>
              <button
                onClick={copyToClipboard}
                className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="w-full space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <p className="font-semibold text-slate-900">iOS (iPhone/iPad):</p>
            <ol className="ml-4 mt-1 list-decimal space-y-1 text-slate-600">
              <li>Scan QR code with Camera app</li>
              <li>Tap the notification to open in Safari</li>
              <li>Tap the Share button (box with arrow)</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
              <li>Tap &quot;Add&quot; to install</li>
            </ol>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-900">Android:</p>
            <ol className="ml-4 mt-1 list-decimal space-y-1 text-slate-600">
              <li>Scan QR code with Camera or Chrome</li>
              <li>Open the link in Chrome browser</li>
              <li>Tap the menu (three dots)</li>
              <li>Tap &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
              <li>Confirm installation</li>
            </ol>
          </div>
        </div>

        {/* Features note */}
        <div className="w-full rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-900">
            <strong>💡 Tip:</strong> Once installed, the app works offline and provides 
            a native app experience with push notifications and faster loading.
          </p>
        </div>
      </div>
    </div>
  );
}

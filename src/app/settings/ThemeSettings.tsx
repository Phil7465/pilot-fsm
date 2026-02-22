import React, { useState, useEffect } from 'react';

export const ThemeSettings = () => {
  const [colors, setColors] = useState({
    sidebar: '#ffffff',
    card: '#ffffff',
    background: '#f8fafc',
  });
  const [logo, setLogo] = useState<string | null>(null);

  // Load saved settings on mount (mock implementation using localStorage)
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
      setColors(JSON.parse(savedTheme));
    }
    const savedLogo = localStorage.getItem('app_logo');
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);
    localStorage.setItem('app_theme', JSON.stringify(newColors));
    
    // Apply CSS variables for immediate preview if your app uses them
    document.documentElement.style.setProperty(`--color-${key}`, value);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        alert('Please upload a PNG image.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogo(result);
        localStorage.setItem('app_logo', result);
        // In a real application, you would upload 'file' to your storage service here
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Appearance & Branding</h3>
      
      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Sidebar Logo</label>
          <div className="mt-2 flex items-center space-x-5">
            <div className="flex-shrink-0 h-16 w-16 border border-gray-300 bg-gray-50 rounded-md overflow-hidden flex items-center justify-center">
              {logo ? (
                <img src={logo} alt="Sidebar Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs">No Logo</span>
              )}
            </div>
            <input
              type="file"
              accept="image/png"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Upload a PNG image with a transparent background.</p>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
          {Object.entries(colors).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 capitalize">{key} Color</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key as keyof typeof colors, e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 p-1 cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
import React, { useMemo } from 'react';
import { trpc } from '@/lib/trpc';

interface BrandThemeProviderProps {
  selectedBrand?: string;
}

// Helper functions for color accessibility
function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function getContrastRatio(hex: string) {
  const rgb = hexToRgb(hex);
  const lum = getLuminance(rgb.r, rgb.g, rgb.b);
  const lumWhite = getLuminance(255, 255, 255);
  return (lumWhite + 0.05) / (lum + 0.05);
}

export default function BrandThemeProvider({ selectedBrand = 'All Brands' }: BrandThemeProviderProps) {
  const { data: brandColors = {} } = trpc.brandColors.getAll.useQuery();

  const styles = useMemo(() => {
    let primaryHex = '#f58524'; // default HFS orange
    let secondaryHex = '#f58524'; // default to primary
    let isDefault = true;

    if (selectedBrand && selectedBrand !== 'All Brands') {
      const config = Object.values(brandColors).find(c => c.brand === selectedBrand);
      if (config && config.backgroundColor) {
        primaryHex = config.backgroundColor;
        secondaryHex = config.secondaryColor || config.backgroundColor;
        isDefault = false;
      }
    }
    
    // Check if the primary color meets WCAG AA (4.5:1) against white background
    const contrast = getContrastRatio(primaryHex);
    const needsDarkening = contrast < 4.5;

    const utilityOverrides = `
      /* Force Tailwind utility classes to use these dynamic variables in case they compiled statically */
      .text-blue-400, .hover\\:text-blue-400:hover { color: var(--color-blue-400) !important; }
      .text-blue-500, .hover\\:text-blue-500:hover { color: var(--color-blue-500) !important; }
      .text-blue-600, .hover\\:text-blue-600:hover, .group-hover\\:text-blue-600:hover { color: var(--color-blue-600) !important; }
      .text-blue-700, .hover\\:text-blue-700:hover { color: var(--color-blue-700) !important; }
      .text-blue-900, .hover\\:text-blue-900:hover { color: var(--color-blue-900) !important; }
      
      .bg-blue-50, .hover\\:bg-blue-50:hover, .group-hover\\:bg-blue-50:hover { background-color: var(--color-blue-50) !important; }
      .bg-blue-100, .hover\\:bg-blue-100:hover { background-color: var(--color-blue-100) !important; }
      .bg-blue-500, .hover\\:bg-blue-500:hover { background-color: var(--color-blue-500) !important; }
      .bg-blue-600, .hover\\:bg-blue-600:hover { background-color: var(--color-blue-600) !important; }
      .bg-blue-700, .hover\\:bg-blue-700:hover { background-color: var(--color-blue-700) !important; }
      
      .border-blue-100 { border-color: var(--color-blue-100) !important; }
      .border-blue-200 { border-color: var(--color-blue-200) !important; }
      .border-blue-400 { border-color: var(--color-blue-400) !important; }
      .border-blue-500 { border-color: var(--color-blue-500) !important; }
      .border-blue-600 { border-color: var(--color-blue-600) !important; }
      
      .ring-blue-400, .focus\\:ring-blue-400:focus { --tw-ring-color: var(--color-blue-400) !important; }
      .ring-blue-500, .focus\\:ring-blue-500:focus { --tw-ring-color: var(--color-blue-500) !important; }
      
      .shadow-blue-500\\/10 { box-shadow: 0 4px 6px -1px color-mix(in srgb, var(--color-blue-500) 10%, transparent), 0 2px 4px -2px color-mix(in srgb, var(--color-blue-500) 10%, transparent) !important; }
      .shadow-blue-500\\/20 { box-shadow: 0 4px 6px -1px color-mix(in srgb, var(--color-blue-500) 20%, transparent), 0 2px 4px -2px color-mix(in srgb, var(--color-blue-500) 20%, transparent) !important; }
    `;

    // Default HFS palette (exactly matching index.css)
    if (isDefault) {
      return `
        :root, body, #root {
          --primary: #f58524 !important;
          --sidebar-primary: #f58524 !important;
          --orange: #f58524 !important;
          --primary-dark: #f07111 !important;
          
          --color-blue-50: #fdf2e9 !important;
          --color-blue-100: #fbcea8 !important;
          --color-blue-200: #ffd0a8 !important;
          --color-blue-300: #fbcea8 !important;
          --color-blue-400: #f58524 !important;
          --color-blue-500: #f58524 !important;
          --color-blue-600: #f58524 !important;
          --color-blue-700: #f07111 !important;
          --color-blue-800: #d95d00 !important;
          --color-blue-900: #9c4100 !important;
          
          --brand-secondary: #f58524 !important;
          --chart-1: #f58524 !important;
          --chart-2: #71b6b8 !important;
          --chart-3: #f07111 !important;
          --chart-4: #fbcea8 !important;
          --chart-5: #2053a3 !important;
        }
        ${utilityOverrides}
      `;
    }

    // Dynamic brand palette using color-mix
    return `
      :root, body, #root {
        --brand-base: ${primaryHex} !important;
        --brand-secondary: ${secondaryHex} !important;
        
        --primary: var(--brand-base) !important;
        --sidebar-primary: var(--brand-base) !important;
        --orange: var(--brand-base) !important;
        --primary-dark: color-mix(in srgb, var(--brand-base) 80%, black) !important;
        
        /* Blue mapped variations */
        --color-blue-50: color-mix(in srgb, var(--brand-base) 10%, white) !important;
        --color-blue-100: color-mix(in srgb, var(--brand-base) 30%, white) !important;
        --color-blue-200: color-mix(in srgb, var(--brand-base) 45%, white) !important;
        --color-blue-300: color-mix(in srgb, var(--brand-base) 60%, white) !important;
        --color-blue-400: var(--brand-base) !important;
        --color-blue-500: var(--brand-base) !important;
        --color-blue-600: ${needsDarkening ? 'color-mix(in srgb, var(--brand-base) 60%, black)' : 'var(--brand-base)'} !important;
        --color-blue-700: ${needsDarkening ? 'color-mix(in srgb, var(--brand-base) 45%, black)' : 'color-mix(in srgb, var(--brand-base) 80%, black)'} !important;
        --color-blue-800: ${needsDarkening ? 'color-mix(in srgb, var(--brand-base) 30%, black)' : 'color-mix(in srgb, var(--brand-base) 60%, black)'} !important;
        --color-blue-900: ${needsDarkening ? 'color-mix(in srgb, var(--brand-base) 15%, black)' : 'color-mix(in srgb, var(--brand-base) 40%, black)'} !important;
        
        /* High Contrast Chart Palette based on Secondary Color */
        --chart-1: var(--brand-secondary) !important;
        --chart-2: color-mix(in srgb, var(--brand-secondary) 60%, white) !important; 
        --chart-3: color-mix(in srgb, var(--brand-secondary) 40%, black) !important;
        --chart-4: color-mix(in srgb, var(--brand-secondary) 20%, white) !important;
        --chart-5: color-mix(in srgb, var(--brand-secondary) 70%, black) !important;
      }
      ${utilityOverrides}
    `;
  }, [selectedBrand, brandColors]);

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}

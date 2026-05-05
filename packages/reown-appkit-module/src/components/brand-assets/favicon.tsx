"use client";

import React from 'react';
import Head from 'next/head';

interface FaviconProps {
  variant?: 'default' | 'casino-chip' | 'tokenizin-head';
}

export function Favicon({ variant = 'casino-chip' }: FaviconProps) {
  const getFaviconData = () => {
    switch (variant) {
      case 'casino-chip':
        // Casino chip favicon - gold and silver metallic design
        return {
          href: '/favicon-casino-chip.ico',
          appleTouchIcon: '/apple-touch-icon-casino-chip.png',
          manifest: '/site.webmanifest',
        };
      case 'tokenizin-head':
        return {
          href: '/favicon-tiger.ico',
          appleTouchIcon: '/apple-touch-icon-tiger.png',
          manifest: '/site.webmanifest',
        };
      default:
        return {
          href: '/favicon.ico',
          appleTouchIcon: '/apple-touch-icon.png',
          manifest: '/site.webmanifest',
        };
    }
  };

  const faviconData = getFaviconData();

  return (
    <Head>
      <link rel="icon" href={faviconData.href} />
      <link rel="apple-touch-icon" href={faviconData.appleTouchIcon} />
      <link rel="manifest" href={faviconData.manifest} />
      <meta name="theme-color" content="#D2691E" />
    </Head>
  );
}

// Casino chip favicon as SVG data URL
export const CASINO_CHIP_FAVICON_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF8C00;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E5E4E2;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#C0C0C0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A8A8A8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Outer ring -->
  <circle cx="16" cy="16" r="15" fill="url(#goldGradient)" stroke="#B8860B" stroke-width="1"/>
  
  <!-- Inner pattern dots -->
  <circle cx="16" cy="8" r="1" fill="#B8860B" opacity="0.6"/>
  <circle cx="16" cy="24" r="1" fill="#B8860B" opacity="0.6"/>
  <circle cx="8" cy="16" r="1" fill="#B8860B" opacity="0.6"/>
  <circle cx="24" cy="16" r="1" fill="#B8860B" opacity="0.6"/>
  
  <!-- Center design - stylized T -->
  <rect x="14" y="10" width="4" height="8" fill="url(#silverGradient)" rx="1"/>
  <rect x="10" y="16" width="12" height="4" fill="url(#silverGradient)" rx="1"/>
  
  <!-- Shine effect -->
  <circle cx="16" cy="16" r="15" fill="none" stroke="url(#goldGradient)" stroke-width="0.5" opacity="0.3"/>
</svg>
`)}`;

// Tiger head favicon as SVG data URL
export const TIGER_HEAD_FAVICON_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tigerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF8C00;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FF6347;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF4500;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Tiger head outline -->
  <circle cx="16" cy="16" r="14" fill="url(#tigerGradient)" stroke="#8B4513" stroke-width="1"/>
  
  <!-- Tiger stripes -->
  <path d="M8 12 Q12 10 16 12 Q20 10 24 12" stroke="#000" stroke-width="1.5" fill="none"/>
  <path d="M8 16 Q12 14 16 16 Q20 14 24 16" stroke="#000" stroke-width="1.5" fill="none"/>
  <path d="M8 20 Q12 18 16 20 Q20 18 24 20" stroke="#000" stroke-width="1.5" fill="none"/>
  
  <!-- Eyes -->
  <circle cx="12" cy="14" r="2" fill="#FFD700"/>
  <circle cx="20" cy="14" r="2" fill="#FFD700"/>
  <circle cx="12" cy="14" r="1" fill="#000"/>
  <circle cx="20" cy="14" r="1" fill="#000"/>
  
  <!-- Nose -->
  <ellipse cx="16" cy="18" rx="1" ry="0.8" fill="#000"/>
</svg>
`)}`;

// Generate favicon files
export function generateFaviconFiles() {
  return {
    'favicon-casino-chip.ico': CASINO_CHIP_FAVICON_SVG,
    'favicon-tiger.ico': TIGER_HEAD_FAVICON_SVG,
    'apple-touch-icon-casino-chip.png': CASINO_CHIP_FAVICON_SVG,
    'apple-touch-icon-tiger.png': TIGER_HEAD_FAVICON_SVG,
  };
}

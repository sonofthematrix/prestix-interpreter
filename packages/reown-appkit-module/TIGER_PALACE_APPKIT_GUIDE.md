# Tokenizin AppKit Extension - Complete Guide

## 🎨 Overview

This package provides a fully customized AppKit extension for Tokenizin marketplace with:

- **Tokenizin Branding** - Custom dark theme with golden orange accents (#F59E0B)
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Luxury Marketplace Aesthetic** - Premium UI components matching Tokenizin design
- **Dark Theme** - Deep forest green backgrounds (#0A3A2A) with golden highlights

## 📦 Package Structure

```
packages/reown-appkit-module/
├── src/
│   ├── config/
│   │   └── index.ts                    # Main AppKit configuration
│   ├── theme/
│   │   └── tokenizin-palace-theme.ts      # Theme configuration
│   ├── styles/
│   │   └── tokenizin-appkit.css           # Custom CSS overrides
│   ├── components/
│   │   └── TigerPalaceAppKit.tsx      # Branded wrapper components
│   └── context/
│       └── index.tsx                   # React context providers
├── package.json                        # Package configuration
├── README.md                           # Package documentation
└── BUILD_INSTRUCTIONS.md               # Build guide
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { useAppKit } from '@TKNZN/reown-appkit-module'

function ConnectButton() {
  const { open } = useAppKit()
  
  return (
    <button onClick={() => open()}>
      Connect Wallet
    </button>
  )
}
```

### Using Branded Components

```tsx
import { TigerPalaceAppKit } from '@TKNZN/reown-appkit-module'

function WalletSection() {
  return (
    <TigerPalaceAppKit>
      <appkit-button />
    </TigerPalaceAppKit>
  )
}
```

## 🎨 Brand Colors

### Primary Colors
- **Tiger Orange**: `#F59E0B` - Primary accent color
- **Golden Amber**: `#E6B800` - Secondary accent
- **Deep Forest Green**: `#0A3A2A` - Background
- **Dark Forest**: `#1C3A36` - Card backgrounds

### Text Colors
- **Primary Text**: `#F8F5F0` - Soft cream
- **Secondary Text**: `#E6D8B8` - Warm gold
- **Tertiary Text**: `#B8A898` - Muted cream

## 📱 Responsive Breakpoints

- **Mobile**: `max-width: 768px`
- **Tablet**: `769px - 1024px`
- **Desktop**: `min-width: 1025px`

## 🧩 Components

### TigerPalaceAppKit

Wrapper component that applies Tokenizin branding to all AppKit components.

```tsx
import { TigerPalaceAppKit } from '@TKNZN/reown-appkit-module'

<TigerPalaceAppKit>
  <appkit-button />
  <appkit-account-button />
  <appkit-network-button />
</TigerPalaceAppKit>
```

### TigerPalaceConnectButton

Pre-styled connect wallet button.

```tsx
import { TigerPalaceConnectButton } from '@TKNZN/reown-appkit-module'

<TigerPalaceConnectButton />
```

### TigerPalaceAccountButton

Pre-styled account button.

```tsx
import { TigerPalaceAccountButton } from '@TKNZN/reown-appkit-module'

<TigerPalaceAccountButton />
```

### TigerPalaceNetworkButton

Pre-styled network button.

```tsx
import { TigerPalaceNetworkButton } from '@TKNZN/reown-appkit-module'

<TigerPalaceNetworkButton />
```

## 🎯 Theme Configuration

The theme is automatically applied when AppKit is initialized. All theme variables are set in `tokenizin-palace-theme.ts`:

```typescript
{
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#F59E0B',
    '--w3m-color-mix': '#0A3A2A',
    '--w3m-background': '#1C3A36',
    '--w3m-color-fg': '#F8F5F0',
    '--w3m-border-radius-master': '12px',
    // ... more variables
  }
}
```

## 🎨 Custom Styling

Custom CSS is automatically imported in `src/app/layout.tsx`. The styles include:

- Custom modal styling with Tokenizin colors
- Responsive breakpoints
- Luxury marketplace aesthetic
- Smooth animations
- Accessibility enhancements

## 🔧 Customization

### Changing Brand Colors

Edit `packages/reown-appkit-module/src/theme/tokenizin-palace-theme.ts`:

```typescript
export const tigerPalaceTheme = {
  themeVariables: {
    '--w3m-accent': '#YOUR_COLOR', // Change primary color
  }
}
```

### Modifying Styles

Edit `packages/reown-appkit-module/src/styles/tokenizin-appkit.css`:

```css
appkit-button::part(button) {
  background: /* your custom style */;
}
```

## ✅ Testing Checklist

After implementation, verify:

- [ ] Modal opens with dark forest green background
- [ ] Buttons have golden orange gradient
- [ ] Text is cream-colored (#F8F5F0)
- [ ] Borders are subtle golden (#F59E0B with opacity)
- [ ] Responsive on mobile (< 768px)
- [ ] Responsive on tablet (768px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] Hover states work correctly
- [ ] Focus states visible for accessibility
- [ ] Animations are smooth
- [ ] No console errors

## 🐛 Troubleshooting

### Styles Not Applying

1. Verify CSS is imported in `src/app/layout.tsx`
2. Check browser console for CSS errors
3. Verify CSS selectors match AppKit web components
4. Clear browser cache

### Components Not Found

1. Verify TypeScript path mappings in `tsconfig.json`
2. Check `package.json` exports
3. Restart TypeScript server
4. Clear Next.js cache: `rm -rf .next`

### Theme Not Applied

1. Verify `tigerPalaceTheme` is imported correctly
2. Check `createAppKit()` configuration
3. Verify theme variables in browser DevTools
4. Check for CSS variable conflicts

## 📚 Integration Points

1. **Provider Setup**: `src/context/wallet-provider.tsx`
2. **Layout Integration**: `src/app/layout.tsx` (CSS import)
3. **Component Usage**: Throughout the application
4. **Theme Configuration**: `packages/reown-appkit-module/src/config/index.ts`

## 🚢 Deployment

The package is automatically included in production builds. No additional deployment steps required.

## 📝 Version History

- **v1.0.0** - Initial Tokenizin branded AppKit extension
  - Custom dark theme
  - Responsive design
  - Branded components
  - Custom CSS overrides


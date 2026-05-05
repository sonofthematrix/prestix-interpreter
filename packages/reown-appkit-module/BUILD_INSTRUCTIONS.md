# Tokenizin AppKit Extension - Build Instructions

## Overview

This package provides a custom-branded AppKit extension for Tokenizin with:
- Custom dark theme with Tokenizin branding
- Responsive design (mobile/tablet/desktop)
- Luxury marketplace aesthetic
- Golden orange accents (#F59E0B)

## Build Process

### 1. Development Build

The package is automatically built as part of the Next.js application. No separate build step is required for development.

```bash
# From project root
bun run dev
```

### 2. Production Build

The package is included in the main application build:

```bash
# From project root
bun run build
```

### 3. Verify Build

After building, verify that:
1. CSS files are included in the build output
2. TypeScript types are correctly exported
3. Components are accessible via imports

## File Structure

```
packages/reown-appkit-module/
├── src/
│   ├── config/
│   │   └── index.ts              # Main AppKit config (exports modal, hooks)
│   ├── theme/
│   │   └── tokenizin-palace-theme.ts # Theme configuration
│   ├── styles/
│   │   └── tokenizin-appkit.css      # Custom CSS overrides
│   ├── components/
│   │   └── TigerPalaceAppKit.tsx # Branded wrapper components
│   └── context/
│       └── index.tsx             # React context providers
├── package.json                   # Package configuration
├── README.md                      # Package documentation
└── BUILD_INSTRUCTIONS.md          # This file
```

## Integration Points

### 1. Layout Integration

The CSS is imported in `src/app/layout.tsx`:

```tsx
<link rel="stylesheet" href="/packages/reown-appkit-module/src/styles/tokenizin-appkit.css" />
```

### 2. Component Usage

Components are imported and used throughout the app:

```tsx
import { TigerPalaceAppKit } from '@TKNZN/reown-appkit-module/components'
```

### 3. Theme Configuration

Theme is applied in `packages/reown-appkit-module/src/config/index.ts`:

```tsx
import { tigerPalaceTheme } from '../theme/tokenizin-palace-theme'
// Applied to createAppKit() configuration
```

## Customization

### Changing Brand Colors

Edit `packages/reown-appkit-module/src/theme/tokenizin-palace-theme.ts`:

```typescript
export const tigerPalaceTheme = {
  themeVariables: {
    '--w3m-accent': '#F59E0B', // Change primary color
    // ... other variables
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

### Adding Components

Create new components in `packages/reown-appkit-module/src/components/` and export from `TigerPalaceAppKit.tsx`.

## Testing

### Local Testing

1. Start development server: `bun run dev`
2. Navigate to `/auth/signin`
3. Click "Connect Wallet" button
4. Verify modal appears with Tokenizin branding

### Visual Verification Checklist

- [ ] Modal has dark forest green background
- [ ] Buttons have golden orange gradient
- [ ] Text is cream-colored (#F8F5F0)
- [ ] Borders are subtle golden (#F59E0B with opacity)
- [ ] Responsive on mobile (< 768px)
- [ ] Responsive on tablet (768px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] Hover states work correctly
- [ ] Focus states are visible for accessibility

## Troubleshooting

### Styles Not Applying

1. Verify CSS file is imported in `layout.tsx`
2. Check browser console for CSS loading errors
3. Verify CSS selectors match AppKit web components
4. Check for CSS specificity conflicts

### Components Not Found

1. Verify TypeScript path mappings in `tsconfig.json`
2. Check `package.json` exports configuration
3. Restart TypeScript server
4. Clear Next.js cache: `rm -rf .next`

### Theme Not Applied

1. Verify `tigerPalaceTheme` is imported correctly
2. Check `createAppKit()` configuration
3. Verify theme variables are set in CSS
4. Check browser DevTools for CSS variable values

## Deployment

The package is automatically included in production builds. No additional deployment steps are required.

## Version History

- **v1.0.0** - Initial Tokenizin branded AppKit extension
  - Custom dark theme
  - Responsive design
  - Branded components
  - Custom CSS overrides


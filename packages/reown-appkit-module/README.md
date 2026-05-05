# @TKNZN/Reown AppKit Module

A comprehensive React/Next.js module that integrates Reown AppKit for Web3 wallet connectivity with Tokenizin theming and components.

## 🚀 Features

- **Wallet Integration**: Full Reown AppKit integration with multiple wallet support
- **Tiger Theme**: Complete Tokenizin branding and styling
- **Navigation Components**: Header, sidebar, and navigation system
- **Layout System**: Responsive layouts for dashboard, auth, and landing pages
- **UI Components**: Complete shadcn/ui component library with custom theming
- **Authentication**: NextAuth.js integration with session management
- **TypeScript**: Full TypeScript support with proper type definitions

## 📦 Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Build the package
bun run build
```

## ⚙️ Environment Configuration

Create a `.env.local` file with the following variables:

```env
# Reown AppKit Configuration
NEXT_PUBLIC_REOWN_PROJECT_ID=122878b95737e1300958ec73a8c0b61a

# Next.js Configuration
NEXT_PUBLIC_HOST=localhost

# Authentication (if needed)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Database (if using external database)
DATABASE_URL=your-database-url-here

# Note: Session and audit models are optional
# The application works with NextAuth cookie sessions even without database models
```

## 🏃‍♂️ Development

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

## 📁 Package Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   ├── auth/              # Authentication pages
│   └── loading.tsx        # Loading UI
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── navigation/        # Navigation components
│   ├── layouts/           # Layout components
│   ├── auth/              # Authentication components
│   └── common/            # Shared components
├── styles/                # CSS stylesheets
│   ├── globals.css        # Global styles
│   ├── tokenizin-theme.css    # Tiger theme
│   └── tokenizin-appkit.css   # AppKit customizations
├── context/               # React contexts
├── lib/                   # Utilities and libraries
├── hooks/                 # Custom React hooks
└── stores/                # Zustand stores
```

## 🎨 Components

### Navigation
- `AppHeader` - Main application header
- `AppSidebar` - Collapsible sidebar navigation
- `BreadcrumbNav` - Breadcrumb navigation
- `MainNavigation` - Navigation logic and configuration

### Layouts
- `AppLayout` - Main application layout
- `DashboardLayout` - Dashboard-specific layout
- `AuthLayout` - Authentication pages layout
- `DocsLayout` - Documentation pages layout
- `LandingLayout` - Landing page layout

### UI Components
Complete shadcn/ui component library with Tokenizin theming:
- Buttons, Cards, Dialogs, Forms
- Tables, Tabs, Toast notifications
- Loading spinners, Progress indicators
- And many more...

## 🔧 Configuration

### Next.js Config
The package includes a comprehensive `next.config.js` with:
- Webpack customizations for AppKit integration
- Path aliases for clean imports
- Stub handling for missing artifacts
- Build optimizations

### TypeScript Config
Full TypeScript configuration with:
- Strict type checking
- Path aliases for clean imports
- Custom type definitions

### Tailwind Config
Custom Tailwind configuration with:
- Tokenizin color scheme
- Custom component variants
- Responsive breakpoints
- Dark mode support

## 🎯 Usage

### Basic Setup

```tsx
import { AppKitProvider } from '@TKNZN/reown-appkit-module/context';
import { ClientThemeProvider } from '@TKNZN/reown-appkit-module/components';
import { AppLayout } from '@TKNZN/reown-appkit-module/components/layouts';

export default function App({ children }) {
  return (
    <AppKitProvider>
      <ClientThemeProvider>
        <AppLayout>
          {children}
        </AppLayout>
      </ClientThemeProvider>
    </AppKitProvider>
  );
}
```

### Using Components

```tsx
import { AppHeader, AppSidebar } from '@TKNZN/reown-appkit-module/components/navigation';
import { TigerWalletButton } from '@TKNZN/reown-appkit-module/components/navigation';

export default function Dashboard() {
  return (
    <div>
      <AppHeader />
      <AppSidebar />
      <main>
        <TigerWalletButton />
        {/* Your content */}
      </main>
    </div>
  );
}
```

## 🎨 Theming

### Tokenizin Colors

```css
/* Primary Colors */
--primary: hsl(24, 100%, 50%);      /* Orange */
--accent: hsl(0, 100%, 50%);        /* Red */

/* Backgrounds */
--background: hsl(0, 0%, 100%);     /* White */
--muted: hsl(0, 0%, 96%);           /* Light gray */

/* Text */
--foreground: hsl(0, 0%, 9%);       /* Dark */
--muted-foreground: hsl(0, 0%, 45%); /* Medium gray */
```

### Dark Mode Support

The theme automatically supports dark mode with CSS custom properties:

```css
@media (prefers-color-scheme: dark) {
  --background: hsl(0, 0%, 9%);
  --foreground: hsl(0, 0%, 98%);
  --muted: hsl(0, 0%, 15%);
}
```

## 🔐 Authentication

Built-in NextAuth.js integration with session management:

```tsx
import { useSession } from 'next-auth/react';
import { AuthProvider } from '@TKNZN/reown-appkit-module/components';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
```

### Session Management

The module supports flexible session management:
- **Cookie-based sessions**: NextAuth.js handles sessions via encrypted cookies (always available)
- **Database sessions**: Optional `session` or `walletSession` models for persistent storage
- **Graceful degradation**: Application works even if database session models don't exist

### Audit Logging

Audit logging is optional and gracefully degrades:
- **Database logging**: Uses `auditLog` and `userActivity` models if available
- **Console fallback**: Logs to console if database models are missing
- **Non-blocking**: Authentication and core features work without audit models

## 📱 Responsive Design

All components are fully responsive with mobile-first design:
- Mobile navigation with hamburger menu
- Responsive grid layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## 🔌 Wallet Connection

### Desktop Browser Support

**MetaMask Browser Extension** is fully supported and prioritized on desktop browsers:

- **Enhanced Mobile Detection**: Desktop browsers (screen width >= 768px) are correctly identified
- **Injected Provider Priority**: MetaMask extension appears as the FIRST wallet option on desktop
- **WalletConnect Alternative**: WalletConnect available as fallback for QR code connections
- **Touchscreen Laptop Support**: Devices with large screens are treated as desktop

### Mobile Browser Support

**WalletConnect** is prioritized on mobile browsers:

- **Mobile Wallet Apps**: Connect via QR code or deep link to mobile wallet apps
- **iOS Safari Support**: Full WalletConnect integration for iOS devices
- **Android Support**: Works on Chrome, Edge, and other mobile browsers
- **MetaMask Mobile**: Can connect via WalletConnect protocol

### Testing Wallet Detection

Use the included test page to verify mobile detection:

```bash
# Open test page in browser
open packages/reown-appkit-module/test-mobile-detection.html
```

The test page shows:
- Device type detection (mobile vs desktop)
- Screen size and touch support
- Connector priority order
- MetaMask extension detection
- Expected AppKit behavior

### Connector Priority

**Desktop Browsers (>= 768px):**
1. 🥇 Injected (MetaMask Extension)
2. 🥈 WalletConnect (QR code)
3. 🥉 EIP6963 (Modern wallets)

**Mobile Browsers (< 768px):**
1. 🥇 WalletConnect (Mobile wallet apps)
2. 🥈 Injected (If available)
3. 🥉 EIP6963 (Modern wallets)

For detailed information, see [DESKTOP_METAMASK_FIX.md](./DESKTOP_METAMASK_FIX.md).

## 🗄️ Database Schema

### Required Models
- `User` - User accounts and authentication

### Optional Models
The following models are optional and the application gracefully handles their absence:

- **`session` / `walletSession`**: Session storage
  - If missing: NextAuth cookie-based sessions work independently
  - Benefits: Persistent session tracking across devices
  
- **`auditLog`**: Audit trail logging
  - If missing: Logs fall back to console output
  - Benefits: Compliance and security auditing
  
- **`userActivity`**: User activity tracking
  - If missing: Activity logging skipped
  - Benefits: Analytics and user behavior tracking

### Graceful Degradation Pattern

The codebase implements graceful degradation for optional models:

```typescript
// Example: Checking for optional models before use
const db = await createClient(systemUser);
const hasAuditLog = typeof db.auditLog !== 'undefined' && typeof db.auditLog.create === 'function';

if (hasAuditLog) {
  await db.auditLog.create({ data: { ... } });
} else {
  console.warn('⚠️ Audit model not found - using console logging');
}
```

This ensures:
- ✅ Application works during schema migrations
- ✅ No breaking changes when models are added/removed
- ✅ Clear warnings when optional features are unavailable
- ✅ Core functionality always works

## 🧪 Testing

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run e2e tests
bun run test:e2e
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if necessary
5. Submit a pull request

## 📞 Support

For support and questions:
- GitHub Issues
- Discord community
- Documentation wiki
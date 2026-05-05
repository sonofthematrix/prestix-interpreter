import { createContext, useContext, useState } from 'react';

interface WagmiProviderReadyContextType {
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
}

export const WagmiProviderReadyContext = createContext<WagmiProviderReadyContextType | null>(null);

export function useWagmiProviderReady() {
  const context = useContext(WagmiProviderReadyContext);
  // Return safe default instead of throwing - allows components to check readiness gracefully
  if (!context) {
    return { isReady: false, setIsReady: () => {} };
  }
  return context;
}

interface WagmiProviderReadyProviderProps {
  children: React.ReactNode;
}

export function WagmiProviderReadyProvider({ children }: WagmiProviderReadyProviderProps) {
  const [isReady, setIsReady] = useState(false);

  return (
    <WagmiProviderReadyContext.Provider value={{ isReady, setIsReady }}>
      {children}
    </WagmiProviderReadyContext.Provider>
  );
}

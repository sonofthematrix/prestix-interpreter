/**
 * AppKit Controllers Shim
 * 
 * This shim provides a minimal implementation of @reown/appkit-controllers
 * to resolve build errors when @reown/appkit-pay and other AppKit packages try to import it.
 * 
 * The shim exports empty/no-op implementations since AppKit Pay functionality
 * may not be fully utilized in this application.
 */

// Re-export common utilities that might be needed
export const ConstantsUtil = {
  W3M_API_URL: process.env.NEXT_PUBLIC_W3M_API_URL || 'https://api.web3modal.org',
} as any;

// Helper function to create a no-op controller
const createNoOpController = (defaultState: any = {}) => ({
  state: defaultState,
  ...Object.fromEntries(
    ['get', 'set', 'subscribe', 'emit', 'on', 'off', 'reset', 'destroy'].map((method) => [
      method,
      () => {},
    ])
  ),
});

// Controller implementations that @reown/appkit-pay expects
export const EventsController = createNoOpController();

export const ModalController = createNoOpController({ open: false });

export const SnackController = createNoOpController({ message: '', variant: 'default' });

export const ChainController = createNoOpController({ activeChain: null });

export const ConnectorController = createNoOpController({ connectors: [] });

export const ConnectionController = createNoOpController({ address: null });

export const RouterController = createNoOpController({ view: 'Account' });

export const AssetController = createNoOpController({ assets: [] });

export const ProviderController = createNoOpController({ provider: null });

export const ApiController = createNoOpController({});

export const SwapController = createNoOpController({});

export const OnRampController = createNoOpController({});

export const ExchangeController = createNoOpController({});

export const TransactionsController = createNoOpController({ transactions: [] });

export const AlertController = createNoOpController({ alerts: [] });

export const WalletUtil = {
  getWalletName: () => '',
  getWalletIcon: () => '',
} as any;

export const SendController = createNoOpController({});

export const ConnectionControllerUtil = {
  connect: async () => {},
  disconnect: async () => {},
} as any;

export class AppKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppKitError';
  }
}

export const ConnectorUtil = {
  getConnector: () => null,
  getConnectorName: () => '',
} as any;

export const OptionsController = {
  getSnapshot: () => ({
    projectId: process.env.NEXT_PUBLIC_W3M_PROJECT_ID || '',
    sdkType: 'appkit',
    sdkVersion: '1.0.0',
  }),
} as any;

export const OptionsStateController = createNoOpController({});

export const AdapterController = createNoOpController({ adapters: [] });

export const TooltipController = createNoOpController({ tooltips: [] });

export const EnsController = createNoOpController({});

export const MobileWalletUtil = {
  isMobileWallet: () => false,
  getMobileWalletUrl: () => '',
} as any;

export const NetworkUtil = {
  getNetworkName: () => '',
  getNetworkIcon: () => '',
} as any;

export const WcHelpersUtil = {
  getWalletName: () => '',
  getWalletIcon: () => '',
  formatAddress: (address: string) => address,
} as any;

export const baseUSDC = null as any;
export const baseSepoliaUSDC = null as any;

export const BlockchainApiController = createNoOpController({});

export const PublicStateController = createNoOpController({});

// Utility exports
export const AssetUtil = {
  formatAmount: (amount: string | number) => String(amount),
} as any;

export const CoreHelperUtil = {
  parseChainId: (chainId: string | number) => String(chainId),
  getChainId: () => null,
} as any;

export const FetchUtil = {
  get: async () => ({}),
  post: async () => ({}),
  put: async () => ({}),
  delete: async () => ({}),
} as any;

export const getNativeTokenAddress = () => null;

export const getPreferredAccountType = () => 'eoa';

export const getActiveCaipNetwork = () => null;

export const AdapterBlueprint = {
  connect: async () => {},
  disconnect: async () => {},
  getAccount: async () => null,
  getChainId: async () => null,
  getBalance: async () => null,
} as any;

export const WalletConnectConnector = {} as any;

export const ModalUtil = {
  open: () => {},
  close: () => {},
} as any;

export const ThemeController = createNoOpController({ themeMode: 'dark' });

export const SIWXUtil = {
  getNonce: async () => '',
  verifyMessage: async () => false,
} as any;

export const StorageUtil = {
  get: () => null,
  set: () => {},
  remove: () => {},
} as any;

// Empty implementations for other controllers
export const ReownAuthentication = {} as any;
export const ReownConnector = {} as any;
export const ReownNetwork = {} as any;

// Default export
export default {
  ConstantsUtil,
  EventsController,
  ModalController,
  SnackController,
  ChainController,
  ConnectorController,
  ConnectionController,
  RouterController,
  AssetController,
  ProviderController,
  ApiController,
  SwapController,
  OnRampController,
  ExchangeController,
  TransactionsController,
  AlertController,
  WalletUtil,
  SendController,
  ConnectionControllerUtil,
  AppKitError,
  ConnectorUtil,
  OptionsController,
  OptionsStateController,
  AdapterController,
  TooltipController,
  EnsController,
  MobileWalletUtil,
  NetworkUtil,
  WcHelpersUtil,
  baseUSDC,
  baseSepoliaUSDC,
  BlockchainApiController,
  PublicStateController,
  AdapterBlueprint,
  WalletConnectConnector,
  getActiveCaipNetwork,
  AssetUtil,
  CoreHelperUtil,
  FetchUtil,
  getNativeTokenAddress,
  getPreferredAccountType,
  ModalUtil,
  ThemeController,
  SIWXUtil,
  StorageUtil,
  ReownAuthentication,
  ReownConnector,
  ReownNetwork,
};

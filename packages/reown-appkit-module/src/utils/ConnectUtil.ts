import type { ChainNamespace } from '@reown/appkit-common'

// AssetUtil methods not implemented - using stubs
// import { AssetUtil } from './AssetUtil'

// Stub AssetUtil object with placeholder methods
const AssetUtil = {
  getChainNamespaceImageUrl: (chain: ChainNamespace): string => {
    // TODO: Implement chain namespace image URL logic
    return '';
  },
  getAssetImageUrl: (imageId?: string): string => {
    // TODO: Implement asset image URL logic
    return imageId || '';
  },
  getWalletImageUrl: (imageId?: string): string => {
    // TODO: Implement wallet image URL logic
    return imageId || '';
  }
};
import { ConnectorUtil } from './ConnectorUtil'
import type { ConnectorItemWithKind, ConnectorWithProviders, WcWallet } from './TypeUtil'
import { WalletUtil } from './WalletUtil'

// --- Types --------------------------------------------- //
export type WalletItem = {
  id: string
  name: string
  imageUrl: string
  connectors: {
    id: string
    rdns?: string
    chain: ChainNamespace
    chainImageUrl?: string
  }[]
  walletInfo: {
    description?: WcWallet['description']
    supportedChains?: WcWallet['chains']
    supportedNamespaces?: ChainNamespace[]
    website?: WcWallet['homepage']
    installationLinks?: {
      appStore?: WcWallet['app_store']
      playStore?: WcWallet['play_store']
      chromeStore?: WcWallet['chrome_store']
      desktopLink?: WcWallet['desktop_link']
    }
    deepLink?: WcWallet['mobile_link']
    isCertified?: boolean
  }
  isInjected: boolean
  isRecent: boolean
}

export const ConnectUtil = {
  /**
   * Maps the initial connect view wallets into WalletItems. Includes WalletConnect wallet and injected wallets. If user doesn't have any injected wallets, it'll fill the list with most ranked WalletConnect wallets.
   * @returns The WalletItems for the initial connect view.
   */
  getInitialWallets() {
    return ConnectorUtil.connectorList()
      .map(connector => {
        if (connector.kind === 'connector') {
          return this.mapConnectorToWalletItem(connector.connector, connector.subtype)
        } else if (connector.kind === 'wallet') {
          return this.mapWalletToWalletItem(connector.wallet)
        }

        return null
      })
      .filter(Boolean) as WalletItem[]
  },

  /**
   * Maps the WalletGuide explorer wallets to WalletItems including search results.
   * @returns The WalletItems for the WalletGuide explorer wallets.
   */
  getWalletConnectWallets(wcAllWallets: WcWallet[], wcSearchWallets: WcWallet[]) {
    if (wcSearchWallets.length > 0) {
      return wcSearchWallets.map(ConnectUtil.mapWalletToWalletItem)
    }

    return WalletUtil.getWalletConnectWallets(wcAllWallets).map(ConnectUtil.mapWalletToWalletItem)
  },

  /**
   * Maps the connector to a WalletItem.
   * @param connector - The connector to map to a WalletItem.
   * @param subType - The subtype of the connector.
   * @returns The WalletItem for the connector.
   */
  mapConnectorToWalletItem(
    connector: ConnectorWithProviders,
    subType: ConnectorItemWithKind['subtype']
  ): WalletItem {
    const hasMultipleConnectors = connector.connectors?.length
    const connectors = hasMultipleConnectors
      ? connector.connectors?.map(c => ({
          id: c.id,
          chain: c.chain,
          chainImageUrl: AssetUtil.getChainNamespaceImageUrl(c.chain)
        })) || []
      : [
          {
            id: connector.id,
            chain: connector.chain,
            chainImageUrl: AssetUtil.getChainNamespaceImageUrl(connector.chain)
          }
        ]

    return {
      id: connector.id,
      connectors: subType === 'walletConnect' ? [] : connectors,
      name: connector.name,
      imageUrl: connector.imageUrl || AssetUtil.getAssetImageUrl(connector.imageId),
      isInjected: subType !== 'walletConnect',
      isRecent: false,
      walletInfo: {}
    }
  },

  /**
   * Maps the WalletGuide explorer wallet to a WalletItem.
   * @param w - The WalletGuide explorer wallet.
   * @returns The WalletItem for the WalletGuide explorer wallet.
   */
  mapWalletToWalletItem(w: WcWallet): WalletItem {
    return {
      id: w.id,
      connectors: [],
      name: w.name,
      imageUrl: AssetUtil.getWalletImageUrl(w.image_id),
      isInjected: false,
      isRecent: false,
      walletInfo: {
        description: w.description,
        supportedChains: w.chains,
        website: w.homepage,
        installationLinks: {
          appStore: w.app_store,
          playStore: w.play_store,
          chromeStore: w.chrome_store,
          desktopLink: w.desktop_link
        },
        deepLink: w.mobile_link,
        isCertified: w.badge_type === 'certified'
      }
    }
  }
}

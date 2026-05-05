'use client'

import React from 'react'
import { Address } from 'viem'
import {
  useAppKitAccount,
  useAppKitEvents,
  useAppKitNetwork,
  useAppKitState,
  useAppKitTheme,
  useWalletInfo
} from '../config'
import { useTokenizinWalletStore } from '../store/tokenizinWalletStore' 
import { useClientMountStore } from '../store/clientMountStore'

export function InfoList() {
  const accountState = useAppKitAccount()
  const networkState = useAppKitNetwork()
  const themeState = useAppKitTheme()
  const appKitState = useAppKitState()
  const eventsState = useAppKitEvents()
  const walletState = useWalletInfo()
  const tokenizinWalletStore = useTokenizinWalletStore()

  return (
    <div className="code-container-wrapper">
      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(accountState, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(networkState, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
          <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(appKitState, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(eventsState, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(walletState, null, 2)}</pre>
        </div>
      </section>

      {/* TigerWallet Marketplace Information */}
      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Balances</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.balances, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Tokens (ERC20)</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.tokens, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Properties (ERC404)</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.properties, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Transactions</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.transactions, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Pending Transactions</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.pendingTransactions, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Network</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify(tokenizinWalletStore.network, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Loading State</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify({ isLoading: tokenizinWalletStore.loading.balances || tokenizinWalletStore.loading.tokens || tokenizinWalletStore.loading.properties || tokenizinWalletStore.loading.transactions }, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Error</h2>
        <div className="code-container-content">
            <pre>{JSON.stringify(tokenizinWalletStore.error ? { 
            message: tokenizinWalletStore.error,  
            name: tokenizinWalletStore.error,
            stack: tokenizinWalletStore.error 
          } : null, null, 2)}</pre>
        </div>
      </section>

      <section className="code-container">
        <h2 className="code-container-title">useTokenizinWalletStore - Full State</h2>
        <div className="code-container-content">
          <pre>{JSON.stringify({
            balances: tokenizinWalletStore.balances,
            tokensCount: tokenizinWalletStore.tokens.length,
            propertiesCount: tokenizinWalletStore.properties.length,
            transactionsCount: tokenizinWalletStore.transactions.length,
            pendingTransactionsCount: tokenizinWalletStore.pendingTransactions.length, 
            network: tokenizinWalletStore.network,
            isLoading: tokenizinWalletStore.loading.balances || tokenizinWalletStore.loading.tokens || tokenizinWalletStore.loading.properties || tokenizinWalletStore.loading.transactions,
            hasError: !!tokenizinWalletStore.error
          }, null, 2)}</pre>
        </div>
      </section>
    </div>
  )
}

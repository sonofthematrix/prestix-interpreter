//

import  { type CaipNetworkId, ConstantsUtil, NetworkUtil, type CaipNamespaces } from '@reown/appkit';
import  { SafeLocalStorage, SafeLocalStorageKeys } from '../../../src/utils/SafeLocalStorage';
import  type { SafeLocalStorageItems } from '../../../src/utils/SafeLocalStorage';
import { ApiController } from '../../../src/controllers/ApiController';
import { BlockchainApiController } from '../../../src/controllers/BlockchainApiController';
import { ChainController } from '../../../src/controllers/ChainController';
import { getActiveCaipNetwork } from '../../../src/utils/ChainControllerUtil';
import type { SIWXConfig, SIWXMessage, SIWXSession } from '../../../src/utils/SIWXUtil';
import { ReownAuthenticationMessenger } from './ReownAuthenticationMessenger';

/**
 * This is the configuration for using SIWX with Reown Authentication service.
 * It allows you to authenticate and capture user sessions through the Cloud Dashboard.
 */
export class ReownAuthentication implements SIWXConfig {
  private readonly localAuthStorageKey: keyof SafeLocalStorageItems
  private readonly localNonceStorageKey: keyof SafeLocalStorageItems
  private readonly messenger: ReownAuthenticationMessenger
  private required: boolean
  private otpUuid: string | null = null

  private listeners: ReownAuthentication.EventListeners = {
    sessionChanged: []
  }

  constructor(params: ReownAuthentication.ConstructorParams = {}) {
    this.localAuthStorageKey =
      (params.localAuthStorageKey as keyof SafeLocalStorageItems) ||
      SafeLocalStorageKeys.SIWX_AUTH_TOKEN
    this.localNonceStorageKey =
      (params.localNonceStorageKey as keyof SafeLocalStorageItems) ||
      SafeLocalStorageKeys.SIWX_NONCE_TOKEN
    this.required = params.required ?? true

    this.messenger = new ReownAuthenticationMessenger({
      getNonce: this.getNonce.bind(this)
    })
  }

  async createMessage(input: SIWXMessage.Input): Promise<SIWXMessage> {
    return this.messenger.createMessage(input)
  }

  async addSession(session: SIWXSession): Promise<void> {
    const response = await this.request({
      method: 'POST',
      key: 'authenticate',
      body: {
        data: session.data,
        message: session.message,
        signature: session.signature,
        clientId: this.getClientId(),
        walletInfo: this.getWalletInfo()
      },
      headers: ['nonce', 'otp']
    })

    // Debug: Check response structure
    const res = response as Record<string, unknown>
    console.log('🔍 [SIWX Auth] Authentication response:', {
      hasToken: res && 'token' in res,
      responseKeys: res ? Object.keys(res) : [],
      hasData: res && 'data' in res,
      dataKeys: res?.data && typeof res.data === 'object' && res.data !== null ? Object.keys(res.data as object) : []
    })

    // Accept token from multiple shapes (Reown Cloud, custom backends, nested payloads)
    const token =
      (res && typeof res === 'object' && typeof (res.token as string) === 'string' && (res.token as string)) ||
      (res && typeof res === 'object' && typeof (res.accessToken as string) === 'string' && (res.accessToken as string)) ||
      (res && typeof res === 'object' && typeof (res.access_token as string) === 'string' && (res.access_token as string)) ||
      (res?.data && typeof res.data === 'object' && (res.data as Record<string, unknown>)?.token && typeof ((res.data as Record<string, unknown>).token as string) === 'string' && ((res.data as Record<string, unknown>).token as string)) ||
      (res?.data && typeof res.data === 'object' && (res.data as Record<string, unknown>)?.accessToken && typeof ((res.data as Record<string, unknown>).accessToken as string) === 'string' && ((res.data as Record<string, unknown>).accessToken as string)) ||
      (res?.result && typeof res.result === 'object' && (res.result as Record<string, unknown>)?.token && typeof ((res.result as Record<string, unknown>).token as string) === 'string' && ((res.result as Record<string, unknown>).token as string))
    const tokenStr = typeof token === 'string' ? token.trim() : undefined
    if (tokenStr == null || tokenStr.length === 0) {
      const received = res ? JSON.stringify(res).slice(0, 200) : String(response)
      const backendError = res && typeof res === 'object' && typeof (res as Record<string, unknown>).error === 'string'
        ? (res as Record<string, unknown>).error as string
        : ''
      const w3mUrlSet = typeof process.env.NEXT_PUBLIC_W3M_API_URL === 'string' && process.env.NEXT_PUBLIC_W3M_API_URL.length > 0
      const hint = !w3mUrlSet
        ? ' Set NEXT_PUBLIC_W3M_API_URL to your app origin (e.g. https://prestix.vip or http://localhost:3000) so your /auth/v1/authenticate is used and returns { token: "<jwt>" }. Add your domain to Reown Dashboard → Project Domains.'
        : backendError
          ? ' Your backend may have returned an error (e.g. signature verification failed). Check server logs for [auth/v1/authenticate]. Add your domain to Reown Dashboard → Project Domains and ensure EIP-1271 fallback is enabled for embedded/social wallets.'
          : ' Ensure your auth backend returns { token: "<jwt>" } (or accessToken/access_token, or nested in data/result). Add your domain to Reown Dashboard → Project Domains.'
      console.error('❌ [SIWX Auth] Invalid authentication response - no token. Received:', received)
      throw new Error(
        `Authentication failed: Invalid response format. Expected token string. Ensure your auth backend returns { token: "<jwt>" }. ` +
        `Response keys: ${res ? Object.keys(res).join(', ') : 'none'}.${backendError ? ` Backend error: ${backendError}.` : ''}${hint}`
      )
    }

    this.setStorageToken(tokenStr, this.localAuthStorageKey)
    this.emit('sessionChanged', session)
    this.setAppKitAccountUser(jwtDecode(tokenStr))

    this.otpUuid = null
  }

  async getSessions(chainId: CaipNetworkId, address: string): Promise<SIWXSession[]> {
    try {
      if (!this.getStorageToken(this.localAuthStorageKey)) {
        return []
      }

      const account = await this.request({
        method: 'GET',
        key: 'me',
        query: {},
        headers: ['auth'] as const
      })

      if (!account) {
        return []
      }

      const isSameAddress = account.address.toLowerCase() === address.toLowerCase()
      const isSameNetwork = account.caip2Network === chainId

      if (!isSameAddress || !isSameNetwork) {
        return []
      }

      const session: SIWXSession = {
        data: {
          accountAddress: account.address,
          chainId: account.caip2Network
        } as SIWXMessage.Data,
        message: '',
        signature: ''
      }

      this.emit('sessionChanged', session)
      this.setAppKitAccountUser(account)

      return [session]
    } catch {
      return []
    }
  }

  async revokeSession(_chainId: CaipNetworkId, _address: string): Promise<void> {
    return Promise.resolve(this.clearStorageTokens())
  }

  async setSessions(sessions: SIWXSession[]): Promise<void> {
    if (sessions.length === 0) {
      this.clearStorageTokens()
    } else {
      const session = (sessions.find(
        s => s.data.chainId === getActiveCaipNetwork()?.caipNetworkId
      ) || sessions[0]) as SIWXSession

      await this.addSession(session)
    }
  }

  getRequired() {
    return this.required
  }

  async getSessionAccount() {
    if (!this.getStorageToken(this.localAuthStorageKey)) {
      throw new Error('Not authenticated')
    }

    return this.request({
      method: 'GET',
      key: 'me',
      body: {} as never,
      query: {
        includeAppKitAccount: true
      },
      headers: ['auth']
    })
  }

  async setSessionAccountMetadata(metadata: object | null = null) {
    if (!this.getStorageToken(this.localAuthStorageKey)) {
      throw new Error('Not authenticated')
    }

    return this.request({
      method: 'PUT',
      key: 'account-metadata',
      body: { metadata },
      headers: ['auth']
    })
  }

  on<Event extends keyof ReownAuthentication.Events>(
    event: Event,
    callback: ReownAuthentication.Listener<Event>
  ) {
    this.listeners[event].push(callback)

    return () => {
      this.listeners[event] = this.listeners[event].filter(
        cb => cb !== callback
      ) as ReownAuthentication.EventListeners[Event]
    }
  }

  removeAllListeners() {
    const keys = Object.keys(this.listeners) as (keyof ReownAuthentication.Events)[]
    keys.forEach(key => {
      this.listeners[key] = []
    })
  }

  async requestEmailOtp({ email, account }: { email: string; account: string }) {
    const otp = await this.request({
      method: 'POST',
      key: 'otp',
      body: { email, account }
    })

    this.otpUuid = otp.uuid

    this.messenger.resources = [`email:${email}`]

    return otp
  }

  confirmEmailOtp({ code }: { code: string }) {
    return this.request({
      method: 'PUT',
      key: 'otp',
      body: { code },
      headers: ['otp']
    })
  }

  private async request<
    Method extends ReownAuthentication.Methods,
    Key extends ReownAuthentication.RequestKeys<Method>
  >({
    method,
    key,
    query,
    body,
    headers
  }: ReownAuthentication.RequestParams<Key, Method>): Promise<
    ReownAuthentication.RequestResponse<Method, Key>
  > {
    const { projectId, st, sv } = this.getSDKProperties()

    // Use environment variable, runtime origin fallback, or Reown Cloud.
    // CRITICAL: For Google/social login, both nonce AND authenticate must hit the SAME backend.
    // ✅ PATCHED: ALWAYS prioritize window.location.origin for /auth/v1/* requests FIRST
    // This ensures embedded/social wallets use our local /auth/v1/* routes (EIP-1271 supported).
    // CRITICAL: For auth/v1 endpoints, NEVER use api.web3modal.org - always use local origin
    const isAuthV1Endpoint = String(key) === 'nonce' || String(key) === 'authenticate' || String(key) === 'me';
    
    // ✅ CRITICAL FIX: For auth/v1 endpoints, ALWAYS use window.location.origin if available
    // This prevents "Nonce mismatch" errors by ensuring nonce and authenticate hit the same backend
    let apiUrl: string;
    if (isAuthV1Endpoint) {
      // For auth/v1 endpoints, prioritize window.location.origin above everything else
      if (typeof window !== 'undefined' && window.location?.origin) {
        apiUrl = window.location.origin;
        console.log('✅ [ReownAuth] Using window.location.origin for auth/v1 endpoint:', apiUrl);
      } else if (typeof process.env.NEXT_PUBLIC_W3M_API_URL === 'string' && process.env.NEXT_PUBLIC_W3M_API_URL.length > 0) {
        apiUrl = process.env.NEXT_PUBLIC_W3M_API_URL;
        console.log('✅ [ReownAuth] Using NEXT_PUBLIC_W3M_API_URL for auth/v1 endpoint:', apiUrl);
      } else {
        // Last resort: use api.web3modal.org but log warning
        console.warn('⚠️ [ReownAuth] No local origin available for auth/v1 endpoint, using api.web3modal.org (may cause nonce mismatch)');
        apiUrl = 'https://api.web3modal.org';
      }
    } else {
      // For non-auth/v1 endpoints, use standard fallback order
      apiUrl = (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : null) ||
      (typeof process.env.NEXT_PUBLIC_W3M_API_URL === 'string' && process.env.NEXT_PUBLIC_W3M_API_URL.length > 0
        ? process.env.NEXT_PUBLIC_W3M_API_URL
        : null) ||
      'https://api.web3modal.org';
    }
      
    // Mark as patched
    // @ts-ignore
    const __patched_reown_auth__ = true;

    console.log('🔗 [SIWX Auth] API Request:', {
      method,
      key,
      apiUrl,
      projectId,
      hasBody: !!body,
      headers: headers || [],
      isAuthV1Endpoint: isAuthV1Endpoint,
      windowOrigin: typeof window !== 'undefined' ? window.location?.origin : 'N/A',
      willUseLocal: isAuthV1Endpoint && typeof window !== 'undefined' && window.location?.origin
    })

    const url = new URL(`${apiUrl}/auth/v1/${String(key)}`)
    url.searchParams.set('projectId', projectId)
    url.searchParams.set('st', st)
    url.searchParams.set('sv', sv)

    if (query) {
      Object.entries(query).forEach(([queryKey, queryValue]) =>
        url.searchParams.set(queryKey, String(queryValue))
      )
    }

    const response = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: Array.isArray(headers)
        ? headers.reduce((acc, header) => {
            switch (header) {
              case 'nonce':
                acc['x-nonce-jwt'] = `Bearer ${this.getStorageToken(this.localNonceStorageKey)}`
                break
              case 'auth':
                acc['Authorization'] = `Bearer ${this.getStorageToken(this.localAuthStorageKey)}`
                break
              case 'otp':
                if (this.otpUuid) {
                  acc['x-otp'] = this.otpUuid
                }
                break
              default:
                break
            }

            return acc
          }, {})
        : undefined
    })

    console.log('🔗 [SIWX Auth] API Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: url.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [SIWX Auth] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.toString()
      })
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const jsonResponse = await response.json()
      console.log('🔗 [SIWX Auth] JSON Response:', {
        hasToken: 'token' in jsonResponse,
        keys: Object.keys(jsonResponse),
        tokenPreview: jsonResponse.token ? jsonResponse.token.substring(0, 16) + '...' : 'no token'
      })
      return jsonResponse
    }

    // Fallback: try parsing as JSON when body may be JSON but Content-Type was wrong (e.g. proxy stripped it)
    const textResponse = await response.text()
    if (textResponse && (textResponse.trim().startsWith('{') || textResponse.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(textResponse) as Record<string, unknown>
        console.log('🔗 [SIWX Auth] Parsed text as JSON:', { keys: Object.keys(parsed) })
        return parsed as ReownAuthentication.RequestResponse<Method, Key>
      } catch {
        // not valid JSON, fall through
      }
    }
    console.log('🔗 [SIWX Auth] Text Response (no token):', textResponse.substring(0, 100))
    return null as ReownAuthentication.RequestResponse<Method, Key>
  }

  private getStorageToken(key: keyof SafeLocalStorageItems): string | undefined {
    return SafeLocalStorage.getItem(key)
  }

  private setStorageToken(token: string, key: keyof SafeLocalStorageItems): void {
    SafeLocalStorage.setItem(key, token)
  }

  private clearStorageTokens(): void {
    this.otpUuid = null
    SafeLocalStorage.removeItem(this.localAuthStorageKey)
    SafeLocalStorage.removeItem(this.localNonceStorageKey)
    this.emit('sessionChanged', undefined)
  }

  private async getNonce(): Promise<string> {
    const { nonce, token } = await this.request({
      method: 'GET',
      key: 'nonce'
    })

    this.setStorageToken(token, this.localNonceStorageKey)

    return nonce
  }

  private getClientId(): string | null {
    return BlockchainApiController.state.clientId
  }

  private getWalletInfo(): ReownAuthentication.WalletInfo | undefined {
    const walletInfo = ChainController.getAccountData()?.connectedWalletInfo

    if (!walletInfo) {
      return undefined
    }

    if ('social' in walletInfo && 'identifier' in walletInfo) {
      const social = walletInfo['social'] as string
      const identifier = walletInfo['identifier'] as string

      return { type: 'social', social, identifier }
    }

    const { name, icon } = walletInfo

    let type: ReownAuthentication.WalletInfo['type'] = 'unknown'

    switch (walletInfo.type) {
      case 'EXTERNAL':
      case 'INJECTED':
      case 'ANNOUNCED':
        type = 'extension'
        break
      case 'WALLET_CONNECT':
        type = 'walletconnect'
        break
      default:
        type = 'unknown'
    }

    return {
      type,
      name,
      icon
    }
  }

  private getSDKProperties(): { projectId: string; st: string; sv: string } {
    try {
      const properties = ApiController._getSdkProperties()
      if (!properties?.projectId) {
        console.warn('⚠️ [SIWX Auth] No projectId from ApiController, using fallback')
        // Fallback to the production project ID from config
        return {
          projectId: '122878b95737e1300958ec73a8c0b61a', // Production project ID
          st: properties?.st || 'appkit',
          sv: properties?.sv || '4.2.0'
        }
      }
      return properties
    } catch (error) {
      console.error('❌ [SIWX Auth] Failed to get SDK properties:', error)
      // Ultimate fallback
      return {
        projectId: '122878b95737e1300958ec73a8c0b61a',
        st: 'appkit',
        sv: '4.2.0'
      }
    }
  }

  private emit<Event extends keyof ReownAuthentication.Events>(
    event: Event,
    data: ReownAuthentication.Events[Event]
  ) {
    this.listeners[event].forEach(listener => listener(data))
  }

  private setAppKitAccountUser(session: ReownAuthentication.SessionAccount) {
    const { email } = session

    if (email) {
      // Iterate over all active chain namespaces from ChainController state
      ChainController.state.chains.forEach((_, chainNamespace) => {
        ChainController.setAccountProp('user', { email }, chainNamespace)
      })
    }
  }
}

export namespace ReownAuthentication {
  export type ConstructorParams = {
    /**
     * The key to use for storing the session token in local storage.
     * @default '@appkit/siwx-auth-token'
     */
    localAuthStorageKey?: string
    /**
     * The key to use for storing the nonce token in local storage.
     * @default '@appkit/siwx-nonce-token'
     */
    localNonceStorageKey?: string
    /**
     * If false the wallet stays connected when user denies the signature request.
     * @default true
     */
    required?: boolean
  }

  export type AvailableRequestHeaders = {
    nonce: {
      'x-nonce-jwt': string
    }
    auth: {
      Authorization: string
    }
    otp: {
      'x-otp'?: string
    }
  }

  export type RequestParams<Key extends keyof Requests[Method], Method extends Methods> = {
    method: Method
    key: Key
    // @ts-expect-error - This is matching correctly already
  } & Pick<Requests[Method][Key], 'query' | 'body' | 'headers'>

  export type RequestResponse<
    Method extends Methods,
    Key extends RequestKeys<Method>
    // @ts-expect-error - This is matching correctly already
  > = Requests[Method][Key]['response']

  export type Request<
    Body,
    Response,
    Query extends Record<string, unknown> | undefined = undefined,
    Headers extends (keyof AvailableRequestHeaders)[] | undefined = undefined
  > = (Response extends undefined
    ? {
        response?: never
      }
    : {
        response: Response
      }) &
    (Body extends undefined ? { body?: never } : { body: Body }) &
    (Query extends undefined ? { query?: never } : { query: Query }) &
    (Headers extends undefined ? { headers?: never } : { headers: Headers })

  export type Requests = {
    GET: {
      nonce: Request<undefined, { nonce: string; token: string }>
      me: Request<
        undefined,
        Omit<SessionAccount, 'appKitAccount'>,
        { includeAppKitAccount?: boolean },
        ['auth']
      >
    }
    POST: {
      authenticate: Request<
        {
          data?: SIWXMessage.Data
          message: string
          signature: string
          clientId?: string | null
          walletInfo?: WalletInfo
        },
        {
          token: string
        },
        undefined,
        ['nonce', 'otp']
      >
      'sign-out': Request<undefined, never, never, ['auth']>
      otp: Request<{ email: string; account: string }, { uuid: string | null }>
    }
    PUT: {
      'account-metadata': Request<{ metadata: object | null }, unknown, undefined, ['auth']>
      otp: Request<{ code: string }, null, undefined, ['otp']>
    }
  }

  export type Methods = 'GET' | 'POST' | 'PUT'

  export type RequestKeys<Method extends Methods> = keyof Requests[Method]

  export type WalletInfo =
    | {
        type: 'walletconnect' | 'extension' | 'unknown'
        name: string | undefined
        icon: string | undefined
      }
    | { type: 'social'; social: string; identifier: string }

  export type Events = {
    sessionChanged: SIWXSession | undefined
  }

  export type Listener<Event extends keyof Events> = (event: Events[Event]) => void

  export type EventListeners = {
    [Key in keyof Events]: Listener<Key>[]
  }

  export type SessionAccount = {
    aud: string
    iss: string
    exp: number
    projectIdKey: string
    sub: string
    address: string
    chainId: number | string
    chainNamespace: CaipNamespaces
    caip2Network: string
    uri: string
    domain: string
    projectUuid: string
    profileUuid: string
    nonce: string
    email?: string
    appKitAccount?: {
      uuid: string
      caip2_chain: string
      address: string
      profile_uuid: string
      created_at: string
      is_main_account: boolean
      verification_status: null
      connection_method: object | null
      metadata: object
      last_signed_in_at: string
      signed_up_at: string
      updated_at: string
    }
  }
}

/**
 * Decodes a JWT token and returns its payload
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if invalid
 */
function jwtDecode(token: string): Omit<ReownAuthentication.SessionAccount, 'appKitAccount'> {
  // Defensive: guard before any property access to avoid "Cannot read properties of undefined (reading 'split')"
  if (token == null || typeof token !== 'string') {
    console.error('❌ [SIWX Auth] jwtDecode called with invalid token:', { token, type: typeof token })
    throw new Error(`Invalid token parameter: expected string, got ${typeof token}`)
  }
  if (token.trim().length === 0) {
    console.error('❌ [SIWX Auth] jwtDecode called with empty token')
    throw new Error('Invalid token: empty string')
  }

  try {
    // Split the token into parts
    const parts = token.split('.')

    // Check if the token has the correct format (header.payload.signature)
    if (parts.length !== 3) {
      console.error('❌ [SIWX Auth] Invalid JWT format:', {
        tokenLength: token.length,
        partsCount: parts.length,
        tokenPreview: token.substring(0, 50) + '...'
      })
      throw new Error(`Invalid JWT format: expected 3 parts separated by '.', got ${parts.length} parts`)
    }

    // Decode the payload (second part)
    const payload = parts[1]

    if (typeof payload !== 'string') {
      console.error('❌ [SIWX Auth] Invalid JWT payload:', { payload, type: typeof payload })
      throw new Error('Invalid JWT payload: not a string')
    }

    if (payload.length === 0) {
      console.error('❌ [SIWX Auth] Empty JWT payload')
      throw new Error('Invalid JWT payload: empty')
    }

    // Convert base64url to base64
    const base64 = payload.replace(/-/gu, '+').replace(/_/gu, '/')

    // Add padding if needed
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    // Decode and parse the JSON
    const decoded = JSON.parse(atob(padded))

    console.log('✅ [SIWX Auth] JWT decoded successfully:', {
      hasAddress: 'address' in decoded,
      hasEmail: 'email' in decoded,
      address: decoded.address,
      projectId: decoded.projectIdKey
    })

    return decoded
  } catch (error) {
    console.error('❌ [SIWX Auth] JWT decode failed:', error)
    console.error('❌ [SIWX Auth] Token details:', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 100) + '...',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

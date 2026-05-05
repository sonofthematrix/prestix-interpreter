import type { ChainNamespace } from '@reown/appkit/networks'

import type { ChainAdapter } from '../../utils/TypeUtil'

export type Adapters = { [K in ChainNamespace]?: ChainAdapter }

export type AdapterControllerState = {
  adapters: Adapters
}

const state: AdapterControllerState = {
  adapters: {}
}

export const AdapterController = {
  state,
  initialize(adapters: Adapters) {
    state.adapters = { ...adapters }
  },
  get(namespace: ChainNamespace) {
    return state.adapters[namespace]
  }
}

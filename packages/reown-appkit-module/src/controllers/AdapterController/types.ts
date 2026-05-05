import type { CaipNetwork } from '@reown/appkit' 

import type { Connector } from '../../utils/TypeUtil'

export interface ChainAdapterConnector extends Connector {
  chains: CaipNetwork[]
}

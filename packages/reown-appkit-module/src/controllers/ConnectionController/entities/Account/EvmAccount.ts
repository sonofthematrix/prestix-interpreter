import type { AccountProps } from './Account'
import { Account } from './Account'

type EvmAccountProps = AccountProps & {
  type: 'eoa' | 'smartAccount'
  userInfo?: Record<string, unknown>
  smartAccountDeployed?: boolean
}

export class EvmAccount extends Account {
  public override type: 'eoa' | 'smartAccount'
  public userInfo?: Record<string, unknown>
  public override smartAccountDeployed?: boolean
  constructor({
    address,
    caipAddress,
    type,
    namespace,
    metadata,
    userInfo,
    smartAccountDeployed
  }: EvmAccountProps) {
    super({ address, caipAddress, type, namespace, metadata })
    this.type = type
    this.userInfo = userInfo
    this.smartAccountDeployed = smartAccountDeployed
  }
}

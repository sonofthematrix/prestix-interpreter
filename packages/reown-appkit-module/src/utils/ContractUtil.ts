import { erc20ABI } from '../contracts/erc20'
import { swapABI } from '../contracts/swap'
import { usdtABI } from '../contracts/usdt'
import { ConstantsUtil } from './ConstantsUtil'
import { 
  getContractByName as getContractByNameFromDB,
  getContractAddresses,
  getContractAddressByType as getContractAddressByTypeFromDB
  // @ts-expect-error - Dynamic import path resolved at runtime
} from '../../../../src/lib/services/contract-database-service'

export const ContractUtil = {
  getERC20Abi: (tokenAddress: string) => {
    if (ConstantsUtil.USDT_CONTRACT_ADDRESSES.includes(tokenAddress)) {
      return usdtABI
    }
    return erc20ABI
  },
  getSwapAbi: () => swapABI,
  getContractByName: (contractName: string) => getContractByNameFromDB(contractName),
  getContractAddressesFromDatabase: () => getContractAddresses(),
  getContractAddressByType: (contractType: string) => getContractAddressByTypeFromDB(contractType)
}

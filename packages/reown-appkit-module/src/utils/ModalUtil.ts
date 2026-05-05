import { ConnectionController } from '../controllers/ConnectionController'
import { ModalController } from '../controllers/ModalController'
import { RouterController } from '../controllers/RouterController'
import { SIWXUtil } from './SIWXUtil'

export const ModalUtil = {
  isUnsupportedChainView(): boolean {
    return (
      RouterController.state.view === 'UnsupportedChain' ||
      (RouterController.state.view === 'SwitchNetwork' &&
        RouterController.state.history.includes('UnsupportedChain'))
    )
  },

  async safeClose() {
    if (this.isUnsupportedChainView()) {
      ModalController.shake()

      return
    }

    const isSIWXCloseDisabled = await SIWXUtil.isSIWXCloseDisabled()
    if (isSIWXCloseDisabled) {
      ModalController.shake()

      return
    }

    if (
      RouterController.state.view === 'DataCapture' ||
      RouterController.state.view === 'DataCaptureOtpConfirm'
    ) {
      ConnectionController.disconnect()
    }

    ModalController.close()
  }
}

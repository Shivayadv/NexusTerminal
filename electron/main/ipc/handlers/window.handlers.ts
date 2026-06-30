import type { IpcMainInvokeEvent } from 'electron'

import { IPC } from '../../../shared/ipc-channels'
import type { Logger } from '../../core/logger/Logger'
import type { WindowManager } from '../../services/WindowManager'
import type { SecureIpcRouter } from '../SecureIpcRouter'

export function registerWindowHandlers(
  router: SecureIpcRouter,
  windowManager: WindowManager,
  logger: Logger,
): void {
  const getWin = (event: IpcMainInvokeEvent) => {
    const win = windowManager.getWindow(event.sender.id)
    if (!win) logger.warn('window handler: no window found for sender', { id: event.sender.id })
    return win
  }

  router.handle(IPC.WINDOW.MINIMIZE, (event) => {
    getWin(event as IpcMainInvokeEvent)?.minimize()
  }, 'Minimize the calling window')

  router.handle(IPC.WINDOW.MAXIMIZE, (event) => {
    getWin(event as IpcMainInvokeEvent)?.maximize()
  }, 'Maximize the calling window')

  router.handle(IPC.WINDOW.UNMAXIMIZE, (event) => {
    getWin(event as IpcMainInvokeEvent)?.unmaximize()
  }, 'Restore the calling window from maximized state')

  router.handle(IPC.WINDOW.CLOSE, (event) => {
    getWin(event as IpcMainInvokeEvent)?.close()
  }, 'Close the calling window')

  router.handle(IPC.WINDOW.IS_MAXIMIZED, (event) => {
    return getWin(event as IpcMainInvokeEvent)?.isMaximized() ?? false
  }, 'Returns whether the calling window is maximized')

  router.handle(IPC.WINDOW.SET_TITLE, (event, title) => {
    if (typeof title !== 'string') return
    getWin(event as IpcMainInvokeEvent)?.setTitle(title)
  }, 'Set the title of the calling window')
}

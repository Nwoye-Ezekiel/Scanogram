export const SCANOGRAM_PLAYER_ID = 'SCANOGRAM_PLAYER_ID'
export const SCANOGRAM_DEVICE_ID = 'SCANOGRAM_DEVICE_ID'

export const setPlayerId = (playerId: string): void => {
  localStorage.setItem(SCANOGRAM_PLAYER_ID, playerId)
}

export const getPlayerId = () => {
  return localStorage.getItem(SCANOGRAM_PLAYER_ID) ?? ''
}

export const setDeviceId = (deviceId: string): void => {
  localStorage.setItem(SCANOGRAM_DEVICE_ID, deviceId)
}

export const getDeviceId = () => {
  return localStorage.getItem(SCANOGRAM_DEVICE_ID) ?? ''
}

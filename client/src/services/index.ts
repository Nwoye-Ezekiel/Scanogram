const SCANOGRAM_PLAYER_ID = 'SCANOGRAM_PLAYER_ID'

export const setPlayerId = (playerId: string): void => {
  localStorage.setItem(SCANOGRAM_PLAYER_ID, playerId)
}

export const getPlayerId = (): string | null => {
  return localStorage.getItem(SCANOGRAM_PLAYER_ID) ?? ''
}

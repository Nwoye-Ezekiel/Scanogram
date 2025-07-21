export const getDeviceInfo = () => {
  const ua = navigator.userAgent

  const isMobile = /Mobi|Android/i.test(ua)
  const isTablet = /Tablet|iPad/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isMac = /Macintosh/i.test(ua)
  const isWindows = /Windows/i.test(ua)

  return {
    os: isIOS ? 'iOS' : isAndroid ? 'Android' : isMac ? 'macOS' : isWindows ? 'Windows' : 'Unknown',
    deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser: getBrowserName(ua),
    userAgent: ua,
  }
}

const getBrowserName = (ua: string) => {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edge')) return 'Edge'
  return 'Unknown'
}

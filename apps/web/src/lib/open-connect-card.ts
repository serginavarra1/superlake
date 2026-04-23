export function openConnectCardPopup(url: string): Window | null {
  const width = 1200
  const height = 1000
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2
  return window.open(
    url,
    "fivetran-connect-card",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  )
}

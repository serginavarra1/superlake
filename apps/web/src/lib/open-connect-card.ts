export function openConnectCardPopup(url: string): Window | null {
  const width = 700
  const height = 800
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2
  return window.open(
    url,
    "fivetran-connect-card",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  )
}

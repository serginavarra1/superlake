import { useEffect } from "react"

export default function ConnectionsCallbackPage() {
  useEffect(() => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "fivetran-connect-card-closed" }, window.location.origin)
      }
    } catch {
      // ignore cross-origin access issues
    }
    window.close()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      You can close this tab.
    </div>
  )
}

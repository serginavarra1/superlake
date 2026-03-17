import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { LayoutGrid, Database, Table2, Plus, MessageSquare, ChevronRight, Star } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { useCreateDashboard } from "@/hooks/use-dashboards"
import { useHomeStats } from "@/hooks/use-home"
import { formatDate, dashboardColor } from "@/components/dashboard-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { data, isLoading } = useHomeStats()
  const createDashboard = useCreateDashboard()

  async function handleNewReport() {
    try {
      const dashboard = await createDashboard.mutateAsync("New Dashboard")
      navigate(`/reports/${dashboard.id}`)
    } catch {
      toast.error("Failed to create report")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-8 max-w-5xl mx-auto w-full h-full overflow-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {user?.firstName ?? user?.username ?? "there"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/ai-chat")} className="gap-2">
            <MessageSquare className="size-4" />
            Ask AI
          </Button>
          <Button variant="outline" onClick={() => navigate("/data-management/data-studio")} className="gap-2">
            <Database className="size-4" />
            Explore Data
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          icon={<LayoutGrid className="size-5 text-muted-foreground" />}
          label="Reports"
          value={data?.reportsCount ?? 0}
          loading={isLoading}
        />
        <MetricCard
          icon={<Database className="size-5 text-muted-foreground" />}
          label="Datasets"
          value={data?.datasetsCount ?? 0}
          loading={isLoading}
        />
        <MetricCard
          icon={<Table2 className="size-5 text-muted-foreground" />}
          label="Tables"
          value={data?.tablesCount ?? 0}
          loading={isLoading}
        />
      </div>

      {/* Favourite dashboards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Favourite dashboards</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground h-auto py-1"
            onClick={() => navigate("/reports")}
          >
            View all
            <ChevronRight className="size-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (data?.favouriteDashboards ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Star className="size-6" />
            <p className="text-sm">No favourites yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {(data?.favouriteDashboards ?? []).map((dashboard) => (
              <button
                key={dashboard.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => navigate(`/reports/${dashboard.id}`)}
              >
                <div className={`flex size-8 items-center justify-center rounded-md ${dashboardColor(dashboard.id)}`}>
                  <LayoutGrid className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{dashboard.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(dashboard.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}
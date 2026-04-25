import { useNavigate } from "react-router-dom"
import { LayoutGrid,  ChevronRight, Star, ChartPie, BotMessageSquare, DatabaseSearch, Plug } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { useFavouriteDashboards } from "@/hooks/use-dashboards"
import { formatDate, dashboardColor } from "@/components/dashboard/dashboard-row"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: favourites, isLoading } = useFavouriteDashboards()

  return (
    <div className="flex flex-col gap-6 pt-12 max-w-5xl mx-auto h-full overflow-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user?.firstName ?? user?.username ?? "there"}</h1>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<ChartPie className="size-5" />}
          iconClass="bg-gray-100 border-black text-gray-500"
          label="Reports"
          description="View and manage dashboards"
          onClick={() => navigate("/reports")}
        />
        <QuickActionCard
          icon={<BotMessageSquare className="size-5" />}
          iconClass="bg-gray-100 border-black text-gray-500"
          label="AI Chat"
          description="Ask questions about your data"
          onClick={() => navigate("/ai-chat")}
        />
        <QuickActionCard
          icon={<DatabaseSearch className="size-5" />}
          iconClass="bg-gray-100 border-black text-gray-500"
          label="Data Studio"
          description="Explore tables and schemas"
          onClick={() => navigate("/data-management/data-studio")}
        />
        <QuickActionCard
          icon={<Plug className="size-5" />}
          iconClass="bg-gray-100 border-black text-gray-500"
          label="Connections"
          description="Manage data source connections"
          onClick={() => navigate("/data-management/connections")}
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
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (favourites ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Star className="size-6" />
            <p className="text-sm">No favourites yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(favourites ?? []).map((dashboard) => (
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

function QuickActionCard({
  icon,
  iconClass,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  iconClass: string
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
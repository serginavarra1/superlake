import {
  Flame,
  Home,
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader >
        <div className="flex items-center gap-2 p-2 transition-all group-data-[collapsible=icon]:p-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-500 text-white shrink-0">
            <Flame className="size-4" strokeWidth={3} />
          </div>
          <span className="text-lg font-semibold truncate group-data-[collapsible=icon]:hidden">Unnamed</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} currentPath={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import {
  Flame,
  Home,
  Plug,
  ChartPie,
  BotMessageSquare,
  DatabaseSearch,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: ChartPie,
  },
  {
    title: "AI Chat",
    url: "/ai-chat",
    icon: BotMessageSquare,
  },
]

const dataManagementItems = [
  {
    title: "Data Studio",
    url: "/data-management/data-studio",
    icon: DatabaseSearch,
  },
  {
    title: "Connections",
    url: "/data-management/connections",
    icon: Plug,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 transition-all group-data-[collapsible=icon]:p-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-500 text-white shrink-0">
            <Flame className="size-4" strokeWidth={3} />
          </div>
          <span className="text-lg font-semibold truncate group-data-[collapsible=icon]:hidden">Unnamed</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={pathname.startsWith(item.url)}>
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Data Management</SidebarGroupLabel>
          <SidebarMenu>
            {dataManagementItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

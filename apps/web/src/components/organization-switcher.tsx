import { ChevronsUpDown, Plus, Settings } from "lucide-react"
import {
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/clerk-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar()
  const { openCreateOrganization, openOrganizationProfile } = useClerk()
  const { organization: activeOrg } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  if (!activeOrg) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={activeOrg.imageUrl} alt={activeOrg.name} />
                <AvatarFallback className="rounded-lg">
                  {activeOrg.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {userMemberships?.data?.map((membership) => {
              const isActive = membership.organization.id === activeOrg.id
              return (
                <DropdownMenuItem
                  key={membership.organization.id}
                  onClick={() =>
                    setActive?.({ organization: membership.organization.id })
                  }
                  className={`gap-2 p-2 ${isActive && "bg-gray-100"}`}
                  data-active={isActive}
                >
                  <Avatar className="size-6 rounded-md">
                    <AvatarImage
                      src={membership.organization.imageUrl}
                      alt={membership.organization.name}
                    />
                    <AvatarFallback className="rounded-md">
                      {membership.organization.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {membership.organization.name}
                  {isActive && (
                    <>
                      <button
                        className="ml-auto cursor-pointer flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gray-200 hover:text-accent-foreground active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation()
                          openOrganizationProfile()
                        }}
                        title="Manage organization"
                      >
                        <Settings className="size-4.5 transition-transform hover:rotate-45" />
                        <span className="sr-only">Manage organization</span>
                      </button>
                    </>
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => openCreateOrganization()}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Create organization
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

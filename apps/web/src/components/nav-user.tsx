import {
  Check,
  ChevronsUpDown,
  LogOut,
  Plus,
  Settings,
  User,
} from "lucide-react"
import {
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/clerk-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const { openUserProfile, openCreateOrganization, openOrganizationProfile, signOut } = useClerk()
  const { organization: activeOrg } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  if (!user) {
    return null
  }

  const fullName = user.fullName ?? user.username ?? "User"
  const email = user.primaryEmailAddress?.emailAddress ?? ""
  const avatarUrl = user.imageUrl
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="truncate text-xs">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeOrg && userMemberships?.data && userMemberships.data.length > 0 && (
              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs px-2">
                  Organizations
                </DropdownMenuLabel>
                {userMemberships.data.map((membership) => {
                  const isActive = membership.organization.id === activeOrg.id
                  return (
                    <DropdownMenuItem
                      key={membership.organization.id}
                      onClick={() =>
                        setActive?.({ organization: membership.organization.id })
                      }
                      className="gap-2"
                    >
                      <Avatar className="size-5 rounded-md">
                        <AvatarImage
                          src={membership.organization.imageUrl}
                          alt={membership.organization.name}
                        />
                        <AvatarFallback className="rounded-md color-black">
                          {membership.organization.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{membership.organization.name}</span>
                      {isActive && <Check className="size-4" />}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => openCreateOrganization()}
                >
                  <div className="flex size-5 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <span>Create organization</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => openOrganizationProfile()}
                >
                  <Settings className="size-4" />
                  <span>Manage organization</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openUserProfile()}>
                <User />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

import { Outlet, useLocation } from 'react-router-dom'
import { useOrganization } from '@clerk/clerk-react'

import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const segmentTitles: Record<string, string> = {
  'home': 'Home',
  'reports': 'Reports',
  'ai-chat': 'AI Chat',
  'data-management': 'Data Management',
  'data-studio': 'Data Studio',
  'connections': 'Connections',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { organization } = useOrganization()
  const segments = pathname.split('/').filter(Boolean)
  const knownSegments = segments
    .map((segment, index) => ({ segment, url: '/' + segments.slice(0, index + 1).join('/') }))
    .filter(({ segment }) => segment in segmentTitles)
  const breadcrumbs = knownSegments.map(({ segment, url }, index) => ({
    title: segmentTitles[segment],
    url,
    isLast: index === knownSegments.length - 1,
  }))

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {organization && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbPage>{organization.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.url} className="contents">
                    <BreadcrumbItem>
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                    {!crumb.isLast && <BreadcrumbSeparator />}
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 pt-0 overflow-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

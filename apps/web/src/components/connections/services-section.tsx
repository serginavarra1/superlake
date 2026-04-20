import { useState } from "react"
import { Plug, Plus, Loader2 } from "lucide-react"
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from "@/components/ui/item"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import { useFivetranServices } from "@/hooks/use-connections"
import type { FivetranService } from "@/types/api"

const PAGE_SIZE = 100

interface ServicesSectionProps {
  onSelect: (service: FivetranService) => void
}

export function ServicesSection({ onSelect }: ServicesSectionProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [prevCursors, setPrevCursors] = useState<(string | undefined)[]>([])
  const { data, isLoading } = useFivetranServices({ limit: PAGE_SIZE, cursor })
  const items = data?.items ?? []
  const nextCursor = data?.nextCursor

  function goPrev(e: React.MouseEvent) {
    e.preventDefault()
    if (prevCursors.length === 0) return
    const stack = [...prevCursors]
    const prev = stack.pop()
    setPrevCursors(stack)
    setCursor(prev)
  }

  function goNext(e: React.MouseEvent) {
    e.preventDefault()
    if (!nextCursor) return
    setPrevCursors((s) => [...s, cursor])
    setCursor(nextCursor)
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No services available.</p>
    )
  }

  const showPagination = prevCursors.length > 0 || !!nextCursor
  const prevDisabled = prevCursors.length === 0
  const nextDisabled = !nextCursor

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <ItemGroup className="flex-1 min-h-0 overflow-y-auto gap-2 pr-1">
        {items.map((service) => (
          <div key={service.id}>
            <Item size="sm" variant={"outline"} className="group/service">
              <ItemMedia variant="image">
                {service.icon_url ? (
                  <img src={service.icon_url} alt={service.name} className="size-3 object-contain" />
                ) : (
                  <Plug className="size-4" />
                )}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{service.name}</ItemTitle>
                {(service.description || service.type) && (
                  <ItemDescription>{service.description ?? service.type}</ItemDescription>
                )}
              </ItemContent>
              <ItemActions>
                <Button
                  size="sm"
                  variant="outline"
                  className="opacity-0 group-hover/service:opacity-100 transition-opacity"
                  onClick={() => onSelect(service)}
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </ItemActions>
            </Item>
          </div>
        ))}
      </ItemGroup>

      {showPagination && (
        <Pagination className="mt-auto pt-2 pb-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={goPrev}
                aria-disabled={prevDisabled}
                className={prevDisabled ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={goNext}
                aria-disabled={nextDisabled}
                className={nextDisabled ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

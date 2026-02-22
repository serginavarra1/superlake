import { type DimensionGranularity } from "@/contexts/report-builder-context"
import { Button } from "@/components/ui/button"

const GRANULARITIES: { value: DimensionGranularity; label: string }[] = [
  { value: "date",       label: "Date"  },
  { value: "month_year", label: "Month" },
  { value: "year",       label: "Year"  },
]

interface GranularityPickerProps {
  value: DimensionGranularity | null
  onChange: (granularity: DimensionGranularity) => void
}

export function GranularityPicker({ value, onChange }: GranularityPickerProps) {
  return (
    <div className="mt-2 flex gap-1">
      {GRANULARITIES.map((g) => (
        <Button
          key={g.value}
          variant={value === g.value ? "secondary" : "outline"}
          size="sm"
          className="flex-1 text-xs border"
          onClick={() => onChange(g.value)}
        >
          {g.label}
        </Button>
      ))}
    </div>
  )
}

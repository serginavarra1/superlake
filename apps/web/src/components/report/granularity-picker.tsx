import { cn } from "@/lib/utils"
import { type DatePart, type DimensionGranularity } from "@/contexts/report-builder-context"

const DATE_PARTS: { value: DatePart; label: string }[] = [
  { value: "day",   label: "Day"   },
  { value: "month", label: "Month" },
  { value: "year",  label: "Year"  },
]

interface GranularityPickerProps {
  value: DimensionGranularity
  onChange: (granularity: DimensionGranularity) => void
}

export function GranularityPicker({ value, onChange }: GranularityPickerProps) {
  function toggle(part: DatePart) {
    if (value.includes(part)) {
      if (value.length === 1) return // keep at least one selected
      onChange(value.filter((p) => p !== part))
    } else {
      onChange([...value, part])
    }
  }

  return (
    <div className="mt-2 flex gap-1">
      {DATE_PARTS.map((p) => {
        const selected = value.includes(p.value)
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => toggle(p.value)}
            className={cn(
              "flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "border-input bg-background text-foreground"
                : "border-transparent bg-muted/50 text-muted-foreground/50",
            )}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

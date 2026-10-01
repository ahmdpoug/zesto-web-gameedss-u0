import { RESOURCE_META, type Cost, type ResourceId, type Resources } from '@/lib/zesto/economy'
import { cn } from '@/lib/utils'
import { ResourceIcon } from './resource-icon'

export function CostList({ cost, resources, className }: { cost: Cost; resources?: Resources; className?: string }) {
  const entries = (Object.entries(cost) as [ResourceId, number][]).filter(([, v]) => v > 0)
  if (entries.length === 0) return <span className="text-xs text-muted-foreground">Free</span>
  return (
    <ul className={cn('flex flex-wrap gap-1', className)} aria-label="Cost">
      {entries.map(([k, v]) => {
        const short = resources ? resources[k] < v : false
        return (
          <li
            key={k}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              short ? 'bg-destructive/15 text-destructive' : 'bg-black/25 text-foreground',
            )}
          >
            <ResourceIcon id={k} className="size-3" />
            <span>{v}</span>
            <span className="sr-only">{`${RESOURCE_META[k].label}${short ? ' (not enough)' : ''}`}</span>
          </li>
        )
      })}
    </ul>
  )
}

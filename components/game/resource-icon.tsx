import { Gem, Layers, Mountain, TreePalm, type LucideProps } from 'lucide-react'
import { RESOURCE_META, type ResourceId } from '@/lib/zesto/economy'

const ICONS = { wood: TreePalm, stone: Mountain, ore: Gem, ingots: Layers } as const

export function ResourceIcon({ id, ...props }: { id: ResourceId } & LucideProps) {
  const Icon = ICONS[id]
  return <Icon aria-hidden="true" style={{ color: RESOURCE_META[id].color }} {...props} />
}

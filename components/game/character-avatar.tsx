import Image from 'next/image'
import { CHARACTER_BY_ID, type CharacterId } from '@/lib/zesto/config'
import { cn } from '@/lib/utils'

export function CharacterAvatar({
  id,
  size = 40,
  className,
  ring = true,
}: {
  id: CharacterId | string
  size?: number
  className?: string
  ring?: boolean
}) {
  const character = CHARACTER_BY_ID[id as CharacterId] ?? CHARACTER_BY_ID.blu
  return (
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-full bg-muted', className)}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${character.color}, 0 4px 12px -4px ${character.color}` : undefined,
      }}
    >
      <Image
        src={character.image || '/placeholder.svg'}
        alt={character.name}
        fill
        sizes={`${size * 2}px`}
        className="object-cover object-[50%_35%]"
      />
    </span>
  )
}

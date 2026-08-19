import React from 'react'
import {
  Coffee,
  Zap,
  Sparkles,
  Flame,
  Music2,
  Brain,
  Moon,
  PartyPopper,
  Heart,
  Music,
  Compass
} from 'lucide-react'

interface CategoryIconProps {
  name: string
  size?: number
  className?: string
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 16, className = '' }) => {
  switch (name) {
    case 'coffee':
      return <Coffee size={size} className={className} />
    case 'zap':
      return <Zap size={size} className={className} />
    case 'sparkles':
      return <Sparkles size={size} className={className} />
    case 'flame':
      return <Flame size={size} className={className} />
    case 'music':
      return <Music2 size={size} className={className} />
    case 'brain':
      return <Brain size={size} className={className} />
    case 'moon':
      return <Moon size={size} className={className} />
    case 'party':
      return <PartyPopper size={size} className={className} />
    case 'heart':
      return <Heart size={size} className={className} />
    default:
      return <Compass size={size} className={className} />
  }
}

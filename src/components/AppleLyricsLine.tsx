import React, { useMemo } from 'react'
import type { LyricLine } from '../utils/lyrics'

interface AppleLyricsLineProps {
  line: LyricLine
  index: number
  activeLineIndex: number
  currentTime: number
  nextLineTime?: number
  fontSize: number
  onClick: (time: number) => void
  elementId: string
  align?: 'left' | 'center'
}

export const AppleLyricsLine: React.FC<AppleLyricsLineProps> = React.memo(({
  line,
  index,
  activeLineIndex,
  currentTime,
  nextLineTime,
  fontSize,
  onClick,
  elementId,
  align = 'left'
}) => {
  const isActive = index === activeLineIndex
  const isPast = index < activeLineIndex

  // Split line into words for word-by-word progressive illumination
  const words = useMemo(() => {
    return line.text.split(/(\s+)/).filter(Boolean)
  }, [line.text])

  // Calculate line progress fraction (0.0 to 1.0)
  const lineProgress = useMemo(() => {
    if (!isActive) return isPast ? 1 : 0
    if (line.time === -1) return 1
    const end = nextLineTime && nextLineTime > line.time ? nextLineTime : line.time + 4.0
    const duration = Math.max(0.4, end - line.time)
    const elapsed = Math.max(0, currentTime - line.time + 0.1) // 100ms syllable onset lead
    return Math.max(0, Math.min(1, elapsed / duration))
  }, [isActive, isPast, line.time, nextLineTime, currentTime])

  const nonSpaceWords = useMemo(() => words.filter(w => w.trim().length > 0), [words])
  const totalWords = Math.max(1, nonSpaceWords.length)
  let wordIndexCounter = 0

  return (
    <div
      id={elementId}
      onClick={() => {
        if (line.time !== -1) onClick(line.time)
      }}
      style={{
        fontSize: isActive ? `${fontSize + 5}px` : `${fontSize}px`,
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.3
      }}
      className={`
        transition-all duration-300 ease-out cursor-pointer select-none py-1 px-2 rounded-xl will-change-transform
        ${align === 'left' ? 'text-left' : 'text-center'}
        ${
          isActive
            ? 'font-extrabold tracking-tight opacity-100 scale-[1.02] origin-left'
            : isPast
            ? 'font-semibold tracking-normal text-white/30 opacity-40 hover:opacity-80 scale-100 origin-left'
            : 'font-semibold tracking-normal text-white/40 opacity-50 hover:opacity-90 scale-100 origin-left'
        }
      `}
    >
      {words.map((chunk, cIdx) => {
        const isSpace = chunk.trim().length === 0
        if (isSpace) {
          return <span key={cIdx}> </span>
        }

        const currentWordIdx = wordIndexCounter++
        const wordStartProgress = currentWordIdx / totalWords
        const wordEndProgress = (currentWordIdx + 1) / totalWords

        let wordIlluminated = false
        if (!isActive) {
          wordIlluminated = isPast
        } else {
          wordIlluminated = lineProgress >= wordStartProgress
        }

        return (
          <span
            key={cIdx}
            className="inline-block transition-colors duration-150"
            style={
              isActive
                ? {
                    color: wordIlluminated ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                    textShadow: wordIlluminated
                      ? '0 0 14px rgba(255, 255, 255, 0.7), 0 0 28px rgba(255, 255, 255, 0.3)'
                      : 'none'
                  }
                : undefined
            }
          >
            {chunk}
          </span>
        )
      })}
    </div>
  )
})

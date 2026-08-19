import React, { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'

const Visualizer: React.FC = () => {
  const { audioRef, isPlaying } = usePlayer()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!audioRef.current) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256

    const source = audioContext.createMediaElementAudioSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    analyserRef.current = analyser

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioRef])

  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!analyserRef.current || !ctx) return

      analyserRef.current.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(98, 98, 98)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height

        // Gradient color based on frequency
        const hue = (i / bufferLength) * 360
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="w-full h-20 bg-muted rounded-lg"
    />
  )
}

export default Visualizer

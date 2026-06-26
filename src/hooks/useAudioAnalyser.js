import { useEffect, useRef, useState } from "react"

export function useAudioAnalyser() {
  const [audioActive, setAudioActiveRaw] = useState(false)
  const [audioMode, setAudioMode] = useState("on")
  const [micStatus, setMicStatus] = useState("idle")
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const audioLevelRef = useRef(0)
  const audioRafRef = useRef(0)

  const setAudioActive = (valOrFn) => {
    const next = typeof valOrFn === "function" ? valOrFn(audioActive) : valOrFn
    if (next) {
      setMicStatus("requesting")

      const tryMic = () => navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const ready = ctx.state === "suspended" ? ctx.resume() : Promise.resolve()
          return ready.then(() => {
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.6
            source.connect(analyser)
            audioCtxRef.current = ctx
            analyserRef.current = analyser
            streamRef.current = stream
            setMicStatus("active")
            setAudioActiveRaw(true)
          })
        })

      const startSimulatedAudio = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6

        const bufSize = ctx.sampleRate * 0.5
        const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = noiseBuffer.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const noise = ctx.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.01, ctx.currentTime)

        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.value = 1.2
        lfoGain.gain.value = 0.4
        lfo.connect(lfoGain)
        lfoGain.connect(gain.gain)
        lfo.start()

        noise.connect(gain)
        gain.connect(analyser)
        noise.start()

        audioCtxRef.current = ctx
        analyserRef.current = analyser
        streamRef.current = null
        setMicStatus("sim")
        setAudioActiveRaw(true)
      }

      tryMic().catch(() => {
        try { startSimulatedAudio() }
        catch { setMicStatus("idle"); setAudioActiveRaw(false) }
      })

    } else {
      cancelAnimationFrame(audioRafRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
      analyserRef.current = null
      audioLevelRef.current = 0
      setAudioActiveRaw(false)
      setMicStatus("idle")
    }
  }

  useEffect(() => {
    if (!audioActive) return
    const buf = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128)
    let smooth = 0
    const poll = () => {
      audioRafRef.current = requestAnimationFrame(poll)
      const an = analyserRef.current
      if (!an) return
      an.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length) / 255
      const attack = 0.35
      const release = 0.08
      smooth = rms > smooth ? smooth + (rms - smooth) * attack : smooth + (rms - smooth) * release
      audioLevelRef.current = Math.min(1, smooth * 2.5)
    }
    audioRafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(audioRafRef.current)
  }, [audioActive])

  return {
    audioActive,
    audioMode,
    setAudioMode,
    micStatus,
    setAudioActive,
    audioLevelRef,
  }
}

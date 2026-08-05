import { useEffect, useRef, useState } from "react"

const FFT_SIZE = 2048
export const SPEECH_BAND_COUNT = 8
export const SPEECH_BAND_LABELS = [
  "85–200",
  "200–400",
  "400–700",
  "700–1.2k",
  "1.2–2k",
  "2–3.2k",
  "3.2–5k",
  "5–8k",
]
export const DEFAULT_BAND_SENSITIVITY = () => new Array(SPEECH_BAND_COUNT).fill(1)

const SILENCE_THRESHOLD = 0.04
const SILENCE_HOLD_MS = 200
const PITCH_MIN_HZ = 80
const PITCH_MAX_HZ = 400
const BASELINE_ALPHA = 0.02

function emptySpeechFeatures() {
  return {
    energy: 0,
    pitchNorm: 0,
    pitchHz: 0,
    centroid: 0,
    voiced: 0,
    silence: true,
    silenceAge: 0,
    bands: new Array(SPEECH_BAND_COUNT).fill(0),
  }
}

/** Autocorrelation pitch estimate in Hz, or 0 if unvoiced/uncertain. */
function estimatePitchHz(timeBuf, sampleRate) {
  const n = timeBuf.length
  // Convert byte time data (0–255, 128=silence) to centered floats
  let rms = 0
  for (let i = 0; i < n; i++) {
    const v = (timeBuf[i] - 128) / 128
    rms += v * v
  }
  rms = Math.sqrt(rms / n)
  if (rms < 0.02) return 0

  const minLag = Math.floor(sampleRate / PITCH_MAX_HZ)
  const maxLag = Math.min(n - 1, Math.floor(sampleRate / PITCH_MIN_HZ))
  if (minLag >= maxLag) return 0

  let bestLag = 0
  let bestCorr = 0
  let energy0 = 0
  for (let i = 0; i < n - maxLag; i++) {
    const v = (timeBuf[i] - 128) / 128
    energy0 += v * v
  }
  if (energy0 < 1e-6) return 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    const limit = n - lag
    for (let i = 0; i < limit; i++) {
      corr += ((timeBuf[i] - 128) / 128) * ((timeBuf[i + lag] - 128) / 128)
    }
    corr /= energy0
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (bestCorr < 0.3 || bestLag === 0) return 0
  return sampleRate / bestLag
}

function zeroCrossingRate(timeBuf) {
  let crossings = 0
  for (let i = 1; i < timeBuf.length; i++) {
    const a = timeBuf[i - 1] - 128
    const b = timeBuf[i] - 128
    if ((a >= 0 && b < 0) || (a < 0 && b >= 0)) crossings++
  }
  return crossings / (timeBuf.length - 1)
}

export function useAudioAnalyser() {
  const [audioActive, setAudioActiveRaw] = useState(false)
  const [audioMode, setAudioMode] = useState("on")
  const [micStatus, setMicStatus] = useState("idle")
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const audioLevelRef = useRef(0)
  const audioBandsRef = useRef([0, 0, 0, 0, 0])
  const speechFeaturesRef = useRef(emptySpeechFeatures())
  const bandSensitivityRef = useRef(DEFAULT_BAND_SENSITIVITY())
  const audioRafRef = useRef(0)
  const pitchBaselineRef = useRef(0)

  const setupAnalyser = (ctx) => {
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.55
    return analyser
  }

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
            const analyser = setupAnalyser(ctx)
            source.connect(analyser)
            audioCtxRef.current = ctx
            analyserRef.current = analyser
            streamRef.current = stream
            pitchBaselineRef.current = 0
            setMicStatus("active")
            setAudioActiveRaw(true)
          })
        })

      const startSimulatedAudio = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = setupAnalyser(ctx)

        // Speech-ish sim: pulsed band-limited noise + low oscillator for pitch feel
        const bufSize = Math.floor(ctx.sampleRate * 0.4)
        const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = noiseBuffer.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const noise = ctx.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 800
        filter.Q.value = 0.7

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.02, ctx.currentTime)

        // Syllable-like envelope ~4 Hz with irregularity via two LFOs
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.value = 3.8
        lfoGain.gain.value = 0.35
        lfo.connect(lfoGain)
        lfoGain.connect(gain.gain)

        const lfo2 = ctx.createOscillator()
        const lfo2Gain = ctx.createGain()
        lfo2.frequency.value = 0.7
        lfo2Gain.gain.value = 0.15
        lfo2.connect(lfo2Gain)
        lfo2Gain.connect(gain.gain)

        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        osc.type = "sawtooth"
        osc.frequency.value = 140
        oscGain.gain.value = 0.012
        const oscLfo = ctx.createOscillator()
        const oscLfoGain = ctx.createGain()
        oscLfo.frequency.value = 2.2
        oscLfoGain.gain.value = 40
        oscLfo.connect(oscLfoGain)
        oscLfoGain.connect(osc.frequency)

        noise.connect(filter)
        filter.connect(gain)
        osc.connect(oscGain)
        oscGain.connect(gain)
        gain.connect(analyser)

        noise.start()
        osc.start()
        lfo.start()
        lfo2.start()
        oscLfo.start()

        audioCtxRef.current = ctx
        analyserRef.current = analyser
        streamRef.current = null
        pitchBaselineRef.current = 0
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
      audioBandsRef.current = [0, 0, 0, 0, 0]
      speechFeaturesRef.current = emptySpeechFeatures()
      pitchBaselineRef.current = 0
      setAudioActiveRaw(false)
      setMicStatus("idle")
    }
  }

  useEffect(() => {
    if (!audioActive) return
    const freqBuf = new Uint8Array(analyserRef.current?.frequencyBinCount ?? FFT_SIZE / 2)
    const timeBuf = new Uint8Array(FFT_SIZE)
    const bandCount = audioBandsRef.current.length
    const bandSmooth = new Array(bandCount).fill(0)
    const speechBandSmooth = new Array(SPEECH_BAND_COUNT).fill(0)
    let smoothLevel = 0
    let smoothEnergy = 0
    let smoothCentroid = 0
    let smoothVoiced = 0
    let silenceAge = 0
    let lastTs = performance.now()

    const poll = (ts) => {
      audioRafRef.current = requestAnimationFrame(poll)
      const an = analyserRef.current
      const ctx = audioCtxRef.current
      if (!an || !ctx) return

      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts

      an.getByteFrequencyData(freqBuf)
      an.getByteTimeDomainData(timeBuf)

      // ── Overall level (legacy, for square modes) ──────────────────────────
      let freqSum = 0
      for (let i = 0; i < freqBuf.length; i++) freqSum += freqBuf[i] * freqBuf[i]
      const freqRms = Math.sqrt(freqSum / freqBuf.length) / 255
      const attack = 0.35
      const release = 0.08
      smoothLevel = freqRms > smoothLevel
        ? smoothLevel + (freqRms - smoothLevel) * attack
        : smoothLevel + (freqRms - smoothLevel) * release
      audioLevelRef.current = Math.min(1, smoothLevel * 2.5)

      const binsPerBand = Math.max(1, Math.floor(freqBuf.length / bandCount))
      for (let b = 0; b < bandCount; b++) {
        const start = b * binsPerBand
        const end = b === bandCount - 1 ? freqBuf.length : start + binsPerBand
        let bandSum = 0
        for (let i = start; i < end; i++) bandSum += freqBuf[i] * freqBuf[i]
        const bandRms = Math.sqrt(bandSum / (end - start)) / 255
        bandSmooth[b] = bandRms > bandSmooth[b]
          ? bandSmooth[b] + (bandRms - bandSmooth[b]) * attack
          : bandSmooth[b] + (bandRms - bandSmooth[b]) * release
        audioBandsRef.current[b] = Math.min(1, bandSmooth[b] * 3)
      }

      // ── Speech energy (time-domain RMS, fast attack / slow decay) ─────────
      let timeSum = 0
      for (let i = 0; i < timeBuf.length; i++) {
        const v = (timeBuf[i] - 128) / 128
        timeSum += v * v
      }
      const rawEnergy = Math.min(1, Math.sqrt(timeSum / timeBuf.length) * 4.5)
      const eAttack = 0.55
      const eRelease = 0.06
      smoothEnergy = rawEnergy > smoothEnergy
        ? smoothEnergy + (rawEnergy - smoothEnergy) * eAttack
        : smoothEnergy + (rawEnergy - smoothEnergy) * eRelease

      // ── Silence state ────────────────────────────────────────────────────
      if (smoothEnergy < SILENCE_THRESHOLD) {
        silenceAge += dt * 1000
      } else {
        silenceAge = 0
      }
      const isSilent = silenceAge >= SILENCE_HOLD_MS

      // ── Pitch + rolling speaker baseline ─────────────────────────────────
      const pitchHz = estimatePitchHz(timeBuf, ctx.sampleRate)
      let pitchNorm = 0
      if (pitchHz > 0 && !isSilent) {
        if (pitchBaselineRef.current <= 0) {
          pitchBaselineRef.current = pitchHz
        } else {
          pitchBaselineRef.current += (pitchHz - pitchBaselineRef.current) * BASELINE_ALPHA
        }
        const baseline = pitchBaselineRef.current || pitchHz
        // Map ±0.5 octaves around baseline to roughly [-1, 1]
        pitchNorm = Math.max(-1, Math.min(1, Math.log2(pitchHz / baseline) / 0.5))
      }

      // ── Spectral centroid in speech band (~85Hz–8kHz) ────────────────────
      const nyquist = ctx.sampleRate / 2
      const binHz = nyquist / freqBuf.length
      const minBin = Math.max(1, Math.floor(85 / binHz))
      const maxBin = Math.min(freqBuf.length - 1, Math.floor(8000 / binHz))
      let weightedSum = 0
      let magSum = 0
      for (let i = minBin; i <= maxBin; i++) {
        const mag = freqBuf[i]
        weightedSum += mag * i * binHz
        magSum += mag
      }
      const rawCentroid = magSum > 1 ? weightedSum / magSum : 1000
      // Normalize ~200Hz–4000Hz → 0–1
      const centroidNorm = Math.max(0, Math.min(1, (rawCentroid - 200) / 3800))
      smoothCentroid += (centroidNorm - smoothCentroid) * 0.2

      // ── Voiced vs unvoiced ────────────────────────────────────────────────
      const zcr = zeroCrossingRate(timeBuf)
      // Low ZCR + detectable pitch → voiced; high ZCR → unvoiced/noise
      let rawVoiced = 0
      if (!isSilent && smoothEnergy > SILENCE_THRESHOLD) {
        const pitchBoost = pitchHz > 0 ? 0.55 : 0
        const zcrScore = Math.max(0, 1 - zcr * 8) // ZCR ~0.1+ is noisy
        rawVoiced = Math.max(0, Math.min(1, pitchBoost + zcrScore * 0.55))
        // Bright noisy bursts (sibilants) push toward unvoiced
        if (smoothCentroid > 0.55 && zcr > 0.12) rawVoiced *= 0.35
      }
      smoothVoiced += (rawVoiced - smoothVoiced) * 0.35

      // ── Speech-weighted band envelopes (for particleField) ───────────────
      const speechMinBin = minBin
      const speechMaxBin = maxBin
      const speechBins = speechMaxBin - speechMinBin + 1
      const binsPerSpeechBand = Math.max(1, Math.floor(speechBins / SPEECH_BAND_COUNT))
      const bands = speechFeaturesRef.current.bands
      for (let b = 0; b < SPEECH_BAND_COUNT; b++) {
        const start = speechMinBin + b * binsPerSpeechBand
        const end = b === SPEECH_BAND_COUNT - 1
          ? speechMaxBin + 1
          : speechMinBin + (b + 1) * binsPerSpeechBand
        let bandSum = 0
        const count = Math.max(1, end - start)
        for (let i = start; i < end; i++) bandSum += freqBuf[i] * freqBuf[i]
        const bandRms = Math.sqrt(bandSum / count) / 255
        speechBandSmooth[b] = bandRms > speechBandSmooth[b]
          ? speechBandSmooth[b] + (bandRms - speechBandSmooth[b]) * eAttack
          : speechBandSmooth[b] + (bandRms - speechBandSmooth[b]) * eRelease
        const sens = bandSensitivityRef.current?.[b] ?? 1
        bands[b] = Math.min(1, speechBandSmooth[b] * 3.2 * sens)
      }

      speechFeaturesRef.current = {
        energy: smoothEnergy,
        pitchNorm,
        pitchHz,
        centroid: smoothCentroid,
        voiced: smoothVoiced,
        silence: isSilent,
        silenceAge,
        bands,
      }
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
    audioBandsRef,
    speechFeaturesRef,
    bandSensitivityRef,
  }
}

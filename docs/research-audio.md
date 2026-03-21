# Audio Research: Programmatic Web Audio

Research into using the Web Audio API for programmatic audio generation — composing SFX and music from primitives at runtime, analogous to how we use SVGs for visual assets.

## Web Audio API Core

The API uses a **modular node graph**: source nodes → effect nodes → destination (speakers). Nodes are wired together like a signal chain.

### Source nodes

- **OscillatorNode** — generates sine, square, triangle, sawtooth waveforms (or custom via `PeriodicWave`)
- **AudioBufferSourceNode** — plays decoded audio samples from an in-memory `AudioBuffer`
- **MediaElementAudioSourceNode** — wraps `<audio>`/`<video>` elements
- **ConstantSourceNode** — outputs a constant value (useful for parameter automation)

### Effect/processing nodes

| Node                     | Purpose                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `GainNode`               | Volume control, fades, mixing                                                             |
| `BiquadFilterNode`       | 8 filter types: lowpass, highpass, bandpass, notch, allpass, peaking, lowshelf, highshelf |
| `ConvolverNode`          | Convolution reverb via impulse response buffer                                            |
| `DelayNode`              | Delay line up to ~3 min; combine with feedback GainNode for echo                          |
| `WaveShaperNode`         | Non-linear distortion/saturation via Float32Array shaping curve                           |
| `DynamicsCompressorNode` | Compression with threshold, knee, ratio, attack, release                                  |
| `StereoPannerNode`       | Simple left/right panning (-1 to +1)                                                      |
| `PannerNode`             | Full 3D spatial audio with distance models and HRTF                                       |
| `IIRFilterNode`          | Custom IIR filters with arbitrary coefficients                                            |

### Other key interfaces

- **AudioParam** — automatable parameters with `setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`, `setTargetAtTime`
- **AnalyserNode** — real-time FFT and waveform data for visualization
- **AudioWorklet** — custom DSP on a dedicated audio thread (can use WASM)
- **OfflineAudioContext** — render audio to buffer without real-time playback

### Scheduling

`audioContext.currentTime` provides a high-precision clock. You schedule events ahead of time so the audio thread processes them without gaps, even if the main thread is busy rendering. Far more accurate than `setTimeout`/`setInterval`.

---

## Sample-Based Synthesis

Load individual note samples and compose SFX/music programmatically.

1. **Fetch and decode** audio files into `AudioBuffer` objects (`fetch()` + `audioContext.decodeAudioData()`)
2. **Create an `AudioBufferSourceNode`** per playback instance, assign the shared buffer
3. **Schedule playback** with `source.start(when, offset, duration)` on the audio clock
4. **Pitch-shift** via `playbackRate` to cover notes between available samples
5. **Route through effects** by connecting source → filter → reverb → gain → destination

Key details:

- `AudioBufferSourceNode` is **single-use** — after `start()`, create a new one (the underlying `AudioBuffer` is reusable and cheap)
- You can load one octave and pitch-shift to cover the full range, or one sample per note for higher fidelity
- Many notes can be scheduled ahead of time for sample-accurate sequencing

---

## Chiptune / Retro Synthesis (Zero Assets)

The Web Audio API can generate retro game sounds purely from oscillators with no samples at all.

- **NES emulation**: 2 pulse wave channels + 1 triangle + 1 noise. Square + triangle oscillators cover the melodic channels; a buffer filled with random values covers noise.
- **ADSR envelopes**: automate `GainNode.gain` with `setValueAtTime` + `linearRampToValueAtTime` + `exponentialRampToValueAtTime`
- **Arpeggios**: rapidly switch oscillator frequency to simulate chords on a single voice
- **Vibrato/portamento**: automate `OscillatorNode.frequency` with `setTargetAtTime` or LFO modulation

This means a full retro SFX system with literally zero audio files — everything generated at runtime.

---

## Soundfont Approach

Load a soundfont (instrument sample bank) and play arbitrary notes, chords, and melodies from any General MIDI instrument.

### Libraries

**smplr** (actively maintained, modern)

- Instruments: `SplendidGrandPiano`, `Soundfont` (any GM instrument), `DrumMachine`, custom `Sampler`
- Two soundfont kits: MusyngKite (better quality, larger) and FluidR3_GM
- Samples hosted on CDN — zero server setup
- TypeScript support, built-in reverb
- [github.com/danigb/smplr](https://github.com/danigb/smplr)

**WebAudioFont** (956 GitHub stars)

- Full GM instrument set (128+ instruments, drum kits) from multiple soundfonts
- Includes chord and strum helpers (`queueChord`, `queueStrumUp`, `queueStrumDown`)
- Instruments loaded as JS files from CDN
- [github.com/surikov/webaudiofont](https://github.com/surikov/webaudiofont)

---

## Library Comparison

### Tone.js — music creation framework

14.7K GitHub stars, 198K weekly npm downloads. The strongest option for programmatic audio.

What it adds over raw Web Audio API:

- Built-in synths: Synth, FMSynth, AMSynth, NoiseSynth, PolySynth, MonoSynth, MetalSynth, PluckSynth
- Built-in effects: Distortion, FeedbackDelay, Reverb, Chorus, Phaser, Tremolo, Vibrato, PitchShift, AutoFilter, AutoPanner, AutoWah, BitCrusher, Chebyshev, FrequencyShifter
- `Transport` system for tempo-synced scheduling with musical time notation (`"4n"` = quarter note, `"8t"` = eighth triplet)
- `Tone.Sampler` — load note samples, auto-pitch-shifts to fill gaps, inherently polyphonic
- `Tone.Sequence`, `Tone.Part`, `Tone.Loop` for pattern-based composition
- `Tone.Draw` for syncing visuals to audio events
- [tonejs.github.io](https://tonejs.github.io/)

### Howler.js — playback library

25K GitHub stars, 700K weekly npm downloads. 7KB gzipped.

- Web Audio API with HTML5 Audio fallback
- Audio sprites, spatial audio, caching, codec detection
- Simple play/pause/seek/fade API
- **Does NOT support** synthesis, oscillators, or programmatic note generation — purely playback
- Best for: playing pre-made sound effects and music files with max cross-browser reliability
- [howlerjs.com](https://howlerjs.com/)

### Others

- **Pizzicato.js** — simpler Web Audio wrapper with built-in effects, less maintained
- **Wad.js** — simplified synthesis, jQuery-like API
- **TinyMusic** — minimal sequencer/synth (very lightweight)
- **Band.js** — music composition API with multiple instruments and time signatures

---

## Three Tiers of Audio Generation

| Tier           | Approach                                          | Use case                                           | Assets needed                     |
| -------------- | ------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| Pure synthesis | Oscillators + envelopes + effects                 | UI clicks, chiptune SFX, retro music, laser sounds | Zero — purely math                |
| Sample-based   | Load note/hit samples, schedule + pitch + effects | Realistic instruments, complex SFX, composed music | Small set of wav/mp3 samples      |
| Soundfont      | Load a General MIDI instrument bank               | Full orchestra, any standard instrument            | Soundfont files (loaded from CDN) |

All three can be mixed freely in the same audio graph.

---

## Performance

- **No hard limit** on simultaneous voices — hundreds of concurrent sounds work fine
- `AudioBufferSourceNode` playback is very cheap (pre-decoded PCM, mixed natively)
- AudioWorklet runs on a dedicated audio thread, separate from main thread
- **Heaviest nodes**: `ConvolverNode` (reverb) and `PannerNode` with HRTF — use sparingly or prefer lighter alternatives (`StereoPannerNode`, algorithmic reverb)
- Tips: set `latencyHint: "playback"` for music-heavy games, schedule events as far in advance as possible, use `DynamicsCompressorNode` on master output to prevent clipping, suspend audio context when tab is backgrounded

---

## Gotchas

### Autoplay policy (the biggest one)

All modern browsers require `AudioContext` to be created or resumed inside a user gesture (click, tap, keypress). A context created outside a gesture starts in `"suspended"` state. Standard pattern: create early, call `audioContext.resume()` inside a click handler. A game start screen button naturally solves this.

### Mobile

- iOS Safari and Chrome for Android strictly enforce autoplay restrictions
- Memory is limited — batch-load samples, use smaller/compressed formats
- Some older mobile browsers have higher latency (~100–300ms)

### Other

- **CORS**: fetching cross-origin audio files requires proper headers
- **No built-in MIDI file playback**: need a library (Tone.js or a MIDI parser) to read MIDI and schedule notes
- **AudioParam method precedence**: automation methods override direct `.value` assignments — be consistent
- **Safari**: historically lags on Web Audio features; `standardized-audio-context` npm package provides a polyfill

---

## Potential Architecture for Ascension

Analogous to how operator appearances are structured data pointing at SVG parts, sounds could be structured data describing sample selection, pitch, timing, and effect chains. The audio engine interprets that data at runtime.

| Audio category                                   | Approach                                                            | Notes                             |
| ------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------- |
| UI feedback (clicks, hovers, transitions)        | Pure oscillator synthesis                                           | Zero assets, instant, lightweight |
| Gameplay SFX (contractor actions, bodega events) | Small sample set + effects chains, defined as data                  | Similar to SVG part definitions   |
| Ambient atmosphere                               | ConvolverNode reverb + filtered noise + slow oscillator drones      | Generated at runtime              |
| Music                                            | Transport + Sampler/Synth sequencing, compositions as JSON patterns | Data-driven, not pre-rendered     |

### Recommended primary library

**Tone.js** — wraps the Web Audio API with exactly the music/composition abstractions needed, while still giving raw access when needed. Covers synthesis, sampling, effects, scheduling, and transport in one package.

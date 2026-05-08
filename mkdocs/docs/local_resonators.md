# Local Resonators

A local acoustic resonator can be a side branch or cavity attached to a main tube.

```text
main tube ─────┬─────
               │
               │ L
               │
            closed end
```

The branch stores acoustic energy near its resonance. Around that frequency, the branch behaves like a sound trap and can reduce sound transmission.

For a closed side branch, the simplest estimate is the quarter-wave resonance:

\[
f_\text{res} \approx \frac{c}{4L}
\]

## Design intuition

- Longer branch → lower resonant frequency.
- Shorter branch → higher resonant frequency.
- More resonators → deeper transmission dip.
- Higher loss → less sharp resonance, often less amplification.

Example: if \(L = 0.086\,\text{m}\),

\[
f_\text{res} \approx \frac{343}{4(0.086)} \approx 997\,\text{Hz}
\]

# Local Resonators

A local acoustic resonator can be a side branch attached to a main tube.

```text
main tube ─────┬─────
               │
               │  L_r
               │
```

The branch stores acoustic energy near its resonance. Around that frequency, the branch behaves like a sound trap and can reduce sound transmission.

For a closed side branch, the simplest estimate is the quarter-wave resonance:

\[
f_\text{res} \approx \frac{c}{4L_r}
\]

## Geometry meaning

The app now uses geometry controls instead of abstract strength sliders:

- \(L_r\): resonator length
- \(W_r\): resonator width
- \(W_n\): neck width connecting the branch to the main pipe

### Design intuition

- Longer branch \(L_r\) → lower resonant frequency.
- Shorter branch \(L_r\) → higher resonant frequency.
- Wider neck \(W_n\) → stronger coupling to the main pipe.
- Wider branch \(W_r\) → larger local resonator region.
- More resonators → deeper transmission dip.
- Higher loss → less sharp resonance, often less amplification.

## Example

If \(L_r = 0.086\,\text{m}\),

\[
f_\text{res} \approx \frac{343}{4(0.086)} \approx 997\,\text{Hz}
\]

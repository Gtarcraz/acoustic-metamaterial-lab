# App Model

The app uses a deliberately simple model so that students can see how each design parameter changes the result.

## Transmission

The plotted transmission is

\[
T(f) = \frac{|p_\text{out}(f)|}{|p_\text{in}(f)|}
\]

Low \(T\) means the design blocks that frequency. A value above 1 means the simplified model predicts amplification near resonance.

## Bragg stop band

The Bragg dip is modeled as a broad Gaussian attenuation centered at

\[
f_B = \frac{c}{2a}
\]

## Local resonance stop band

The local resonator dip is modeled as a Lorentzian-like attenuation centered at

\[
f_R = \frac{c}{4L}
\]

The sharpness is controlled by \(Q\). Larger \(Q\) gives a sharper resonance.

## Repetition

Both mechanisms are strengthened by the number of repeated unit cells.

!!! warning
    This app is not a replacement for transfer-matrix methods, FEM, BEM, or experimental measurement. It is a teaching model for design intuition.

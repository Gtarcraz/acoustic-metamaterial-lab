# App Model

The app uses a deliberately simple model so that students can see how each design parameter changes the result.

## Transmission

The plotted transmission is

\[
T(f) = \frac{|p_\text{out}(f)|}{|p_\text{in}(f)|}
\]

Low \(T\) means the design blocks that frequency. A value above 1 means the simplified model predicts amplification near resonance.

## Bragg stop band

The Bragg dip is centered at

\[
f_B = \frac{c}{2a}
\]

where \(a\) is the unit-cell period. In the app, the **pipe width modulation** controls how strong the Bragg effect is:

- larger contrast between wide and narrow sections → stronger Bragg reflection,
- more repeated cells → deeper stop band.

## Local resonance stop band

The local side-branch resonance is centered at

\[
f_R = \frac{c}{4L_r}
\]

where \(L_r\) is the branch length.

In the app, the coupling strength is controlled geometrically instead of by an abstract Q-factor slider:

- **neck width \(W_n\)** controls how strongly the branch couples to the main pipe,
- **resonator width \(W_r\)** changes the size of the side branch,
- **loss** broadens and weakens the resonance.

## Visualization model

The main tube is colored by the instantaneous pressure field:

\[
p(x,t) = A(x)\sin(kx-\omega t)
\]

- red = compression (positive pressure),
- blue = rarefaction (negative pressure).

The envelope \(A(x)\) decreases along the tube when the transmission is small.

The local resonators are shown with their **actual displayed length and width** so students can connect the geometry to the design equations.

!!! warning
    This app is not a replacement for transfer-matrix methods, FEM, BEM, or experimental measurement. It is a teaching model for design intuition.

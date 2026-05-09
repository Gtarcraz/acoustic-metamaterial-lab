# Bragg Scattering

Bragg scattering occurs when waves encounter a repeated structure.

## Reflection at every pipe-width switch

In a duct,

\[
Z = \frac{\rho c}{A}
\]

At a width step,

\[
R = \frac{Z_2-Z_1}{Z_2+Z_1}
\]

So yes: physically, reflection happens at **every** wide-to-narrow and narrow-to-wide transition.

## Bragg condition

\[
a \approx \frac{\lambda}{2}
\]

Using \(\lambda=c/f\),

\[
f_\text{Bragg}\approx\frac{c}{2a}
\]

## Design intuition

- Larger period \(a\) blocks lower frequencies.
- Larger width contrast gives stronger reflections.
- More cells give a deeper stop band.
- The upgraded app includes repeated reflections by cascading transfer matrices.

## App geometry convention

The app does not treat one unit cell as a single pipe segment. Instead:

- 0 cells means no constriction, only the large pipe.
- 1 cell means one narrow constriction between large pipe ends.
- N cells means N constrictions, with a large pipe section at both the start and end.

This avoids the confusing case where a single cell ends in a narrow pipe and creates an output mismatch. The microphone side is always the large pipe and is matched to that large-pipe impedance.

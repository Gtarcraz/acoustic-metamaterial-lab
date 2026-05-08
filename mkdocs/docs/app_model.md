# App Model

The app now uses a **1D acoustic transfer-matrix model**.

## Transmission

\[
T(f) = \frac{|p_\text{out}(f)|}{|p_\text{in}(f)|}
\]

The transfer-matrix form estimates transmission using

\[
S_{21} =
\frac{2}{A + B/Z_0 + CZ_0 + D}
\]

where \(A,B,C,D\) come from the total matrix.

## Width and pressure

\[
Z = \frac{\rho c}{A}
\]

and

\[
p = ZU
\]

so for the same volume velocity \(U\), a narrower duct creates a larger pressure swing.

At a step,

\[
R = \frac{Z_2-Z_1}{Z_2+Z_1}
\]

This is why every width switch reflects part of the wave.

## Bragg scattering

\[
f_B \approx \frac{c}{2a}
\]

where \(a\) is the period.

## Local resonator shunt

The side branch is a shunt admittance:

\[
Y_b=\frac{1}{Z_b}
\]

\[
S_b =
\begin{bmatrix}
1 & 0 \\
Y_b & 1
\end{bmatrix}
\]

The app computes \(Z_b\) from a neck section and a closed side branch section.

## Visualization

Red means compression and blue means rarefaction. The pressure envelope is estimated using prefix transfer matrices.

# Transfer Matrix Model

The upgraded app uses a 1D acoustic transfer-matrix model.

## State vector

\[
\mathbf{x} =
\begin{bmatrix}
p \\
U
\end{bmatrix}
\]

where \(p\) is acoustic pressure and \(U\) is volume velocity.

## Characteristic impedance

\[
Z = \frac{\rho c}{A}
\]

A narrower pipe has smaller area \(A\), so it has larger acoustic impedance.

## Propagation matrix

For a uniform duct section of length \(d\),

\[
P(d) =
\begin{bmatrix}
\cos(kd) & jZ\sin(kd) \\
j\frac{1}{Z}\sin(kd) & \cos(kd)
\end{bmatrix}
\]

with

\[
k = \frac{2\pi f}{c}
\]

## Reflection at every width step

At a width step,

\[
R = \frac{Z_2 - Z_1}{Z_2 + Z_1}
\]

The app does not manually add one reflection coefficient at a time. Instead, it cascades duct sections with different \(Z\). The reflections from every wide-to-narrow and narrow-to-wide transition are naturally included.

## Side branch as shunt impedance

The branch input impedance is computed from the branch transfer matrix

\[
M_b =
\begin{bmatrix}
A_b & B_b \\
C_b & D_b
\end{bmatrix}
\]

For a closed branch end, \(U_\text{end}=0\), so

\[
Z_b = \frac{A_b}{C_b}
\]

and

\[
Y_b = \frac{1}{Z_b}
\]

The shunt matrix is

\[
S_b =
\begin{bmatrix}
1 & 0 \\
Y_b & 1
\end{bmatrix}
\]

## Unit cell and total matrix

\[
M_\text{cell} = P_1 S_b P_2 P_3 P_4
\]

For \(N\) cells,

\[
M_\text{total}=M_\text{cell}^{N}
\]

## Transmission

For

\[
M =
\begin{bmatrix}
A & B \\
C & D
\end{bmatrix}
\]

the app estimates

\[
S_{21} =
\frac{2}{A + B/Z_0 + CZ_0 + D}
\]

and plots

\[
T(f)=|S_{21}(f)|
\]

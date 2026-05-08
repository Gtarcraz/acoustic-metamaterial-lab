# Local Resonators

A local acoustic resonator can be a side branch attached to the main tube.

## Quarter-wave estimate

\[
f_\text{res} \approx \frac{c}{4L_r}
\]

This is a first design estimate.

## Better branch impedance model

For a closed side branch,

\[
Z_\text{branch} \approx -j Z_r \cot(kL_r)
\]

The app uses a neck plus branch matrix. If

\[
M_b =
\begin{bmatrix}
A_b & B_b \\
C_b & D_b
\end{bmatrix}
\]

and the branch is closed at the end, \(U_\text{end}=0\), then

\[
Z_b=\frac{A_b}{C_b}
\]

The shunt admittance is

\[
Y_b=\frac{1}{Z_b}
\]

and the shunt matrix is

\[
S_b=
\begin{bmatrix}
1&0\\
Y_b&1
\end{bmatrix}
\]

This is the acoustic analog of a shunt LC resonator in an EM transmission line.

## Geometry meaning

- \(L_r\): resonator length
- \(W_r\): resonator width
- \(W_n\): neck width
- wider neck \(W_n\) means stronger coupling
- longer branch \(L_r\) means lower resonance

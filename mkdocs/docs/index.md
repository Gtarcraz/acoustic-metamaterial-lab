# Acoustic Metamaterial Lab

This documentation explains the model used in the **Acoustic Metamaterial Lab** web app.

The app is designed for classroom use. It is not a full CFD/FEM acoustic solver. Instead, it is a transparent teaching model for three ideas:

1. sound is a **longitudinal pressure wave**,
2. **Bragg scattering** can create stop bands using repeated spacing,
3. **local resonators** can create compact stop bands using tuned cavities.

The app is useful for students because the design controls map directly to simple physical estimates:

\[
f_\text{Bragg} \approx \frac{c}{2a}
\]

\[
f_\text{res} \approx \frac{c}{4L}
\]

where \(c\) is the speed of sound, \(a\) is the cell spacing, and \(L\) is the side-branch length.

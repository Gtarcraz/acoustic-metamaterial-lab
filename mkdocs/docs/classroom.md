# Classroom Activity

## Challenge

Design a 1D acoustic metamaterial tube that blocks a target frequency.

Suggested target frequencies:

- 500 Hz
- 800 Hz
- 1000 Hz
- 1500 Hz

## Student workflow

1. Choose a target frequency.
2. Estimate the Bragg spacing:

   \[
   a \approx \frac{c}{2f}
   \]

3. Estimate the quarter-wave branch length:

   \[
   L \approx \frac{c}{4f}
   \]

4. Use the app to compare:
   - Bragg only,
   - local resonator only,
   - hybrid Bragg + local resonator.

5. Record the design code.
6. Explain which mechanism caused the deepest dip.

## Example for 1 kHz

For \(f = 1000\,\text{Hz}\),

\[
a \approx \frac{343}{2(1000)} = 0.1715\,\text{m}
\]

So the Bragg spacing is about **17 cm**.

For a side branch,

\[
L \approx \frac{343}{4(1000)} = 0.08575\,\text{m}
\]

So the side branch length is about **8.6 cm**.


## QR code access

The app includes a QR code for classroom access. After deployment, students can scan the QR code to open:

```text
https://gtarcraz.github.io/acoustic-metamaterial-lab/
```

If your GitHub username or repository name changes, regenerate the QR code using the new GitHub Pages URL.

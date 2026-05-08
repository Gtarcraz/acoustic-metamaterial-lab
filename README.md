# Acoustic Metamaterial Lab

A React + Vite classroom simulator for longitudinal sound waves, Bragg scattering, and local acoustic resonators.

## Features

- Longitudinal pressure-wave animation
- Bragg scattering controls
- Quarter-wave local resonator controls
- Pressure amplitude over distance plot
- Transmission vs frequency sweep
- Real-world acoustic application image
- Built-in link to MkDocs theory documentation

## Run locally

```bash
npm install
npm run dev
```

## Theory docs locally

```bash
cd mkdocs
pip install mkdocs mkdocs-material
mkdocs serve
```

## GitHub Pages hosting

The included workflow builds the Vite app, builds the MkDocs theory site, copies the docs into `dist/docs`, and deploys everything to GitHub Pages.

If your repository name is not `acoustic-metamaterial-lab`, update `base` in `vite.config.js`.

## Documentation

```text
https://gtarcraz.github.io/acoustic-metamaterial-lab/docs/
```

## Classroom QR Code

Live app URL after deployment:

```text
https://gtarcraz.github.io/acoustic-metamaterial-lab/
```

QR code image path in the repo:

```text
public/images/qr-acoustic-metamaterial-lab.png
```

![QR code for Acoustic Metamaterial Lab](public/images/qr-acoustic-metamaterial-lab.png)

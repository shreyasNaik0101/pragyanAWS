# CyberSpark Promo — slide assets

Drop the 5 website screenshots here with these exact filenames:

- `slide1.png` — Home (Be Job Ready)
- `slide2.png` — Learning Paths
- `slide3.png` — Consulting / Network Analysis
- `slide4.png` — Corporate Offerings
- `slide5.png` — Resources / Knowledge Base

The composition will pick them up automatically via `staticFile()`.
If a file is missing the corresponding section still renders with a styled placeholder card.

## Render

```bash
cd remotion-service
npm run preview                          # interactive studio
npx remotion render src/remotion/index.ts CyberSparkPromo out/cyberspark.mp4
```

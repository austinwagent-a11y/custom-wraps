# A&D Wrap Generator

Working finish of the [Grok wrap studio](https://comet-bamboo-falcon-apple.grok.me) for A&D, LLC.

Configure Cybertruck AWD Premium or Model 3 Standard wraps, preview in 3D, then export a Tesla Paint Shop PNG (under 1 MB) for phone-key or USB upload.

## Run locally

```bash
cd studio
npm install
npm run dev
```

Open the printed local URL.

## Build

```bash
npm run build
npm run preview
```

## What’s fixed vs the Grok prototype

| Area | Grok live app | This studio |
| --- | --- | --- |
| Film → 3D preview | Often disconnected | Live color / pattern / custom art |
| Cybertruck / Model 3 toggle | Model 3 dead | Both GLBs load and switch |
| Glass / lights | Body color bled onto glass | Separate paint / glass / light materials |
| Categories | Graphic / OEM missing or hidden | All, Hers, Color, Tactical, Signature, Graphic, OEM |
| Yours / Tune | No visible response | Custom upload + finish / coverage |
| Send to truck / phone | Unclear | Builds Paint Shop PNG + download / share |

## Paint Shop export

- Cybertruck: 1024×768 PNG using `/paintshop/mask.png`
- Model 3: 1024×1024 PNG using `/paintshop/model3-mask.png`
- Official Tesla example wraps download as-is for Cybertruck when selected

Upload path: Tesla app → Creations → Wrap → Upload (app 4.59+), or USB `Wraps/` folder → Toybox → Paint Shop → Wraps.

## Notes

- 3D assets and film lookbook images were recovered from the Grok build for continuity.
- Cybertruck body paint uses a custom wrap shader with coverage bands (full / two-tone / lower / roof).
- Designs are previews. Follow Tesla’s official wrap requirements before production.

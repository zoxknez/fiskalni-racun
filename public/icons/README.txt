iOS Touch Icons - Production Guide
===================================

Current Setup:
- SVG icons are used as fallback
- For production, convert to PNG for better iOS compatibility

How to Generate PNG Icons:
--------------------------

Option 1: Online Tools
1. Upload public/apple-touch-icon.svg to https://realfavicongenerator.net/
2. Download generated PNG files
3. Place in public/ directory:
   - apple-touch-icon-180x180.png
   - apple-touch-icon-152x152.png
   - apple-touch-icon-120x120.png

Option 2: ImageMagick (CLI)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# Convert SVG to PNG
magick public/apple-touch-icon.svg -resize 180x180 public/apple-touch-icon-180.png
magick public/apple-touch-icon.svg -resize 152x152 public/apple-touch-icon-152.png
magick public/apple-touch-icon.svg -resize 120x120 public/apple-touch-icon-120.png
```

Option 3: Node Script
```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

After generating PNG icons:
--------------------------
Update index.html:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120.png" />
```

SVG fallback works but PNG is recommended for iOS!


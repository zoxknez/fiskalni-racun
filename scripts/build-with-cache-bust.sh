#!/bin/bash
# Build script sa cache busting

echo "🔧 Building Fiskalni Račun with cache busting..."

# 1. Obrisi stari dist
rm -rf dist

# 2. Generiši BUILD_TIME timestamp
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "📅 Build timestamp: $BUILD_TIME"

# 3. Build sa VITE_BUILD_VERSION
export VITE_BUILD_VERSION="$BUILD_TIME"
export BUILD_TIME="$BUILD_TIME"

# 4. Pokreni build
npm run build

# 5. Prikaži verziju u package.json-u
echo ""
echo "✅ Build completed successfully!"
echo "📦 Version info:"
node -e "console.log('Build Time:', process.env.BUILD_TIME)"

# 6. Prikaži info o cache busting
echo ""
echo "🔄 Cache busting strategy:"
echo "   - All JS/CSS files have unique [hash] in filename"
echo "   - Service Worker cleans up outdated caches on activation"
echo "   - index.html detects and clears old caches on load"
echo "   - PWA update notification triggers aggressive refresh"
echo ""
echo "📊 Bundle info available at: dist/stats.html"

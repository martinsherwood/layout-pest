#!/bin/bash

# Create images directory if it doesn't exist
mkdir -p src/images

# Convert SVG to PNG in different sizes with high quality and transparency
magick convert -background none -density 1200 -quality 100 -define png:compression-level=9 -resize 16x16 src/images/source_icon.svg src/images/icon16.png
magick convert -background none -density 1200 -quality 100 -define png:compression-level=9 -resize 48x48 src/images/source_icon.svg src/images/icon48.png
magick convert -background none -density 1200 -quality 100 -define png:compression-level=9 -resize 128x128 src/images/source_icon.svg src/images/icon128.png

# Create dark mode versions
magick convert src/images/icon16.png -fill white -colorize 100 src/images/icon16-dark.png
magick convert src/images/icon48.png -fill white -colorize 100 src/images/icon48-dark.png
magick convert src/images/icon128.png -fill white -colorize 100 src/images/icon128-dark.png

echo "Icon conversion complete!"

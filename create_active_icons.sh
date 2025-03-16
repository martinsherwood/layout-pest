#!/bin/bash

# Create active versions of the icons with a bright green overlay
cd src/images

# Create active versions for each size with a bright, saturated green
magick convert icon_16.png -fill "#42D777" -tint 100 icon_16_active.png
magick convert icon_48.png -fill "#42D777" -tint 100 icon_48_active.png
magick convert icon_128.png -fill "#42D777" -tint 100 icon_128_active.png

echo "Active icons created!"

#!/bin/bash

# Build script for Layout Pest extension

echo "Building Layout Pest extension..."

# Create build directory
mkdir -p build

# Clean previous build
rm -rf build/*

# Copy source files to build directory
cp -r src/* build/

# Create zip package
cd build
zip -r ../layout-pest.zip *
cd ..

echo "Build complete. Layout Pest extension package created as layout-pest.zip"

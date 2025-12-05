#!/bin/bash

# TopoSonics Android OpenCV Setup Script
# This script downloads and configures the OpenCV Android SDK for native image processing

set -e  # Exit on error

# Configuration
OPENCV_VERSION="4.10.0"
OPENCV_DOWNLOAD_URL="https://github.com/opencv/opencv/releases/download/${OPENCV_VERSION}/opencv-${OPENCV_VERSION}-android-sdk.zip"
PACKAGE_DIR="packages/native-image-processing"
LIBS_DIR="${PACKAGE_DIR}/android/libs"
OPENCV_DIR="${LIBS_DIR}/opencv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TopoSonics OpenCV Android SDK Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if OpenCV is already installed
if [ -d "$OPENCV_DIR" ]; then
    echo -e "${YELLOW}OpenCV Android SDK already exists at ${OPENCV_DIR}${NC}"
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Skipping OpenCV installation.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}Removing existing OpenCV installation...${NC}"
    rm -rf "$OPENCV_DIR"
fi

# Create libs directory if it doesn't exist
echo -e "${GREEN}Creating libs directory...${NC}"
mkdir -p "$LIBS_DIR"

# Download OpenCV Android SDK
echo -e "${GREEN}Downloading OpenCV ${OPENCV_VERSION} Android SDK...${NC}"
TEMP_ZIP="${LIBS_DIR}/opencv-android-sdk.zip"

if command -v curl &> /dev/null; then
    curl -L -o "$TEMP_ZIP" "$OPENCV_DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
    wget -O "$TEMP_ZIP" "$OPENCV_DOWNLOAD_URL"
else
    echo -e "${RED}Error: Neither curl nor wget found. Please install one of them.${NC}"
    exit 1
fi

# Verify download
if [ ! -f "$TEMP_ZIP" ]; then
    echo -e "${RED}Error: Failed to download OpenCV SDK${NC}"
    exit 1
fi

# Extract OpenCV SDK
echo -e "${GREEN}Extracting OpenCV SDK...${NC}"
unzip -q "$TEMP_ZIP" -d "$LIBS_DIR"

# Rename extracted directory to 'opencv'
EXTRACTED_DIR="${LIBS_DIR}/OpenCV-android-sdk"
if [ -d "$EXTRACTED_DIR" ]; then
    mv "$EXTRACTED_DIR" "$OPENCV_DIR"
else
    echo -e "${RED}Error: Extracted directory not found${NC}"
    exit 1
fi

# Clean up zip file
echo -e "${GREEN}Cleaning up...${NC}"
rm "$TEMP_ZIP"

# Verify installation
if [ -d "${OPENCV_DIR}/sdk/native/libs" ] && [ -d "${OPENCV_DIR}/sdk/native/jni/include" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ OpenCV Android SDK installed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Location: ${OPENCV_DIR}"
    echo -e "Version: ${OPENCV_VERSION}"
    echo ""
    echo -e "${GREEN}Available architectures:${NC}"
    ls -1 "${OPENCV_DIR}/sdk/native/libs"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Run: ${GREEN}cd apps/mobile && pnpm install${NC}"
    echo -e "2. Run: ${GREEN}npx expo prebuild --platform android${NC}"
    echo -e "3. Open Android Studio and build the project"
    echo ""
else
    echo -e "${RED}Error: OpenCV installation verification failed${NC}"
    echo -e "${RED}Expected directories not found${NC}"
    exit 1
fi

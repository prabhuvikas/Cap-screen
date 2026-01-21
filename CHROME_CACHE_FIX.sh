#!/bin/bash

# Chrome Extension Cache Fix Script
# This script helps completely clear Chrome extension cache

echo "==================================="
echo "Chrome Extension Cache Clear Script"
echo "==================================="
echo ""

# Step 1: Close Chrome
echo "Step 1: Close ALL Chrome windows"
echo "Please close all Chrome windows and press Enter..."
read -p ""

# Step 2: Find Chrome cache location
echo ""
echo "Step 2: Locating Chrome cache directories..."
echo ""

# Linux Chrome paths
CHROME_CONFIG="$HOME/.config/google-chrome"
CHROME_CACHE="$HOME/.cache/google-chrome"

if [ -d "$CHROME_CONFIG" ]; then
    echo "Found Chrome config: $CHROME_CONFIG"

    # Show extension folders
    echo ""
    echo "Chrome Extension folders:"
    find "$CHROME_CONFIG/Default/Extensions" -maxdepth 1 -type d 2>/dev/null | grep -v "Extensions$" | tail -5

    echo ""
    echo "Do you want to remove the Service Worker cache? (y/n)"
    read -p "" REMOVE_SW

    if [ "$REMOVE_SW" = "y" ]; then
        echo "Removing Service Worker cache..."
        rm -rf "$CHROME_CONFIG/Default/Service Worker" 2>/dev/null
        echo "✓ Service Worker cache removed"
    fi

    echo ""
    echo "Do you want to clear the Cache folder? (y/n)"
    read -p "" REMOVE_CACHE

    if [ "$REMOVE_CACHE" = "y" ]; then
        echo "Removing Cache..."
        rm -rf "$CHROME_CACHE/Default/Cache" 2>/dev/null
        rm -rf "$CHROME_CACHE/Default/Code Cache" 2>/dev/null
        echo "✓ Cache cleared"
    fi

else
    echo "Chrome config directory not found at: $CHROME_CONFIG"
fi

echo ""
echo "==================================="
echo "Cache clearing complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Start Chrome"
echo "2. Go to chrome://extensions/"
echo "3. Enable Developer mode"
echo "4. Click 'Load unpacked'"
echo "5. Select: /home/user/Cap-screen"
echo ""

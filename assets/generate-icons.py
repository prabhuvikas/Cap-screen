#!/usr/bin/env python3
"""
Generate placeholder icons for the Chrome Bug Reporter extension
"""

from PIL import Image, ImageDraw
import os

def create_icon(size):
    """Create a bug icon of the specified size"""
    # Create image with blue gradient background
    img = Image.new('RGB', (size, size), color='#3498db')
    draw = ImageDraw.Draw(img)

    # Draw background
    draw.rectangle([(0, 0), (size, size)], fill='#3498db')

    # Calculate bug dimensions
    center_x = size // 2
    center_y = size // 2
    bug_radius = int(size * 0.3)

    # Draw bug body (red circle)
    draw.ellipse(
        [center_x - bug_radius, center_y - bug_radius,
         center_x + bug_radius, center_y + bug_radius],
        fill='#e74c3c'
    )

    # Draw bug head (smaller dark circle)
    head_radius = int(bug_radius * 0.5)
    head_y = center_y - int(bug_radius * 0.7)
    draw.ellipse(
        [center_x - head_radius, head_y - head_radius,
         center_x + head_radius, head_y + head_radius],
        fill='#c0392b'
    )

    # Draw spots on bug
    spot_radius = max(1, size // 16)
    spot_color = '#2c3e50'

    # Left spots
    spot_offset_x = int(bug_radius * 0.5)
    spot_offset_y1 = int(bug_radius * 0.3)
    spot_offset_y2 = -int(bug_radius * 0.3)

    # Left top spot
    draw.ellipse(
        [center_x - spot_offset_x - spot_radius, center_y + spot_offset_y2 - spot_radius,
         center_x - spot_offset_x + spot_radius, center_y + spot_offset_y2 + spot_radius],
        fill=spot_color
    )

    # Left bottom spot
    draw.ellipse(
        [center_x - spot_offset_x - spot_radius, center_y + spot_offset_y1 - spot_radius,
         center_x - spot_offset_x + spot_radius, center_y + spot_offset_y1 + spot_radius],
        fill=spot_color
    )

    # Right top spot
    draw.ellipse(
        [center_x + spot_offset_x - spot_radius, center_y + spot_offset_y2 - spot_radius,
         center_x + spot_offset_x + spot_radius, center_y + spot_offset_y2 + spot_radius],
        fill=spot_color
    )

    # Right bottom spot
    draw.ellipse(
        [center_x + spot_offset_x - spot_radius, center_y + spot_offset_y1 - spot_radius,
         center_x + spot_offset_x + spot_radius, center_y + spot_offset_y1 + spot_radius],
        fill=spot_color
    )

    # Draw center line
    line_width = max(1, size // 32)
    draw.line(
        [center_x, center_y - bug_radius, center_x, center_y + bug_radius],
        fill=spot_color,
        width=line_width
    )

    return img

def main():
    """Generate all icon sizes"""
    sizes = [16, 32, 48, 128]

    # Create icons directory if it doesn't exist
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    # Generate each icon
    for size in sizes:
        img = create_icon(size)
        filename = os.path.join(icons_dir, f'icon{size}.png')
        img.save(filename, 'PNG')
        print(f'Generated {filename}')

    print('\nAll icons generated successfully!')

if __name__ == '__main__':
    main()

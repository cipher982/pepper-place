#!/usr/bin/env python3

from PIL import Image
import os

def create_favicon(input_path, output_path="favicon.ico", sizes=[16, 32, 48, 64, 128, 256]):
    """
    Convert an image to a favicon with multiple sizes and transparent background.
    
    Args:
        input_path: Path to the input image
        output_path: Path to save the favicon
        sizes: List of icon sizes to include in the favicon
    """
    # Open the original image
    img = Image.open(input_path).convert("RGBA")
    
    # Create a transparent mask by identifying white pixels
    # This assumes the white background to remove has RGB values close to (255, 255, 255)
    width, height = img.size
    for x in range(width):
        for y in range(height):
            r, g, b, a = img.getpixel((x, y))
            # If the pixel is white or very light (threshold can be adjusted)
            if r > 240 and g > 240 and b > 240:
                # Set alpha to 0 (transparent)
                img.putpixel((x, y), (r, g, b, 0))
    
    # Create resized versions
    resized_images = []
    for size in sizes:
        resized_img = img.copy()
        resized_img.thumbnail((size, size), Image.Resampling.LANCZOS)
        resized_images.append(resized_img)
    
    # Save images as a multi-size icon file
    resized_images[0].save(
        output_path, 
        format="ICO", 
        sizes=[(img.width, img.height) for img in resized_images],
        append_images=resized_images[1:]
    )
    
    print(f"Favicon created at {output_path}")
    
    # Also create a PNG version for modern browsers
    png_output = os.path.splitext(output_path)[0] + ".png"
    resized_images[-1].save(png_output, format="PNG")
    print(f"PNG version created at {png_output}")

if __name__ == "__main__":
    input_image = "../pepper-passport.jpeg"
    
    if not os.path.exists(input_image):
        print(f"Error: Input file {input_image} not found")
    else:
        create_favicon(input_image)
        
        # Create a directory for web usage examples
        favicon_dir = "favicon"
        os.makedirs(favicon_dir, exist_ok=True)
        
        # Create a larger version for Apple touch icon
        img = Image.open(input_image).convert("RGBA")
        img.thumbnail((180, 180), Image.Resampling.LANCZOS)
        img.save(os.path.join(favicon_dir, "apple-touch-icon.png"), format="PNG")
        
        print("\nTo use the favicon in your HTML, add these lines to your <head> section:")
        print("""
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="favicon.png" type="image/png">
<link rel="apple-touch-icon" href="favicon/apple-touch-icon.png">
        """) 
import cv2
import numpy as np
import os

def process_logo(input_path, output_path):
    # Read the image
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not read {input_path}")
        return

    # Convert to grayscale to use as alpha mask
    # This approach is better for anti-aliasing than simple thresholding
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Invert grayscale: white (255) becomes transparent (0), black (0) becomes opaque (255)
    alpha = 255 - gray
    
    # Ensure background is truly black in the color channels to avoid fringes
    # (Optional: force all pixels to black if you just want a solid icon)
    # img[:] = 0 
    
    # Split color channels
    b, g, r = cv2.split(img)
    
    # Merge to BGRA
    bgra = cv2.merge([b, g, r, alpha])
    
    # Save as PNG
    cv2.imwrite(output_path, bgra)
    print(f"Success: Saved {output_path}")

def main():
    logo_dir = "logo"
    if not os.path.exists(logo_dir):
        print(f"Error: Directory {logo_dir} not found.")
        return

    print(f"Scanning {logo_dir} for jpg files...")
    for filename in os.listdir(logo_dir):
        if filename.lower().endswith(".jpg"):
            input_file = os.path.join(logo_dir, filename)
            output_file = os.path.join(logo_dir, os.path.splitext(filename)[0] + ".png")
            process_logo(input_file, output_file)

if __name__ == "__main__":
    main()

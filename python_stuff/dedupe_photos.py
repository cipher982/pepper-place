#!/usr/bin/env python3
import os
import shutil
from pathlib import Path
import argparse
from datetime import datetime
import imagehash
from PIL import Image
import numpy as np
import pillow_heif
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import cpu_count
from tqdm import tqdm

# Register HEIF/HEIC file extensions with Pillow
pillow_heif.register_heif_opener()

def compute_image_hash(img_path):
    """Compute perceptual hash for a single image."""
    try:
        img = Image.open(img_path)
        # phash works well for slightly shifted images
        h = imagehash.phash(img)
        return str(img_path), str(h)
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return None

def find_similar_images(directory, threshold=5):
    """Find groups of similar images using perceptual hashing."""
    files = []
    hash_dict = {}
    
    # Get all image files, including HEIC/HEIF formats
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG", "*.heic", "*.HEIC", "*.heif", "*.HEIF"]:
        files.extend(Path(directory).glob(ext))
    
    total_files = len(files)
    print(f"Processing {total_files} images...")
    
    # Calculate hashes for all images in parallel
    num_workers = max(1, cpu_count() - 1)  # Leave one CPU free
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        results = list(tqdm(
            executor.map(compute_image_hash, files),
            total=total_files,
            desc="Hashing images",
            unit="img"
        ))
    
    # Process results
    for result in results:
        if result is not None:
            img_path, h_str = result
            if h_str not in hash_dict:
                hash_dict[h_str] = []
            hash_dict[h_str].append(img_path)
    
    # Find all potential duplicates (images with identical or very similar hashes)
    similar_groups = []
    processed_hashes = set()
    
    # Use tqdm for the hash comparison process too
    for h1_str, img_list1 in tqdm(hash_dict.items(), desc="Finding duplicates", unit="hash"):
        if h1_str in processed_hashes:
            continue
            
        current_group = set(img_list1)
        processed_hashes.add(h1_str)
        h1 = imagehash.hex_to_hash(h1_str)
        
        # Find all similar hashes
        for h2_str, img_list2 in hash_dict.items():
            if h2_str in processed_hashes or h2_str == h1_str:
                continue
                
            h2 = imagehash.hex_to_hash(h2_str)
            if h1 - h2 <= threshold:
                current_group.update(img_list2)
                processed_hashes.add(h2_str)
        
        # Add ALL groups to similar_groups, not just those with multiple images
        similar_groups.append(list(current_group))
    
    return similar_groups

# Move process_group outside to make it picklable
def process_group(group_data_with_report_dir):
    """Process a single group of similar images for the HTML report."""
    (i, group), report_dir = group_data_with_report_dir
    
    if len(group) <= 1:
        return ""  # Skip groups with no duplicates
        
    html = f"""
    <div class="group">
        <div class="group-header">Group {i+1}: {len(group)} similar images</div>
        <div class="images">
    """
    
    # The first image is the one we kept
    kept_image = group[0]
    relative_kept_path = os.path.basename(kept_image)
    
    # Convert HEIC to JPG for the report if needed
    report_img_filename = f"group_{i+1}_kept_{os.path.basename(kept_image)}"
    report_img_path = os.path.join(report_dir, report_img_filename)
    
    if kept_image.lower().endswith(('.heic', '.heif')):
        # Convert HEIC to JPG for the report
        img = Image.open(kept_image)
        report_img_path = report_img_path.rsplit('.', 1)[0] + '.jpg'
        img.save(report_img_path, format="JPEG")
    else:
        shutil.copy2(kept_image, report_img_path)
    
    html += f"""
        <div class="image-container">
            <img src="{os.path.basename(report_img_path)}" class="thumbnail kept">
            <div class="filename">{relative_kept_path} (KEPT)</div>
        </div>
    """
    
    # Add all the removed images
    for removed_image in group[1:]:
        relative_removed_path = os.path.basename(removed_image)
        
        # Convert HEIC to JPG for the report if needed
        report_img_filename = f"group_{i+1}_removed_{os.path.basename(removed_image)}"
        report_img_path = os.path.join(report_dir, report_img_filename)
        
        if removed_image.lower().endswith(('.heic', '.heif')):
            # Convert HEIC to JPG for the report
            img = Image.open(removed_image)
            report_img_path = report_img_path.rsplit('.', 1)[0] + '.jpg'
            img.save(report_img_path, format="JPEG")
        else:
            shutil.copy2(removed_image, report_img_path)
        
        html += f"""
            <div class="image-container">
                <img src="{os.path.basename(report_img_path)}" class="thumbnail removed">
                <div class="filename">{relative_removed_path} (REMOVED)</div>
            </div>
        """
    
    html += """
        </div>
    </div>
    """
    return html

def create_html_report(similar_groups, output_dir):
    """Create an HTML report showing duplicate groups."""
    # Create report in current working directory instead of output directory
    report_dir = os.path.join(os.getcwd(), "duplicate_report")
    os.makedirs(report_dir, exist_ok=True)
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Duplicate Images Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .group {{ margin-bottom: 40px; border: 1px solid #ccc; padding: 10px; }}
            .group-header {{ font-weight: bold; margin-bottom: 10px; }}
            .images {{ display: flex; flex-wrap: wrap; }}
            .image-container {{ margin: 5px; text-align: center; }}
            .thumbnail {{ max-width: 200px; max-height: 200px; }}
            .kept {{ border: 3px solid green; }}
            .removed {{ border: 3px solid red; }}
            .filename {{ font-size: 0.8em; max-width: 200px; word-wrap: break-word; }}
        </style>
    </head>
    <body>
        <h1>Duplicate Images Report</h1>
        <p>Generated on: {current_time}</p>
    """
    
    # Only show groups with duplicates
    duplicate_groups = [group for group in similar_groups if len(group) > 1]
    
    # Use concurrent.futures for report generation too
    with ProcessPoolExecutor(max_workers=max(1, cpu_count() - 1)) as executor:
        # Pass report_dir as part of the arguments
        group_data = [((i, group), report_dir) for i, group in enumerate(duplicate_groups)]
        html_fragments = list(tqdm(
            executor.map(process_group, group_data), 
            total=len(group_data),
            desc="Generating HTML report",
            unit="group"
        ))
    
    html_content += "".join(html_fragments)
    
    html_content += """
    </body>
    </html>
    """
    
    with open(os.path.join(report_dir, "report.html"), "w") as f:
        f.write(html_content)
    
    return os.path.join(report_dir, "report.html")

def process_and_copy_image(group_data):
    """Process and copy a single image group with progress tracking."""
    group, output_dir, convert_heic = group_data
    
    # Sort by creation time to keep the earliest image
    group.sort(key=lambda x: os.path.getctime(x))
    
    # Copy the first (earliest) image to output directory
    src_path = group[0]
    filename = os.path.basename(src_path)
    dest_path = os.path.join(output_dir, filename)
    
    # Convert HEIC to JPG if requested
    if convert_heic and src_path.lower().endswith(('.heic', '.heif')):
        jpg_filename = os.path.splitext(filename)[0] + '.jpg'
        dest_path = os.path.join(output_dir, jpg_filename)
        img = Image.open(src_path)
        img.save(dest_path, format="JPEG")
    else:
        shutil.copy2(src_path, dest_path)
    
    return len(group)

def main():
    parser = argparse.ArgumentParser(description="Remove duplicate images from a directory.")
    parser.add_argument("input_dir", help="Directory containing original images")
    parser.add_argument("output_dir", help="Directory to save unique images (will be created if it doesn't exist)")
    parser.add_argument("--threshold", type=int, default=5, help="Perceptual hash difference threshold (default: 5)")
    parser.add_argument("--convert-heic", action="store_true", help="Convert HEIC files to JPG in output directory")
    parser.add_argument("--workers", type=int, default=None, help="Number of worker processes (default: CPU count - 1)")
    args = parser.parse_args()
    
    input_dir = args.input_dir
    output_dir = args.output_dir
    threshold = args.threshold
    convert_heic = args.convert_heic
    workers = args.workers or max(1, cpu_count() - 1)
    
    if not os.path.exists(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist")
        return
    
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Finding similar images in {input_dir} with threshold {threshold}...")
    print(f"Using {workers} worker processes")
    
    similar_groups = find_similar_images(input_dir, threshold)
    
    # Count total images and duplicates
    total_images = sum(len(group) for group in similar_groups)
    unique_images = len(similar_groups)
    duplicate_images = total_images - unique_images
    
    # Check if any images were found
    if total_images == 0:
        print("\nNo images found in the input directory.")
        return
    
    # Copy only one image from each group to output directory (in parallel)
    with ProcessPoolExecutor(max_workers=workers) as executor:
        group_data = [(group, output_dir, convert_heic) for group in similar_groups]
        _ = list(tqdm(
            executor.map(process_and_copy_image, group_data),
            total=len(group_data),
            desc="Copying unique images",
            unit="group"
        ))
    
    # Create an HTML report
    report_path = create_html_report(similar_groups, output_dir)
    
    # Print statistics
    print("\nDuplication Removal Statistics:")
    print(f"Total images processed: {total_images}")
    print(f"Unique images kept: {unique_images}")
    print(f"Duplicate images removed: {duplicate_images}")
    print(f"Duplication rate: {duplicate_images/total_images*100:.2f}%")
    print(f"\nClean images saved to: {output_dir}")
    print(f"HTML report generated at: {report_path}")
    print("\nNote: Source images were not modified.")

if __name__ == "__main__":
    main() 
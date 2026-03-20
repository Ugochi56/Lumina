import psycopg2
import psycopg2.extras
import requests
import cv2
import numpy as np
import os
from skimage.metrics import structural_similarity as ssim
import time

from brisque import BRISQUE

brisque_evaluator = BRISQUE(url=False)

# BRISQUE Implementation using a Pre-Trained SVR Model
# Evaluates image quality based on spatial Natural Scene Statistics (NSS) features.
def compute_brisque(image):
    try:
        score = brisque_evaluator.score(image)
        score = min(max(float(score), 0.0), 999.9999)
        return round(score, 4)
    except Exception as e:
        print(f"BRISQUE failed: {e}")
        return 0.0

def compute_ssim(img1_path, img2_path):
    # Read images
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)
    
    # Resize img2 to match img1 if Replicate changed the dimensions
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        
    # Convert to grayscale
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    # Compute SSIM
    score, _ = ssim(gray1, gray2, full=True)
    return round(float(score), 4), img2

def download_image(url, filepath):
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        return True
    return False

def evaluate_database():
    print("Starting IQA Pipeline...")
    
    # Connect to DB
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        # Fallback to loading .env manually if run locally
        from dotenv import load_dotenv
        load_dotenv('.env')
        DATABASE_URL = os.environ.get('DATABASE_URL')
        
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Fetch photos that have been enhanced but not yet scored
        cur.execute("""
            SELECT id, cloudinary_url, enhanced_url 
            FROM photos 
            WHERE enhanced_url IS NOT NULL 
              AND ssim_score IS NULL 
              AND cloudinary_url IS NOT NULL
              AND cloudinary_url != ''
              AND enhanced_url != ''
        """)
        photos = cur.fetchall()
        print(f"Found {len(photos)} photos to evaluate.")
        
        os.makedirs('temp_eval', exist_ok=True)
        
        for p in photos:
            try:
                photo_id = p['id']
                orig_url = p['cloudinary_url']
                enh_url = p['enhanced_url']
                
                print(f"Evaluating Photo {photo_id}...")
                
                orig_path = f"temp_eval/orig_{photo_id}.jpg"
                enh_path = f"temp_eval/enh_{photo_id}.jpg"
                
                if download_image(orig_url, orig_path) and download_image(enh_url, enh_path):
                    # 1. Calculate SSIM (Structural Integrity)
                    ssim_val, enh_img_cv2 = compute_ssim(orig_path, enh_path)
                    
                    # 2. Calculate BRISQUE (Spatial Quality Distortion)
                    brisque_val = compute_brisque(enh_img_cv2)
                    
                    # Update DB
                    cur.execute("""
                        UPDATE photos 
                        SET ssim_score = %s, brisque_score = %s 
                        WHERE id = %s
                    """, (ssim_val, brisque_val, photo_id))
                    conn.commit()
                    
                    print(f"  -> Success: SSIM={ssim_val}, BRISQUE={brisque_val}")
                
                # Cleanup
                if os.path.exists(orig_path): os.remove(orig_path)
                if os.path.exists(enh_path): os.remove(enh_path)
                
            except Exception as item_err:
                print(f"Error evaluating photo {p['id']}: {item_err}")
                conn.rollback()
                
        cur.close()
        conn.close()
        print("IQA Pipeline Complete.")
        
    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    evaluate_database()

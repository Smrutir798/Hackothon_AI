from ultralytics import YOLO
from PIL import Image
import os

# Configuration
MODEL_PATH = 'yolov8n.pt'
# Default image path (update this or pass as argument)
DEFAULT_IMAGE_PATH = r"Screenshot 2026-01-08 010633.png"

# Allowed food classes (same as backend)
# FOOD_CLASSES = {} # REMOVED

def run_test(image_path):
    print(f"Loading model: {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    print(f"Running inference on {image_path}...")
    results = model(image_path)
    
    # Process results
    print("\n--- Detection Results ---")
    all_detections = []
    
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            conf = float(box.conf[0])
            
            all_detections.append(f"{class_name} ({conf:.2f})")
    
    print(f"All Objects Detected: {', '.join(all_detections)}")
    
    # Save result image
    output_path = "yolo_test_result.jpg"
    results[0].save(filename=output_path)
    print(f"\nResult image saved to: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    run_test(DEFAULT_IMAGE_PATH)

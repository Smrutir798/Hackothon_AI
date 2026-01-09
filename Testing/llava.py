from google import genai
from google.genai import types
import PIL.Image
import os

def detect_objects_with_gemini(image_path: str, api_key: str):
    """
    Uses Gemini 2.0 Flash to detect objects in an image and return bounding boxes.
    """
    client = genai.Client(api_key=api_key)
    
    image = PIL.Image.open(image_path)
    
    # Gemini 1.5 models support spatial understanding via natural language prompts.
    prompt = (
        "Detect the objects in this image. For each object, provide its label "
        "and bounding box coordinates in the format [ymin, xmin, ymax, xmax] "
        "normalized from 0 to 1000."
    )
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt, image]
    )
    
    return response.text

if __name__ == "__main__":
    # Test with the existing screenshot and a placeholder key (or the one from the original file if valid for testing)
    # Note: user provided key in original file was "AIzaSyDIt283RbfdMA29siqeiSkSd5tUxlOwM7o". 
    # Caution: It is not good practice to commit API keys. 
    # For now I will use the one present in the file for testing purpose as requested by user context.
    
    API_KEY = "AIzaSyB7KFfa9qhSRgXwnFBcTBLweurslfTFvMs" 
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    IMAGE_PATH = os.path.join(current_dir, "Screenshot 2026-01-08 010633.png")
    
    if os.path.exists(IMAGE_PATH):
        try:
            result = detect_objects_with_gemini(IMAGE_PATH, API_KEY)
            print("Detection Result:")
            print(result)
        except Exception as e:
            print(f"Error during detection: {e}")
    else:
        print(f"Image not found at {IMAGE_PATH}")


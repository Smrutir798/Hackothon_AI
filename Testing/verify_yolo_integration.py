import sys
import os
import json
from unittest.mock import MagicMock

# Adjust path to include backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '..', 'backend')
sys.path.append(backend_dir)

print(f"Adding {backend_dir} to sys.path")

try:
    # Import main module. This triggers module-level code execution including model loading.
    import main
    print("Successfully imported backend.main")
    
    # Check yolo_model
    if main.yolo_model is not None:
        print(f"Verification Success: main.yolo_model is initialized. Type: {type(main.yolo_model)}")
        
        # Check device
        # Ultralytics model.device might be available
        if hasattr(main.yolo_model, 'device'):
            print(f"Model default device: {main.yolo_model.device}")
        
        # Verify no Llava
        with open(main.__file__, 'r') as f:
            content = f.read()
            if 'llava' in content.lower():
                print("WARNING: 'llava' found in main.py source!")
            else:
                print("Source Check: No 'llava' found in main.py.")
                
        # --- Test analyze_perishability ---
        print("\nTesting analyze_perishability...")
        
        # Mock ollama to avoid actual API call and model loading lag/failure in test environment
        original_ollama_chat = main.ollama.chat
        
        # Create a mock response
        mock_response = {
            'message': {
                'content': '```json\n[\n  {"name": "Apple", "days_to_expiry": 7, "priority": "Medium"},\n  {"name": "Milk", "days_to_expiry": 3, "priority": "High"}\n]\n```'
            }
        }
        main.ollama.chat = MagicMock(return_value=mock_response)
        
        test_ingredients = ["Apple", "Milk"]
        test_extra = "I also have some old bread"
        
        try:
            result = main.analyze_perishability(test_ingredients, test_extra)
            print("analyze_perishability returned:")
            print(json.dumps(result, indent=2))
            
            if len(result) == 2 and result[0]['name'] == 'Apple':
                print("Verification Success: analyze_perishability parsed mocked JSON correctly.")
            else:
                print("Verification Failure: Unexpected result from analyze_perishability.")
                
        except Exception as e:
            print(f"Error testing analyze_perishability: {e}")
        finally:
            # Restore
            main.ollama.chat = original_ollama_chat

    else:
        print("Verification Failure: main.yolo_model is None")
        
except Exception as e:
    print(f"Verification Failed with error: {e}")

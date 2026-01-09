from google import genai
import os

client = genai.Client(api_key="AIzaSyDIt283RbfdMA29siqeiSkSd5tUxlOwM7o")

try:
    models = client.models.list()
    for model in models:
        print(model.name)
except Exception as e:
    print(f"Error listing models: {e}")

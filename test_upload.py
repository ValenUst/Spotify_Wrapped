import json
import urllib.request
import urllib.parse

url = 'http://127.0.0.1:8000/api/upload/'
data = [{"endTime": "2026-05-10 20:00", "artistName": "Artist A", "msPlayed": 1000000}]

# To send multipart/form-data with urllib is a bit complex, let's just use Python's built-in tools or do it manually.
# Since it's a bit complex, let's just make the view print what the error is instead.

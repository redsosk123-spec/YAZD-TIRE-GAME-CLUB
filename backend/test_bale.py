
import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv(".env")

token = os.getenv("BALE_BOT_TOKEN")

if not token:
    print("ERROR: Bale token not found in .env")
    raise SystemExit(1)

url = f"https://tapi.bale.ai/bot{token}/getMe"
request = urllib.request.Request(
    url,
    headers={"Accept": "application/json"}
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))

    if data.get("ok"):
        bot = data.get("result", {})
        print("SUCCESS: Bale bot connected!")
        print("Bot name:", bot.get("first_name", "Unknown"))
        print("Username:", bot.get("username", "Unknown"))
    else:
        print("Bale API returned an error.")
        print("Error code:", data.get("error_code"))
        print("Description:", data.get("description", "Unknown"))

except urllib.error.HTTPError as error:
    print("HTTP ERROR:", error.code)
    print("Check the token and API response.")

except Exception as error:
    print("CONNECTION ERROR:", type(error).__name__)

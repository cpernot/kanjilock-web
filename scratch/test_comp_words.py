import requests
import json

try:
    res = requests.get("http://localhost:8000/api/quiz/init?player=cp")
    data = res.json()
    static_data = data.get("static_data", {})
    
    with_comp = {}
    for k, v in static_data.items():
        if v.get("comp_words"):
            with_comp[k] = v.get("comp_words")
            
    print(f"Total kanjis: {len(static_data)}")
    print(f"Kanjis with comp_words: {len(with_comp)}")
    
    # Print the first few
    for k in list(with_comp.keys())[:3]:
        print(f"{k}: {with_comp[k]}")
        
except Exception as e:
    print(f"Error: {e}")

# backend/box_metadata.py

# Official sequence for Box IDs
# Used to maintain consistency in dropdowns and progressive unlocking logic.
BOX_ORDER = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
    "11", "12", "13", "14", "15", "16", "17", "18", "19", 
    "2A", "2B", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
    "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
    "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
    "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
    "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
    "71", "72", "73", "74", "75", "76", "77", "78", "79", "80",
    "81", "82", "83", "84", "85", "86", "87", "88", "89", "90",
    "91", "92", "93", "94", "95", "971", "972", "973", "974",
    "WA", "OR", "CA", "AZ", "NV", "UT", "ID", "MT", "WY", "CO", "NM", "TX", 
    "OK", "KS", "NB", "SD", "ND", "MN", "IA", "MO", "AR", "LA", "MS", "AL", 
    "TN", "KY", "IL", "WI", "MI", "IN", "OH", "WV", "PA", "FL", "GA", "SC", 
    "NC", "VA", "DC", "MD", "DE", "NJ", "NY", "CT", "RI", "MA", "VT", "NH", 
    "ME", "HI", "AK", "PR", "VI", "Bahamas", "Cuba", "Haïti"
]

def get_box_sort_index(box_id):
    """Returns the index of a box_id in the master list, or a high number if not found."""
    try:
        return BOX_ORDER.index(str(box_id))
    except ValueError:
        return 9999 

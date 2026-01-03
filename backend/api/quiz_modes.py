import random

def quiz_intrus(kanjis, user_srs, show_box=True):
    boxes = {}
    #source = user_srs if len(user_srs) >= 20 else kanjis
    kanji_list = (
        list(user_srs.keys())
        if len(user_srs) >= 20
        else list(kanjis.keys())
    )       
    # On utilise LA BOÎTE DU KANJILOCK
    for kanji in kanji_list: #user_srs:
        if kanji not in kanjis:
            continue
    
        box = str(kanjis[kanji].get("boite", "unknown"))
        boxes.setdefault(box, []).append(kanji)

    # boîtes avec au moins 3 kanji
    valid_boxes = [b for b, items in boxes.items() if len(items) >= 3]
    if not valid_boxes:
        return None

    target_box = random.choice(valid_boxes)
    same_box = random.sample(boxes[target_box], 3)

    other_boxes = [b for b in boxes if b != target_box]
    if not other_boxes:
        return None

    intruder_box = random.choice(other_boxes)
    intruder = random.choice(boxes[intruder_box])

    options = same_box + [intruder]
    random.shuffle(options)

    question = "Quel est l’intrus ?"
    if show_box:
        question += f" (Boîte cible : {target_box})"

    return {
        "question": question,
        "options": options,
        "answer": intruder,
        "intruder_box": intruder_box,
        "target_box": target_box
    }

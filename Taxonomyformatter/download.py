import os
import requests

# Image URLs
image_urls = [
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00001.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00002.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00003.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00004.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00005.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00006.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00007.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00008.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00009.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00010.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00011.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00012.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00013.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00014.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00015.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00016.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00017.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00018.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00019.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00020.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00021.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00022.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00023.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00024.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00025.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00026.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00027.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00028.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00029.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00030.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00031.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00032.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00033.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00034.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00035.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00036.jpg",
    "https://indobis.in/wp-content/uploads/otoliths/CMLREOTL00037.jpg"
]

# Corrected species names
species_names = [
    "Synagrops japonicus",
    "Psenopsis obscura",
    "Chlorophthalmus acutifrons",
    "Polymixia fusca",
    "Hoplostethus melanopus",
    "Alepocephalus blanfordii",
    "Narcetes stomias",
    "Lamprogrammus niger",
    "Aphanopus microphthalmus",
    "Bathyuroconger vicinus",
    "Bathypterois atricolor",
    "Gephyroberyx darwinii",
    "Saurida tumbil",
    "Grammoplites suppositus",
    "Rexea prometheoides",
    "Beryx splendens",
    "Atrobucca nibe",
    "Nemipterus japonicus",
    "Pterygotrigla hemisticta",
    "Bembrops caudimacula",
    "Neoepinnula orientalis",
    "Physiculus roseus",
    "Trichiurus lepturus",
    "Hoplostethus rubellopterus",
    "Satyrichthys milleri",
    "Ostracoberyx dorygenys",
    "Cubiceps baxteri",
    "Chlorophthalmus corniger",
    "Diretmoides veriginae",
    "Alepocephalus bicolor",
    "Lamprogrammus fragilis",
    "Coloconger raniceps",
    "Xenomystax trucidans",
    "Neobathyclupea elongata",
    "Talismania longifilis",
    "Gavialiceps taeniola",
    "Psenopsis cyanea"
]

# Create output folder
os.makedirs("otolith_dataset", exist_ok=True)

# Download images
for i, (url, name) in enumerate(zip(image_urls, species_names), start=1):
    safe_name = name.replace(" ", "_")
    filename = f"otolith_dataset/{i:02d}_{safe_name}.jpg"
    
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"✅ Downloaded: {filename}")
    except Exception as e:
        print(f"❌ Failed: {url} -> {e}")
print("Download completed.")
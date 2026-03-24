import pandas as pd
import requests
import time
import os

input_file = './otolithname.csv'  # CSV with one column: ScientificName
output_file = './taxonomy-enriched.csv'

def get_aphia_id(scientific_name):
    """Fetch AphiaID from WoRMS using scientific name."""
    url = f'https://www.marinespecies.org/rest/AphiaRecordsByName/{scientific_name}?like=true&marine_only=true'
    try:
        response = requests.get(url, timeout=1)
        if response.status_code == 200 and response.json():
            return response.json()[0].get('AphiaID', None)
    except Exception:
        return None
    return None

def get_classification(aphia_id):
    """Fetch full classification from WoRMS using AphiaID."""
    url = f'https://www.marinespecies.org/rest/AphiaClassificationByAphiaID/{aphia_id}'
    try:
        response = requests.get(url, timeout=8)
        if response.status_code == 200:
            hierarchy = response.json()
            return {rank['rank'].lower(): rank['scientificname'] for rank in hierarchy}
    except Exception:
        return {}
    return {}

def enrich_taxonomy(scientific_name):
    """Combine AphiaID and full classification into one record."""
    aphia_id = get_aphia_id(scientific_name)
    if not aphia_id:
        return {'ScientificName': scientific_name, 'AphiaID': '', 'Status': 'Not Found'}
    classification = get_classification(aphia_id)
    enriched = {
    'ScientificName': scientific_name,
    'AphiaID': aphia_id,
    'Status': 'Found',
    'kingdom': classification.get('kingdom', ''),
    'phylum': classification.get('phylum', ''),
    'subphylum': classification.get('subphylum', ''),
    'infraphylum': classification.get('infraphylum', ''),
    'parvphylum': classification.get('parvphylum', ''),
    'gigaclass': classification.get('gigaclass', ''),
    'superclass': classification.get('superclass', ''),
    'class': classification.get('class', ''),
    'subclass': classification.get('subclass', ''),
    'order': classification.get('order', ''),
    'superorder': classification.get('superorder', ''),
    'suborder': classification.get('suborder', ''),
    'infraorder': classification.get('infraorder', ''),
    'family': classification.get('family', ''),
    'subfamily': classification.get('subfamily', ''),
    'superfamily': classification.get('superfamily', ''),
    'genus': classification.get('genus', ''),
    'subgenus': classification.get('subgenus', ''),
    'species': classification.get('species', ''),
    }

    return enriched

def main():
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found.")
        return

    df = pd.read_csv(input_file)
    if 'ScientificName' not in df.columns:
        print("Input CSV must contain a column named 'ScientificName'.")
        return

    enriched_data = []
    for name in df['ScientificName']:
        if pd.isna(name) or str(name).strip() == '':
            continue
        enriched = enrich_taxonomy(name.strip())
        enriched_data.append(enriched)
        print(f"Processed: {name} → AphiaID: {enriched.get('AphiaID', '')}")
        time.sleep(0.2)  # Respectful delay for API

    df_out = pd.DataFrame(enriched_data)
    df_out.to_csv(output_file, index=False)
    print(f"\n✅ Enrichment complete. Saved to {output_file}")

if __name__ == "__main__":
    main()

# WoRMS Batch Enrichment Script
import pandas as pd
import os
import requests
import time

input_file = './otolithname.csv'
output_file = './otolithname-processed.csv'

def get_worms_data(scientific_name):
    """Fetch WoRMS enrichment for the given scientific name."""
    api_url = f'https://www.marinespecies.org/rest/AphiaRecordsByName/{scientific_name}?like=true&marine_only=true'
    try:
        response = requests.get(api_url, timeout=8)
        if response.status_code == 200 and response.json():
            worms = response.json()[0]
            return {
                'aphiaid': worms.get('AphiaID', ''),
                'lsid': worms.get('lsid', ''),
                'status': worms.get('status', ''),
                'scientificName': worms.get('valid_name', scientific_name),
                'kingdom': worms.get('kingdom', ''),
                'phylum': worms.get('phylum', ''),
                'class': worms.get('class', ''),
                'order': worms.get('order', ''),
                'family': worms.get('family', ''),
                'genus': worms.get('genus', ''),
                'species': worms.get('species', ''),
                'marine': worms.get('isMarine', ''),
                'brackish': worms.get('isBrackish', ''),
                
            }
        return {}
    except Exception as e:
        return {}

def is_valid_name(name):
    return pd.notnull(name) and str(name).strip().lower() not in ("", "nan")

def main():
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found.")
        return

    df = pd.read_csv(input_file)
    if os.path.exists(output_file):
        print("Output file already exists.")
        df_out = pd.read_csv(output_file)
    else:
        print("Creating new output file...")
        enriched_records = []
        for idx, row in df.iterrows():
            sci_name = row.get('ScientificName', '')
            if not is_valid_name(sci_name):
                continue  # skip invalid entries
            worms = get_worms_data(str(sci_name))
            enriched_row = {**row, **worms}
            enriched_records.append(enriched_row)
            print(f"- {sci_name}: matched AphiaID {worms.get('aphiaid','')}")
            time.sleep(0.1)
        df_out = pd.DataFrame(enriched_records)
        df_out.to_csv(output_file, index=False)
        print("Done! Enriched data saved.")

if __name__ == "__main__":
    while True:
        main()
        print("Sleeping for 6 hours before next sync ...")
        time.sleep(21600)


# # if you need to run this as a web service, uncomment below and set up FastAPI
# from fastapi import FastAPI, Query
# from fastapi.responses import JSONResponse
# import pandas as pd
# import boto3
# import requests
# import io

# app = FastAPI(title="WoRMS Batch Enrichment API")

# # AWS S3 Configuration (set your credentials/config appropriately)
# S3_BUCKET_NAME = 'your-input-bucket'
# INPUT_FILE_KEY = 'input/taxonomy-data.csv'
# OUTPUT_FILE_KEY = 'output/taxonomy-data-enriched.csv'

# s3_client = boto3.client('s3')

# def get_worms_data(scientific_name):
#     api_url = f'https://www.marinespecies.org/rest/AphiaRecordsByName/{scientific_name}?like=true&marine_only=true'
#     try:
#         response = requests.get(api_url, timeout=8)
#         if response.status_code == 200 and response.json():
#             worms = response.json()[0]
#             return {
#                 'aphiaid': worms.get('AphiaID', ''),
#                 'lsid': worms.get('lsid', ''),
#                 'status': worms.get('status', ''),
#                 'scientificName': worms.get('valid_name', scientific_name),
#                 'kingdom': worms.get('kingdom', ''),
#                 'phylum': worms.get('phylum', ''),
#                 'class': worms.get('class', ''),
#                 'order': worms.get('order', ''),
#                 'family': worms.get('family', ''),
#                 'genus': worms.get('genus', ''),
#                 'species': worms.get('species', ''),
#                 'marine': worms.get('isMarine', ''),
#                 'brackish': worms.get('isBrackish', ''),
#             }
#         return {}
#     except Exception:
#         return {}

# @app.post("/enrich-s3")
# def enrich_s3():
#     # Download CSV file from S3 to memory
#     fileobj = io.BytesIO()
#     s3_client.download_fileobj(S3_BUCKET_NAME, INPUT_FILE_KEY, fileobj)
#     fileobj.seek(0)

#     df = pd.read_csv(fileobj)
#     enriched_records = []

#     for idx, row in df.iterrows():
#         sci_name = row.get('ScientificName', '')
#         if pd.isna(sci_name) or str(sci_name).strip() == '':
#             enriched_records.append(row.to_dict())  # skip invalid
#             continue
#         worms_data = get_worms_data(str(sci_name))
#         enriched_row = {**row.to_dict(), **worms_data}
#         enriched_records.append(enriched_row)

#     df_enriched = pd.DataFrame(enriched_records)

#     # Download existing output file if exists, else create new
#     try:
#         existing_output_obj = io.BytesIO()
#         s3_client.download_fileobj(S3_BUCKET_NAME, OUTPUT_FILE_KEY, existing_output_obj)
#         existing_output_obj.seek(0)
#         df_existing = pd.read_csv(existing_output_obj)
#         # Append new rows or update as needed (here we replace)
#         df_final = df_enriched
#     except s3_client.exceptions.NoSuchKey:
#         df_final = df_enriched

#     # Save DataFrame to CSV buffer
#     csv_buffer = io.StringIO()
#     df_final.to_csv(csv_buffer, index=False)

#     # Upload CSV to S3 replacing the output file
#     s3_client.put_object(Body=csv_buffer.getvalue(), Bucket=S3_BUCKET_NAME, Key=OUTPUT_FILE_KEY)

#     return JSONResponse({"status": "success", "message": "S3 file enriched and uploaded"})


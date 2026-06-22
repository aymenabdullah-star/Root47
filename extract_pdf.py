#!/usr/bin/env python3
import sys
import os

# Try pdfplumber first
try:
    import pdfplumber
    pdf_path = r"d:\Weather-app\Root47-main\RD-Weather Data APIs - V2.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                full_text += f"\n--- PAGE {page_num} ---\n{text}"
        print(full_text)
except ImportError:
    # Try PyPDF2 as fallback
    try:
        import PyPDF2
        pdf_path = r"d:\Weather-app\Root47-main\RD-Weather Data APIs - V2.pdf"
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            full_text = ""
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += f"\n--- PAGE {page_num} ---\n{text}"
            print(full_text)
    except ImportError:
        print("Neither pdfplumber nor PyPDF2 is installed. Installing pdfplumber...")
        os.system(f'"{sys.executable}" -m pip install pdfplumber -q')
        import pdfplumber
        pdf_path = r"d:\Weather-app\Root47-main\RD-Weather Data APIs - V2.pdf"
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += f"\n--- PAGE {page_num} ---\n{text}"
            print(full_text)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

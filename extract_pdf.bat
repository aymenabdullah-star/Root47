@echo off
cd /d "d:\Weather-app\Root47-main"
py -m pip install pdfplumber -q
py extract_pdf.py

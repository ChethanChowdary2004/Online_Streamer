@echo off
REM Start the FastAPI backend (activates the virtual environment first).
cd /d "%~dp0"
call .venv\Scripts\activate.bat
python -m uvicorn main:app --reload --port 3000

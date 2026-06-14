FROM python:3.10-slim

# Install system dependencies for OpenCV, YOLOv8, PyTorch, and curl
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download de421.bsp ephemeris file directly from NASA JPL (16MB)
RUN curl -L -o de421.bsp https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de421.bsp

# Copy requirements first to leverage caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files (excluding de421.bsp, venv, and node_modules via .gitignore)
COPY . .

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Start FastAPI backend on port 7860
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

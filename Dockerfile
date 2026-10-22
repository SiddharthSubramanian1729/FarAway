FROM python:3.10-slim

# Install system dependencies for OpenCV, YOLOv8, and PyTorch
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up user 1000 for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models and ephemeris during build so runtime startup is instant
RUN python -c "from skyfield.api import load; load('de421.bsp')"
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Copy all application files ensuring they are owned by user 1000
COPY --chown=user:user . $HOME/app

# Ensure cache and config directories exist and are owned by user
RUN mkdir -p $HOME/.cache $HOME/.config && chown -R user:user $HOME

# Switch to non-root user for Hugging Face runtime
USER user

# Expose port 7860
EXPOSE 7860

# Start FastAPI backend
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

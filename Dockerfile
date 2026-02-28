FROM python:3.13-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY backend/ backend/
COPY run_api.py .

# Environment
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

EXPOSE 8001

CMD ["python", "run_api.py"]

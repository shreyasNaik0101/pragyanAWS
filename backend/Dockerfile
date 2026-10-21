FROM python:3.11-slim

# Minimal system dependencies — no more LaTeX / cairo / ffmpeg
# (rendering is delegated to the Remotion service)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p media/temp media/output

EXPOSE 8000
ENV PORT=8000

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT

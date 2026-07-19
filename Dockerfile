FROM node:22-alpine AS web
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_API_URL
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY \
    REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN \
    REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID \
    REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
COPY flask-server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY flask-server ./flask-server
COPY --from=web /app/client/build ./client/build
WORKDIR /app/flask-server
CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 120 main:app

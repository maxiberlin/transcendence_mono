# .devcontainer/Dockerfile
FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu
# FROM mcr.microsoft.com/vscode/devcontainers/python:latest

# Set the working directory
# WORKDIR /workspace

RUN apt-get update && apt-get -y install python3-pip

# Copy requirements.txt from root directory to the working directory
COPY ./transcendence_backend/requirements.txt .
RUN pip install -r requirements.txt

# COPY requirements.txt /tmp/pip-tmp/
# RUN pip3 --disable-pip-version-check --no-cache-dir install -r /tmp/pip-tmp/requirements.txt \
#     && rm -rf /tmp/pip-tmp

# Install additional VS Code extensions or tools if needed

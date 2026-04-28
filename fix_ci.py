with open(".github/workflows/backend-ci.yml", "r") as f:
    content = f.read()

content = content.replace("DC=$(which docker-compose 2>/dev/null || echo \"docker-compose\")", "DC=\"docker compose\"")
content = content.replace("$DC -f infrastructure/docker/docker-compose.yml", "docker compose -f infrastructure/docker/docker-compose.yml")
content = content.replace("docker run -d --name docker_backend_1", "docker run -d --name cblue_backend_fallback")

with open(".github/workflows/backend-ci.yml", "w") as f:
    f.write(content)

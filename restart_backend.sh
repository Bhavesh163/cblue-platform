#!/bin/bash
ssh -o StrictHostKeyChecking=no root@168.144.39.0 "cd /home/cblue && docker-compose down && docker system prune -af --volumes && docker-compose pull backend && docker-compose up -d --build"

#!/bin/bash
sed -i 's/# ── Clean up old iptables hack ──/# ── Ensure port 80 traffic goes to 3002 (CF worker restriction) ──/' .github/workflows/backend-ci.yml
sed -i 's/iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3002 2>\/dev\/null || true/iptables -t nat -C PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3002 2>\/dev\/null || iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3002/' .github/workflows/backend-ci.yml

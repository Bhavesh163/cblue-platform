x=$(docker ps -aq -f name="dsfdsfdsf")
docker rm -f $x 2>/dev/null || true

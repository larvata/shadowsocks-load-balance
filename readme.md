# shadowsocks Load Balance

Use haproxy for load balancing multiple shadowsocks nodes.

## Prerequisite

- nodejs
- docker w/ docker-compose
- shadowsocks subscription

```
A shadowsocks subscription is a json format with following structure:

{
    "configs": [{
        "server": "server.com",
        "server_port": 1234,
        "method": "rc4",
        "remarks": "",
        "password": "pwd",
    }]
}
```

## Useage

```
# create .env file and setup your shadowsocks subscription url

# generate haproxy config file and required server list
./renewal.sh

# start the docker
docker-compose up

```

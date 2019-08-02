# shadowsocks Load Balance

Use haproxy for load balancing multiple shadowsocks nodes.

## Prerequisite

- nodejs
- docker w/ docker-compose
- shadowsocks subscription

```
A shadowsocks subscription is a json look likes following structure:

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

## Usage

```
# create .env file and setup your shadowsocks subscription url
# and customize the proxy port number

# generate haproxy config file and required server list
./renewal.sh

# start the docker
docker-compose up

```


## How it works

...

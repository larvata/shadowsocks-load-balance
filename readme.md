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


var r = t.split('\n').filter(t=>t).map(t=>decodeURIComponent(t).match(/ss\:\/\/([^@]*)@([^:]*):(\d*)\/\?plugin=([^;]*);([^&]*)&[^#]*#(.*)$/)).map(t=>({remarks:t[6],server:t[2],server_port:t[3],method:atob(t[1]).split(':')[0],password:atob(t[1]).split(':')[1],plugin:t[4],plugin_opts:t[5]}))

#!/usr/bin/env node

const fs = require('fs');


// port for ss local
const PORT_START = 9000;

// port for haproxy exposed
const EXPORT_START = 8000;

function loadConfiguration(cfgStr) {
  const cfg = JSON.parse(cfgStr);
  return cfg;
}

function parseServerConfiguration(scfg) {
  const l = scfg.remarks.includes('标准') ? 'normal' : 'bgp';
  const c = scfg.server.replace(/(^[a-z]+)[0-9]+.*/, (a, b) => b);
  return {
    country: c,
    level: l,
    key: `${c}-${l}`,
  }
}


function getShadowsocksList(sscfg) {
  // extract auth info
  const { server_port, method, password } = sscfg.configs[0];
  const servers = sscfg.configs.map(ss => ss.server);
  const sslst =
`${server_port}
${method}
${password}
${servers.join('\n')}`;
  return sslst;
}

function getHaproxyConfiguration(sscfg) {
  const bindLines = []
  const backendLines = [];

  sscfg.configs.forEach((ss, idx) => (ss.local_port = PORT_START+idx));

  // prepare grouped server configs
  const grouped = sscfg.configs.reduce((a, b) => {
    // parse server type
    const st = parseServerConfiguration(b);
    const { country, level, key } = st;

    if (!a[key]) {
      a[key] = {
        data: [],
      }
    }

    a[key].data.push(b)
    return a
  }, {});

  const keys = Object.keys(grouped);
  keys.forEach((k, kid) => {
    const port = EXPORT_START + kid;
    bindLines.push(`    bind *:${port} name port${port}`);
  })

  bindLines.push('');
  bindLines.push('');

  keys.forEach((k, kid) => {
    const port = EXPORT_START + kid;
    bindLines.push(
`    acl port${port} dst_port ${port}
    use_backend ${k} if port${port}`);
  })

  keys.forEach((k, kid) => {
    backendLines.push(
`\nbackend ${k}
    option tcp-check
    tcp-check connect

    tcp-check send-binary 05020001
    tcp-check expect binary 0500 # means local client working okay
    tcp-check send-binary 05010001acd9a04e0050 # try to acess google ip
    tcp-check expect binary 05000001
    tcp-check send GET\\ /\\ HTTP/1.1\\r\\n
    tcp-check send Host:\\ google.com\\r\\n
    tcp-check send User-Agent:\\ curl/7.43.0\\r\\n
    tcp-check send Accept:\\ */*\\r\\n
    tcp-check send \\r\\n
    tcp-check expect rstring ^HTTP/1.1\\ 301
  `)

    grouped[k].data.forEach(s => {
      backendLines.push(`    server ${s.server} ss-local-clusters:${s.local_port} check inter 10m`)
    })
  })

  const haproxy =
`global
    log 127.0.0.1 local0 debug
    # chroot  /var/lib/haproxy
    pidfile /var/run/haproxy.pid
    # user    root
    # group   root

defaults
    log global
    mode    tcp
    balance roundrobin
    # retries 3
    maxconn 5000
    timeout connect 500ms
    timeout client  3s
    timeout server  3s

frontend shadowsocks
${bindLines.join('\n')}
${backendLines.join('\n')}
`
  return haproxy;
}


var stdin = process.openStdin();

var data = "";

stdin.on('data', function(chunk) {
  data += chunk;
});

stdin.on('end', function() {
  const cfg = loadConfiguration(data);
  // const sscmd = getShadowsocksStartupScript(cfg);
  // const ssverbose = getShadowsocksStartupVerboseScript(cfg);

  const sslst = getShadowsocksList(cfg);
  const haproxy = getHaproxyConfiguration(cfg);

  // fs.writeFileSync('ss-cmd.sh', sscmd);
  // fs.writeFileSync('ss-cmd-verbose.sh', ssverbose);
  fs.writeFileSync('ss.lst', sslst);
  fs.writeFileSync('haproxy.cfg', haproxy);
  console.log('done.');
});

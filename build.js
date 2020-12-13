#!/usr/bin/env node

const fs = require('fs');


// port for ss local
const PORT_START = 9000;

// port for haproxy exposed
const EXPORT_START = 8000;

function loadConfiguration(cfgStr) {
  const cfg = JSON.parse(cfgStr)
  const uniq = cfg.reduce((a,b) => {
    const exists = a.some((aa) => aa.server === b.server && aa.server_port === b.server_port);
    if (!exists) {
      a.push(b);
    }
    return a;
  }, []);

  uniq.forEach((ss, idx) => (ss.local_port = PORT_START + idx));

  console.log('cfg', cfg.length, 'uniq', uniq.length)
  return uniq;
}

function parseServerConfiguration(scfg) {

  const l = scfg.remarks.includes('专线')
    ? 'normal'
    : scfg.remarks.includes('隧道')
      ? 'bgp'
      : 'unknown';

  const result = {
    level: l,
  };


  [
    {
      k: 'singapore',
      c: '新加坡',
    },
    {
      k: 'hongkong',
      c: '香港',
    },
    {
      k: 'russia',
      c: '俄罗斯',
    },
    {
      k: 'gemnary',
      c: '德国',
    },
    {
      k: 'taiwan',
      c: '台湾',
    },
    {
      k: 'japan',
      c: '日本',
    },
    {
      k: 'us',
      c: '美国',
    },
  ].some((c) => {
    if (scfg.remarks.includes(c.c)) {
      result.country = c.k;
      return true;
    }
  });

  result.key = `${result.level}`;
  return result;
}


function getShadowsocksCli(sscfg) {
  // extract auth info
  const cli = sscfg.map((ss) => `ss-local -s ${ss.server} -p ${ss.server_port} -m ${ss.method} -k ${ss.password} -l ${ss.local_port} -b 0.0.0.0 --plugin ${ss.plugin} --plugin-opts "${ss.plugin_opts}"`);
  const ssCli = cli.join('\n');
  return ssCli;
}

function getHaproxyConfiguration(sscfg) {
  const bindLines = []
  const backendLines = [];


  // prepare grouped server configs
  const grouped = sscfg.reduce((a, b) => {
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
      backendLines.push(`    server ${s.server}-${s.server_port} ss-local-clusters:${s.local_port} check inter 10m`)
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

    # https://www.haproxy.com/blog/websockets-load-balancing-with-haproxy/
    timeout client          25s
    timeout connect          5s
    timeout server          25s
    # timeout tunnel available in ALOHA 5.5 or HAProxy 1.5-dev10 and higher
    timeout tunnel        3600s

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

  const sscli = getShadowsocksCli(cfg);
  const haproxy = getHaproxyConfiguration(cfg);

  // fs.writeFileSync('ss-cmd.sh', sscmd);
  // fs.writeFileSync('ss-cmd-verbose.sh', ssverbose);
  fs.writeFileSync('ss-cli.lst', sscli);
  fs.writeFileSync('haproxy.cfg', haproxy);
  console.log('done.');
});

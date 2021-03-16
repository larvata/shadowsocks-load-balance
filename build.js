#!/usr/bin/env node

const fs = require('fs');
const url = require('url');
const querystring = require('querystring');


// port for ss local
const PORT_START = 9000;

// port for haproxy exposed
const EXPORT_START = 8000;

function atob(base64) {
  const buff = Buffer.from(base64, 'base64');
  return buff.toString('utf-8');
}

function loadConfiguration(cfg) {
  // const cfg = JSON.parse(cfgStr);
  const uniq = cfg.reduce((a, b) => {
    const exists = a.some((aa) =>
      aa.server === b.server
      && aa.server_port === b.server_port
      && aa.plugin === b.plugin
      && aa.plugin_opts === b.plugin_opts);
    if (!exists) {
      a.push(b);
    }
    return a;
  }, []);

  uniq.forEach((ss, idx) => (ss.local_port = PORT_START + idx));

  console.log('cfg', cfg.length, 'uniq', uniq.length)
  return uniq;
}

function loadSubscription(subscription) {
  const lines = subscription.split('\n').filter((l) => l);
  return lines.map((line) => {
    const u = url.parse(line);

    const auth = atob(u.auth);
    const [method, password] = auth.split(':');
    const server = u.hostname;
    const server_port = u.port;
    const remarks = decodeURIComponent(u.hash.replace(/^#/, ''));

    const result = {
      remarks,
      server,
      server_port,
      method,
      password,
    };

    const qs = querystring.parse(u.query);

    if (qs.plugin) {
      const [plugin, plugin_opts, plugin_opts_rest] = qs.plugin.split(';');
      result.plugin = plugin;
      result.plugin_opts = [plugin_opts, plugin_opts_rest].join(';');
    }

    if (qs.group) {
      const group = atob(qs.group);
      result.group = group;
    }

    return result;
  });
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
    {
      k: 'asian',
      c: '亚洲',
    },
    {
      k: 'australia',
      c: '澳洲',
    },
    {
      k: 'america',
      c: '南美',
    },
    {
      k: 'europe',
      c: '欧洲',
    },
    {
      k: 'korea',
      c: '韩国',
    },
    {
      k: 'england',
      c: '英国',
    },
    {
      k: 'london',
      c: '伦敦',
    },
    {
      k: 'sgzx',
      c: '深港专线',
    },
    {
      k: 'malaysia',
      c: '马来西',
    },
    {
      k: 'us',
      c: '广美',
    },
    {
      k: 'singapore',
      c: '广新',
    },
    {
      k: 'japan',
      c: '广日',
    },
    {
      k: 'hongkong',
      c: '广港',
    },
    {
      k: 'korea',
      c: '广韩',
    },
  ].some((c) => {
    if (scfg.remarks.includes(c.c)) {
      result.country = c.k;
      return true;
    }
  });

  // result.key = `${result.level}`;
  // console.log(result.country)
  if (!result.country) {
    console.log('unresolved:', scfg.remarks);
  }
  result.key = result.country;
  result.haproxyKey = `server ${scfg.server}-${scfg.server_port}-${Math.random().toString(36).substring(2, 7)} ss-local-clusters:${scfg.local_port} check inter 10m`;
  return { ...result, ...scfg };
}


function getShadowsocksCli(sscfg) {
  // extract auth info
  const cli = sscfg.map((ss) => {
    let cmd = `ss-local -s ${ss.server} -p ${ss.server_port} -m ${ss.method} -k ${ss.password} -l ${ss.local_port} -b 0.0.0.0`;
    if (ss.plugin) {
      cmd = `${cmd} --plugin ${ss.plugin}`;
    }
    if (ss.plugin_opts) {
      cmd = `${cmd} --plugin-opts "${ss.plugin_opts}"`;
    }
    return cmd;
  });
  const ssCli = cli.join('\n');
  return ssCli;
}


function getHaproxyConfiguration(sscfg) {
  const bindLines = []
  const backendLines = [];

  const parsedConfig = sscfg.map((s) => parseServerConfiguration(s));

  // prepare grouped server configs
  const grouped = parsedConfig.reduce((a, b) => {
    // parse server type
    const { country, level, key } = b;

    if (!a[key]) {
      a[key] = {
        data: [],
      };
    }

    a[key].data.push(b);
    return a;
  }, {});

  // add all mixed config
  bindLines.push(`    bind *:${EXPORT_START} name port${EXPORT_START}`);

  const keys = Object.keys(grouped);
  keys.forEach((k, kid) => {
    const port = EXPORT_START + kid + 1;
    bindLines.push(`    bind *:${port} name port${port}`);
  });

  bindLines.push('');
  bindLines.push('');

  bindLines.push(
`    acl port${EXPORT_START} dst_port ${EXPORT_START}
    use_backend mixed if port${EXPORT_START}`);


  keys.forEach((k, kid) => {
    const port = EXPORT_START + kid + 1;
    bindLines.push(
`    acl port${port} dst_port ${port}
    use_backend ${k} if port${port}`);
  });

  // add all mixed backend
  backendLines.push(
`\nbackend mixed
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
  `);

  parsedConfig.forEach(s => {
    backendLines.push(`    ${s.haproxyKey}`);
  });

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
      // only apply online check for mixed group
      backendLines.push(`    ${s.haproxyKey.replace(/ check inter 10m$/, '')}`);
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
  // input stream is base64string
  // const subscription = atob(data);

  const subscription = data;
  const json = loadSubscription(subscription)

  const cfg = loadConfiguration(json);
  // const sscmd = getShadowsocksStartupScript(cfg);
  // const ssverbose = getShadowsocksStartupVerboseScript(cfg);


  const sscli = getShadowsocksCli(cfg);
  const haproxy = getHaproxyConfiguration(cfg);

  // fs.writeFileSync('ss-cmd.sh', sscmd);
  // fs.writeFileSync('ss-cmd-verbose.sh', ssverbose);
  fs.writeFileSync('tmp.json', JSON.stringify(json, null, 2));
  fs.writeFileSync('shadowsocks/ss-cli.lst', sscli);
  fs.writeFileSync('haproxy/haproxy.cfg', haproxy);
  console.log('done.');
});

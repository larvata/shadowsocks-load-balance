const fs = require('fs');
const rix = require('./luffy.json');

const defaultConfig = {
  route: 'bypass-lan-china',
  remote_dns: '8.8.8.8',
  ipv6: true,
  metered: false,
  proxy_apps: {
    enabled: true,
    bypass: true,
    android_list: [
      'com.cibn.tv',
      'com.xiaodianshi.tv.yst',
      'com.isakura',
      'com.droidlogic.miracast',
      'hk.minix.xbmc',
      'com.waxrain.airplaydmr',
    ],
  },
  udpdns: false,
};

const result = rix.map((rc) => {
  return {
    ...defaultConfig,

    server: rc.server,
    server_port: rc.server_port,
    password: rc.password,
    method: rc.method,
    remarks: rc.remarks,
    plugin: rc.plugin,
    plugin_opts: rc.plugin_opts,
  };
});

result.push({
  ...defaultConfig,

  server: 'aws.larvata.me',
  server_port: 52332,
  password: 'happykdm',
  method: 'chacha20-ietf-poly1305',
});

result.push({
  ...defaultConfig,

  server: 'aws2.larvata.me',
  server_port: 52332,
  password: 'happykdm',
  method: 'chacha20-ietf-poly1305',
});

result.push({
  ...defaultConfig,

  server: 'qkvm.larvata.me',
  server_port: 52332,
  password: 'happykdm',
  method: 'chacha20-ietf-poly1305',
});

result.push({
  ...defaultConfig,

  server: 'hostdare.larvata.me',
  server_port: 52332,
  password: 'happykdm',
  method: 'chacha20-ietf-poly1305',
});

result.push({
  ...defaultConfig,

  server: 'vultr.larvata.me',
  server_port: 52332,
  password: 'happykdm',
  method: 'chacha20-ietf-poly1305',
});

fs.writeFileSync('ppp.json', JSON.stringify(result, null, 2));

/*
** 参数对应注释
** '域名': {
**    title: '标签页展示的title值',
**    brand: '请求项目包的品牌名称',
**    address: '固定的请求地址(访问dcm上的固定位置的静态资源时添加该属性)',
**    versionType: '请求的项目类型(main: 正式版, test: 线上测试版, debug: 开发测试版)'
** }
*/

var host_choose = {
  'www.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    address: '/dcm/vp/home/'
  },
  'www.vimtag.com/device': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'main'
  },
  'www.vimtag.com/download': {
    title: 'Vimtag',
    brand: 'vimtag',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'vimtag.com'
  },
  'test.vimtag.com/download': {
    title: 'Vimtag',
    brand: 'vimtag',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.vimtag.com'
  },
  'testing.vimtag.com/download': {
    title: 'Vimtag',
    brand: 'vimtag',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.vimtag.com'
  },
  'debug.vimtag.com/download': {
    title: 'Vimtag',
    brand: 'vimtag',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'debug.vimtag.com'
  },
  'test.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'test'
  },
  'debug.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'debug'
  },
  'www.ebitcam.com': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    address: '/dcm/ep/home/'
  },
  'www.ebitcam.com/device': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    versionType: 'main'
  },
  'www.ebitcam.com/download': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'ebitcam.com'
  },
  'test.ebitcam.com/download': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.ebitcam.com'
  },
  'testing.ebitcam.com/download': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.ebitcam.com'
  },
  'debug.ebitcam.com/download': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'debug.ebitcam.com'
  },
  'test.ebitcam.com': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    versionType: 'test'
  },
  'debug.ebitcam.com': {
    title: 'Ebitcam',
    brand: 'ebitcam',
    versionType: 'debug'
  },
  'www.mipcm.com': {
    title: 'MIPC',
    brand: 'mipcm',
    versionType: 'main'
  },
  'www.mipcm.com/download': {
    title: 'MIPC',
    brand: 'mipcm',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'mipcm.com'
  },
  'test.mipcm.com/download': {
    title: 'MIPC',
    brand: 'mipcm',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.mipcm.com'
  },
  'testing.mipcm.com/download': {
    title: 'MIPC',
    brand: 'mipcm',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.mipcm.com'
  },
  'debug.mipcm.com/download': {
    title: 'MIPC',
    brand: 'mipcm',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'debug.mipcm.com'
  },
  'test.mipcm.com': {
    title: 'MIPC',
    brand: 'mipcm',
    versionType: 'test'
  },
  'debug.mipcm.com': {
    title: 'MIPC',
    brand: 'mipcm',
    versionType: 'debug'
  },
  'www.vsmahome.com': {
    title: 'vsmahome',
    brand: 'vsmahome',
    versionType: 'main'
  },
  'www.vsmahome.com/download': {
    title: 'vsmahome',
    brand: 'vsmahome',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'vsmahome.com'
  },
  'test.vsmahome.com/download': {
    title: 'vsmahome',
    brand: 'vsmahome',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.vsmahome.com'
  },
  'testing.vsmahome.com/download': {
    title: 'vsmahome',
    brand: 'vsmahome',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'test.vsmahome.com'
  },
  'debug.vsmahome.com/download': {
    title: 'vsmahome',
    brand: 'vsmahome',
    address: '/dcm/static/download/download_v2/download/',
    downloadHostname: 'debug.vsmahome.com'
  },
  'test.vsmahome.com': {
    title: 'vsmahome',
    brand: 'vsmahome',
    versionType: 'test'
  },
  'debug.vsmahome.com': {
    title: 'vsmahome',
    brand: 'vsmahome',
    versionType: 'debug'
  },
  'www.mininginfotech.com': {
    title: 'mininginfotech',
    address: '/dcm/mininginfotech.com/home/'
  },
  'www.myannke.com': {
    title: 'ANNKE',
    // address: '/dcm/static/http_v4.5.2.1705271554/index.html?m=www.myannke.com&ta=&tp='
  },
  'www.prolabcloud.com': {
    title: 'PROLAB CLOUD',
    // address: '/dcm/static/http_v4.5.2.1705271554/index.html?m=www.prolabcloud.com&ta=&tp='
  },
  'ehawk.hootoo.com': {
    title: 'E-HAWK',
    // address: '/dcm/static/http_v4.5.2.1705271554/index.html?m=ehawk.hootoo.com&ta=&tp='
  },
  'cloud.serenelifehome.com': {
    title: 'SereneViewer',
    address: '/dcm/http/v4.2.1.1702201430/v2n/main.v2n.htm?1v4.2.1.1702201430&amp;m=cloud.serenelifehome.com&amp;ta=&amp;tp='
  },
  'www.eazieplus.com': {
    title: 'eazieplus',
    address: 'http://162.254.149.214:12180/product/v4.8.2.1709151058/main.htm?v4.8.2.1709151058&m=www.eazieplus.com&ta=&tp=&sign=ezps'
  },
  'www.fujikam.com': {
    title: 'Fujikam',
    address: '/dcm/fp/home/'
  },
  'test.fujikam.com': {
    title: 'Fujikam',
    address: '/dcm/fp/home/'
  },
  'en.fujikam.com': {
    title: 'Fujikam',
    address: '/dcm/fp/home/'
  },
  'v1.mipcm.com': {
    title: 'MIPC',
    brand: 'mipcm',
    versionType: 'test'
  },
  'v2.mipcm.com': {
    title: 'MIPC',
    brand: 'mipcm',
    versionType: 'test'
  },
  'v3.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'test'
  },
  'v4.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'test'
  },
  'mall.vimtag.com': {
    title: 'Vimtag',
    brand: 'vimtag',
    versionType: 'test'
  },
  'mall.vsmahome.com': {
    title: 'vsmahome',
    brand: 'vsmahome',
    versionType: 'test'
  },
  'product.vsmahome.com': {
    title: 'vsmahome',
    brand: 'vsmahome',
    versionType: 'test'
  },
  '45.113.201.4': {
    title: 'vimtag',
    brand: 'vimtag',
    // brand: 'mipc',
    versionType: 'test',
    // address: '/dcm/fujikam.com/home/'
  },
  
}
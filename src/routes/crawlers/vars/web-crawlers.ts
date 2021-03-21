// https://www.keycdn.com/blog/web-crawlers
interface IWebCrawlersCollection {
  [key: string]: Array<string>
}

const webCrawlers: IWebCrawlersCollection = {
  google: [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Googlebot/2.1; +http://www.google.com/bot.html'
  ],
  bing: [
    'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/',
    'bingbot/2.0; +http://www.bing.com/bingbot.html'
  ],
  yahoo: ['Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)'],
  duckduckgo: ['DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)']
}

const sharePreviewCrawlers: IWebCrawlersCollection = {
  // me: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.193 Safari/537.36',
  Facebook: [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'facebookexternalhit/'
  ],
  GooglePlus: [
    'Mozilla/5.0 (Windows NT 6.1; rv:6.0) Gecko/20110814 Firefox/6.0 Google (+https://developers.google.com/+/web/snippet/)'
  ],
  Xing: [
    'XING-contenttabreceiver/2.0'
  ],
  LinkedId: [
    'LinkedInBot/',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)'
  ],
  Delicious: [
    'Java/1.7.0_45'
  ],
  Twitter: [
    'Twitterbot/'
  ],
  Skype: [
    'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5'
  ],
  WhatsApp: [
    'WhatsApp/'
  ]
}

const exportable: {
  [key: string]: {
    [key: string]: Array<string>
  }
} = {
  webCrawlers,
  sharePreviewCrawlers
}

export default exportable

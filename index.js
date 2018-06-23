'use strict';
var request = require('request');
var htmlparser = require('htmlparser2');
var schedule = require('node-schedule');
var Mattermost = require('node-mattermost');

const sBarOptions = {
  keywords: 'Wochenkarte',
  lastPdfUrl: '',
  host: 'http://www.s-bar.de/',
  url: 'ihr-betriebsrestaurant/aktuelle-speiseplaene/banst-pt-wochenkarte.html',
}

const cafeBarGruenen = {
  host: 'http://wochenkarte.grnn.de/',
  url: 'Wochenkarte.pdf'
}

const mattermostOptions = {
  webHookUrl: '',
  descriptionCanteen: 'This week in our lovely canteen: ',
  descriptionCafeBarGruenen: 'This week at the Cafe Bar Gruenen: '
}

class LinkFinder {
  constructor() {
    if(!sBarOptions.lastPdfUrl.length) {
      this.getDataOfUrl();
    }
    this.scheduler();
  };

  getDataOfUrl () {
    request(sBarOptions.host + sBarOptions.url, (error, response, body) => {
      if (error) {
        console.error(e.message);
        return;
      }
      this.parseHtml(body);
    });
  };

  parseHtml (data) {
    let parser = new htmlparser.Parser({
      onopentag: (name, attribs) => {
        if (name === 'a' && attribs.href.indexOf(sBarOptions.keywords) !== -1) {
          let url = sBarOptions.host + attribs.href;
          if (sBarOptions.lastPdfUrl !== url) {
            sBarOptions.lastPdfUrl = url;
            this.sendToMattermost(url);
          } else {
            console.log('No new menu found.');
          }
        }
      }
    }, {decodeEntities: true});
    parser.write(data);
    parser.end();
  };

  sendToMattermost (text) {
    var mattermost = new Mattermost(mattermostOptions.webHookUrl);
    const cafeBarGruenenPdf = `${cafeBarGruenen.host}/${cafeBarGruenen.url}`;
    mattermost.send({
      text: `${mattermostOptions.descriptionCanteen}${text} & ${mattermostOptions.descriptionCafeBarGruenen}${cafeBarGruenenPdf}`,
      username: 'canteen',
      icon_emoji: 'hamburger'
    });
  }

  scheduler () {
    schedule.scheduleJob('15 12 * * 1', () => {
      let currentDate = new Date();
      console.log('Job startet', currentDate);
      this.getDataOfUrl();
    });
  };
}
new LinkFinder();

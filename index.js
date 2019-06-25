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

const teamsOptions = {
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
            this.sendToTeams(url);
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

  sendToTeams (text) {
    const cafeBarGruenenPdf = `${cafeBarGruenen.host}/${cafeBarGruenen.url}`;
    request.post(teamsOptions.webHookUrl, {
      json: true,
      body: {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "367a47",
        "summary": "This weeks food",
        "sections": [
          {
            "activityTitle": `${teamsOptions.descriptionCanteen}`,
            "activitySubtitle": `[open PDF](${text})`,
            "activityImage": "https://media.cylex.de/companies/2632/781/logo/logo.jpg",
          },
          {
            "activityTitle": `${teamsOptions.descriptionCafeBarGruenen}`,
            "activitySubtitle": `[open PDF](${cafeBarGruenenPdf})`,
            "activityImage": "https://scontent-frx5-1.xx.fbcdn.net/v/t1.0-9/24129588_518509321861892_4622374918589760501_n.png?_nc_cat=102&_nc_ht=scontent-frx5-1.xx&oh=948aa8762d027776b5917179ddb57e91&oe=5DBF6937",
          }
        ]
      }
    })
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

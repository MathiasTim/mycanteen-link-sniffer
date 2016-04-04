'use strict';
var http = require('http');
var htmlparser = require('htmlparser2');
var schedule = require('node-schedule');
var Slack = require('node-slack');

const sBarOptions = {
  keywords: 'Wochenkarte',
  lastPdfUrl: '',
  request: {
    host: 'www.s-bar.de',
    path: '/ihr-betriebsrestaurant/aktuelle-speiseplaene/banst-pt-wochenkarte.html'
  }
}
const slackOptions = {
  webHookUrl: '',
  description: 'This week in our lovely canteen: '
}

class LinkFinder {
  constructor() {
    if(!sBarOptions.lastPdfUrl.length) {
      this.getDataOfUrl();
    }
    this.scheduler();
  };

  getDataOfUrl () {
    let request = http.request(sBarOptions.request, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => this.parseHtml(data));
    });
    request.on('error', (e) => console.log(e.message));
    request.end();
  };

  parseHtml (data) {
    let parser = new htmlparser.Parser({
      onopentag: (name, attribs) => {
        if (name === 'a' && attribs.href.indexOf(sBarOptions.keywords) !== -1) {
          let url = sBarOptions.request.host + '/' + attribs.href;
          if (sBarOptions.lastPdfUrl !== url) {
            sBarOptions.lastPdfUrl = url;
            this.sendToSlack(url);
          } else {
            console.log('No new menu found.');
          }
        }
      }
    }, {decodeEntities: true});
    parser.write(data);
    parser.end();
  };

  sendToSlack (text) {
    var slack = new Slack(slackOptions.webHookUrl);
    slack.send({
      text: slackOptions.description + text
    });
  };

  scheduler () {
    schedule.scheduleJob('15 12 * * 1', () => {
      let currentDate = new Date();
      console.log('Job startet', currentDate);
      this.getDataOfUrl();
    });
  };
}
new LinkFinder();

'use strict';
var request = require('request');
var htmlparser = require('htmlparser2');
var schedule = require('node-schedule');
var Slack = require('node-slack');
var Mattermost = require('node-mattermost');

const sBarOptions = {
  keywords: 'Wochenkarte',
  lastPdfUrl: '',
  host: 'http://www.s-bar.de/',
  url: 'ihr-betriebsrestaurant/aktuelle-speiseplaene/banst-pt-wochenkarte.html',
}

const slackOptions = {
  webHookUrl: '',
  description: 'This week in our lovely canteen: '
}

const mattermostOptions = {
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
            this.sendToSlack(url);
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

  sendToSlack (text) {
    var slack = new Slack(slackOptions.webHookUrl);
    slack.send({
      text: slackOptions.description + text
    });
  };

  sendToMattermost (text) {
    var mattermost = new Mattermost(mattermostOptions.webHookUrl);
    mattermost.send({
      text: `${mattermostOptions.description}${text}`,
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

const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer : { args: ['--no-sandbox'] } });
const express = require('express');
const app = express();
const http = require('http');
const url = require('url');

client.on('qr', (qr) => {
  // Generate and scan this code with your phone
  console.log('QR RECEIVED', qr);
  client.pupPage.screenshot({path: __dirname+'/public/qr.png'});
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

client.on('message', msg => {
  if (msg.body == '!ping') {
    msg.reply('pong');
  }
  else {
    try {
      const reqUrl = url.parse(url.format({
        protocol: 'http',
        hostname: 'api.wolframalpha.com',
        pathname: '/v1/result',
        query: {
          appid: process.env.WOLFRAM_SECRET,
          i: msg.body
        }
      }));
      const options = {
        hostname: reqUrl.hostname,
        port: 80,
        path: reqUrl.path,
        method: 'GET'
      };

      console.log(reqUrl.path);
      const hreq = http.request(options, result => {
        let data = '';

        // A chunk of data has been recieved.
        result.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        result.on('end', () => {
          msg.reply(data);
        });
      });

      hreq.on('error', error => {
        console.error(error);
      });

      hreq.end();
    }
    catch(e) {
      console.error(e);
    }
  }
});

app.get('/', async(req, res) => {
  if (client) {
    var msg = 'Whatsapp APIs available:<br>';
    msg += '<ul>';
    msg += '<li>/info</li>';
    msg += '<li>/chats</li>';
    msg += '</ul>';
    res.send(msg);
  }
  else {
    res.send('<a href=\'qr\'>Scan QR</a> to Start');
  }
});

app.get('/qr', async (req, res) => {
  try {
    res.sendFile(__dirname+'/public/qr.png');
  } catch (error) {
    console.log(error);
  }
});

app.get('/info', (req, res) => {
  if (client) {
    let info = client.info;
    res.send(client.info);
  }
  else
  {
    res.send('No Client Connected');
  }
});

app.get('/chats', async(req, res) => {
  try {
    const chats = await client.getChats();
    res.send(chats);
  }
  catch(e) {
    res.status(500).send('Get Chats Error!');
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get('/chats/:date', async(req, res) => {
  try {
    const chats = await client.getChats();
    let dateStr = req.params.date.substring(0, 4) + '.' + req.params.date.substring(4,6) + '.' + req.params.date.substring(6,8);
    let dateFrom = new Date(dateStr);
    let filteredChat = chats.filter(c => c.timestamp >= (dateFrom.getTime() / 1000));
    res.send(filteredChat);
  }
  catch(e) {
    res.status(500).send('Get Chats By Date Error!');
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get('/chats/:dateFrom/:dateTo', async(req, res) => {
  try {
    const chats = await client.getChats();
    let dateStr = req.params.dateFrom.substring(0, 4) + '.' + req.params.dateFrom.substring(4,6) + '.' + req.params.dateFrom.substring(6,8);
    let dateFrom = new Date(dateStr);
    dateStr = req.params.dateTo.substring(0, 4) + '.' + req.params.dateTo.substring(4,6) + '.' + req.params.dateTo.substring(6,8);
    let dateTo = new Date(dateStr);
    let filteredChat = chats.filter(c => c.timestamp >= (dateFrom.getTime() / 1000) && c.timestamp <= (dateTo.getTime() / 1000));
    res.send(filteredChat);
  }
  catch(e) {
    res.status(500).send('Get Chats By Date From To Error!');
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get('/chat/:id', async(req, res) => {
  try {
    let number = req.params.id + (req.params.id.includes('-') ? '@g.us' : '@c.us');
    const chat = await client.getChatById(number);
    if (req.query['load'] == 'true')
      await chat.fetchMessages();
    res.send(chat);
  }
  catch(e) {
    res.status(500).send('Get Chat by Id Error');
    throw new Error(req.url);
  }
});

app.get('/query/:q', async(req, res) => {
  try {
    const reqUrl = url.parse(url.format({
      protocol: 'http',
      hostname: 'api.wolframalpha.com',
      pathname: '/v1/result',
      query: {
        appid: process.env.WOLFRAM_SECRET,
        i: req.params.q
      }
    }));
    const options = {
      hostname: reqUrl.hostname,
      port: 80,
      path: reqUrl.path,
      method: 'GET'
    };

    console.log(reqUrl.path);
    const hreq = http.request(options, result => {
      let data = '';

      // A chunk of data has been recieved.
      result.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      result.on('end', () => {
        res.send(data);
      });
    });

    hreq.on('error', error => {
      res.status(500).send(error);
      console.error(error);
    });

    hreq.end();
  }
  catch(e) {
    res.status(500).send(e);
  }
});

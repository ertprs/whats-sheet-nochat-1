const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer : { args: ['--no-sandbox'] } });
const express = require('express');
const app = express();
const http = require('http');
const url = require('url');
const ws = require('ws');

// we need to create our own http server so express and ws can share it.
const server = http.createServer(app);
// pass the created server to ws
const wss = new ws.Server({ server });

client.on('qr', (qr) => {
  // Generate and scan this code with your phone
  console.log('QR RECEIVED', qr);
  client.pupPage.screenshot({path: __dirname+'/public/qr.png'});
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

client.on('message', msg => {
  broadcast(msg);
});

app.get('/', async(req, res) => {
  res.sendFile(__dirname + '/view/index.html');
});

app.get('/qr', async (req, res) => {
  try {
    res.sendFile(__dirname + '/public/qr.png');
  } catch (error) {
    console.log(error);
  }
});

app.get('/info', (req, res) => {
  if (client.info) {
    res.send(client.info);
  }
  else
  {
    res.send({msg: 'No Client Connected! <a href=\'qr\'>Scan QR</a> to Start'});
  }
});

app.get('/chats', async(req, res) => {
  try {
    const chats = await client.getChats();
    res.send(chats);
  }
  catch(e) {
    res.status(500).send({msg: 'Get Chats Error!'});
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
    await chat.fetchMessages().then(f => res.send(f));
  }
  catch(e) {
    res.status(500).send('Get Chat by Id Error');
    throw new Error(req.url);
  }
});

wss.on('connection', function connection(ws, request, client) {
  ws.on('message', function incoming(message) {
	  console.log('received: %s', message);
  });
  
  ws.on('error', function(e){
	  console.log('error!: ' + e);
  });
});

function broadcast(arg){
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(arg);
    }
  });
}

// listen for requests!
const listener = server.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
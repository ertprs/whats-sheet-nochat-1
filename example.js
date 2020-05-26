const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer : { args: ['--no-sandbox'] } });
const express = require('express');
const app = express();
const request = require('request');

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

app.get('/', async(req, res) => {
    res.send('Running');
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
    const options = {
        hostname: 'http://api.wolframalpha.com/v1/result?appid=TP5E7U-K9KXY8G2UV&i',
        port: 443,
        path: '/todos',
        method: 'GET'
    };

    const hreq = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', d => {
            res.send(d);
        });
    });

    hreq.on('error', error => {
        res.status(500).send(error);
        console.error(error);
    });

    hreq.end();
});

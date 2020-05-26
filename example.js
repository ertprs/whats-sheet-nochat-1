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
    try {
        const reqUrl = url.parse(url.format({
            protocol: 'http',
            hostname: 'api.wolframalpha.com',
            pathname: '/v1/result?appid=TP5E7U-K9KXY8G2UV&i',
            query: {
                key: req.params.q
            }
        }));
        const options = {
            hostname: reqUrl.hostname,
            port: 80,
            path: reqUrl.path,
            method: 'GET'
        };
        

        const hreq = http.request(options, result => {
            console.log(`statusCode: ${result.statusCode}`);

            result.on('data', d => {
                res.send(d);
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

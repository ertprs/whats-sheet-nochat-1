const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer : { args: ['--no-sandbox'] } });
const express = require('express');
const app = express();


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

app.get('/qr', async (request, response) => {
    try {
        response.sendFile(__dirname+'/public/qr.png');
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


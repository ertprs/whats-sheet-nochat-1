const { Client } = require('whatsapp-web.js');
const client = new Client({ puppeteer : { args: ['--no-sandbox'] } });
const express = require('express');
const app = express();


client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

app.get('/', async (request, response) => {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://developers.google.com/web/tools/puppeteer');
        await page.screenshot({path: __dirname+'/public/puppeteer.png'});
        await browser.close();
        response.sendFile(__dirname+'/public/puppeteer.png');
    } catch (error) {
        console.log(error);
    }
});

var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});
const fs = require("fs");
const { Client, MessageMedia } = require("whatsapp-web.js");
const express = require("express");
const app = express();
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});
const axios = require("axios");
const http = require("http").createServer(app);
const url = require("url");
const io = require("socket.io")(http, { log: false, origins: "*:*" });
const bodyParser = require("body-parser");
const SESSION_FILE_PATH = "./session.json";
const path = require("path");
const qrcode = require("qrcode");
const events = (require("events").EventEmitter.defaultMaxListeners = 1000);
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}
let qrCode;
const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu"
    ]
  },
  session: sessionCfg
});

app.use(bodyParser.json({ limit: "50mb" })); // for parsing application/json
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // for parsing       application/x-www-form-urlencoded
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", async socket => {
  console.log(io.engine.clientsCount + " client connected");
  io.emit("client", "client connected");

  socket.on("disconnect", () => {
    console.log(io.engine.clientsCount + " disconect connected");
  });
});

// listen for requests!
const listener = http.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

client.on("qr", qr => {
  // Generate and scan this code with your phone
  console.log("QR RECEIVED", qr);
  qrCode = qr;
  client.pupPage.screenshot({ path: __dirname + "/public/qr.png" });
  qrcode.toDataURL(qr, (err, url) => {
    io.emit("qr", url);
  });
});

client.on("authenticated", session => {
  console.log("AUTHENTICATED", session);
  sessionCfg = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
    if (err) {
      console.error(err);
    }
  });
});

client.on("auth_failure", msg => {
  // Fired if session restore was unsuccessfull
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("disconnected", async reason => {
  console.log("Client was logged out", reason);
  if (reason === "UNPAIRED") {
    fs.unlinkSync(SESSION_FILE_PATH, function(err) {
      if (err) return console.log(err);
      console.log("Session file deleted!");
    });
  }
  client.destroy();
  client.initialize();
});

client.on("change_state", async reason => {
  console.log(reason);
  io.emit("change_state", reason);

  if (reason === "UNPAIRED") {
    client.destroy();
    client.initialize();
  }
});

client.on("ready", () => {
  console.log("Client is ready!");
  io.emit("client", "Client is ready!");
});

client.initialize();

// client.on('message', msg => {
//   io.emit('message', msg);
// });

client.on("message_create", msg => {
  // Fired on all message creations, including your own
  io.emit("message", msg);
  if (msg.fromMe) {
    // do stuff here
  }
});

client.on("message_ack", (msg, ack) => {
  /*
      == ACK VALUES ==
      ACK_ERROR: -1
      ACK_PENDING: 0
      ACK_SERVER: 1
      ACK_DEVICE: 2
      ACK_READ: 3
      ACK_PLAYED: 4
  */

  if (ack == 3) {
    // The message was read
    io.emit("message_read", msg);
  }
});

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/view/index.html");
});

app.get("/qr", async (req, res) => {
  try {
    res.sendFile(__dirname + "/public/qr.png");
  } catch (error) {
    console.log(error);
  }
});

app.get("/info", async (req, res) => {
  if (client.info) {
    res.send(client.info);
  } else {
    res.send({ msg: "No Client Connected! <a href='qr'>Scan QR</a> to Start" });
  }
});

app.get("/chats", async (req, res) => {
  try {
    const chats = await client.getChats();
    res.send(chats);
  } catch (e) {
    res.status(500).send({ msg: "Get Chats Error!" });
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get("/chats/:date", async (req, res) => {
  try {
    const chats = await client.getChats();
    let dateStr =
      req.params.date.substring(0, 4) +
      "." +
      req.params.date.substring(4, 6) +
      "." +
      req.params.date.substring(6, 8);
    let dateFrom = new Date(dateStr);
    let filteredChat = chats.filter(
      c => c.timestamp >= dateFrom.getTime() / 1000
    );
    res.send(filteredChat);
  } catch (e) {
    res.status(500).send("Get Chats By Date Error!");
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get("/chats/:dateFrom/:dateTo", async (req, res) => {
  try {
    const chats = await client.getChats();
    let dateStr =
      req.params.dateFrom.substring(0, 4) +
      "." +
      req.params.dateFrom.substring(4, 6) +
      "." +
      req.params.dateFrom.substring(6, 8);
    let dateFrom = new Date(dateStr);
    dateStr =
      req.params.dateTo.substring(0, 4) +
      "." +
      req.params.dateTo.substring(4, 6) +
      "." +
      req.params.dateTo.substring(6, 8);
    let dateTo = new Date(dateStr);
    let filteredChat = chats.filter(
      c =>
        c.timestamp >= dateFrom.getTime() / 1000 &&
        c.timestamp <= dateTo.getTime() / 1000
    );
    res.send(filteredChat);
  } catch (e) {
    res.status(500).send("Get Chats By Date From  To Error!");
    console.log(e.message);
    //throw new Error(req.url);
  }
});

app.get("/chat/:id", async (req, res) => {
  try {
    let number =
      req.params.id + (req.params.id.includes("-") ? "@g.us" : "@c.us");
    const chat = await client.getChatById(number);
    await chat.fetchMessages().then(f => res.send(f));
  } catch (e) {
    res.status(500).send("Get Chat by Id Error");
    throw new Error(req.url);
  }
});

app.get("/getimage/:id/:msgid", async (req, res) => {
  try {
    let number =
      req.params.id + (req.params.id.includes("-") ? "@g.us" : "@c.us");
    let msgId = req.params.msgid;
    await client
      .getChatById(number)
      .then(async c => {
        let searchOptions = { limit: 100 };
        await c
          .fetchMessages(searchOptions)
          .then(messages => {
            messages.forEach(async (msg, index) => {
              if (msg.id.id == msgId) {
                await msg
                  .downloadMedia()
                  .then(value => {
                    res.send(value);
                  })
                  .catch(err => {
                    res
                      .status(500)
                      .send("Error Downloading Image in Get Image!");
                  });
              }
            });
          })
          .catch(err => {
            res.status(500).send("Error Fetch Messages in Get Image!");
          });
      })
      .catch(err => {
        res.status(500).send("Error Chat not Found in Get Image!");
      });
  } catch (e) {
    res.status(500).send("Error Get Image!");
  }
});

app.get("/send/:id/:message", function(req, res) {
  try {
    let number =
      req.params.id + (req.params.id.includes("-") ? "@g.us" : "@c.us");
    let message = req.params.message;
    res.send(client.sendMessage(number, message));
  } catch (e) {
    res.status(500).send("Send Message Error");
    throw new Error(req.url);
  }
});

app.get("/status", async function(req, res) {
  try {
    const statuswa = await client
      .getState()
      .then(response => {
        res.status(200).json({
          status: true,
          response: response
        });
      })
      .catch(err => {
        res.status(500).json({
          status: false,
          message: "Your not a loggin"
        });
      });
  } catch (e) {
    res.status(500).send("Your not a loggin");
    // throw new Error(req.url);
  }
});

const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
};

app.post("/send", async function(req, res) {
  try {
    let number =
      req.body.number + (req.body.number.includes("-") ? "@g.us" : "@c.us");
    let message = req.body.message;
    let isRegisteredNumber = await checkRegisteredNumber(number);
    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: "The number is not registered"
      });
    }
    if (message.length) {
      client
        .sendMessage(number, message)
        .then(response => {
          res.status(200).json({
            status: true,
            response: response
          });
        })
        .catch(err => {
          res.status(500).json({
            status: false,
            message: "Your not a loggin"
          });
        });
    }
    // res.send(client.sendMessage(number, message));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Your not a loggin" });
    throw new Error(req.url);
  }
});

app.post("/send-image", async function(req, res) {
  try {
    console.log(req);
    let number =
      req.body.number + (req.body.number.includes("-") ? "@g.us" : "@c.us");
    let mime = req.body.mime.toString();
    const data = req.body.src.toString();
    let filename = req.body.filename.toString();
    let thumbnail = req.body.thumbnail.toString();
    let caption = req.body.caption.toString();
    let option = { attachment: thumbnail, caption: caption };
    const img = new MessageMedia(mime, data, filename);
    await client
      .sendMessage(number, img, caption)
      .then(value => {
        res.send(value);
      })
      .catch(error => {
        res.status(500).send("Post Message Error");
        throw new Error(req.url);
      });
  } catch (e) {
    res.status(500).send("Post Message Error");
    throw new Error(req.url);
  }
});

app.get("/contacts", async (req, res) => {
  try {
    const contacts = await client.getContacts();
    res.send(contacts);
  } catch (e) {
    res.status(500).send({ msg: "Get Contacts Error!" });
    console.log(e.message);
  }
});

// Send media
app.post("/send-media", async (req, res) => {
  let number =
    req.body.number + (req.body.number.includes("-") ? "@g.us" : "@c.us");
  const caption = req.body.caption;
  const fileUrl = req.body.file;
  const type = req.body.type;
  const fileName = req.body.fileName;
  console.log(req);
  let isRegisteredNumber = await checkRegisteredNumber(number);
  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The number is not registered"
    });
  }
  let mimetype;
  // const attachment = await axios
  //   .get(fileUrl, {
  //     responseType: "arraybuffer"
  //   })
  //   .then(response => {
  //     console.log(response)
  //     mimetype = response.headers["content-type"];
  //     return response.data.toString("base64");
  //   });

  const media = new MessageMedia(type, fileUrl, fileName);

  client
    .sendMessage(number, media, {
      caption: caption
    })
    .then(response => {
      res.status(200).json({
        status: true,
        response: response
      });
    })
    .catch(err => {
      res.status(500).json({
        status: false,
        response: err
      });
    });
});

app.post("/cek", async (req, res) => {
  let number =
    req.body.number + (req.body.number.includes("-") ? "@g.us" : "@c.us");
  try {
    let isRegisteredNumber = await checkRegisteredNumber(number);
    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: "The number is not registered"
      });
    }
    if (isRegisteredNumber) {
      return res.status(200).json({
        status: true,
        message: "The number registered"
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      response: error
    });
  }
});

app.get("/qrCode", async (req, res) => {
  try {
    res.status(200).json({
      status: true,
      response: qrCode
    });
  } catch (error) {
    res.send(error);
    console.log(error);
  }
});

// NODE.JS
// nodemon server.js to start, ctrl + c to stop

const express = require('express');
const app = express();

const fs = require('fs');
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.listen(8080, function () {
  console.log('listening on port 8080');
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
});

app.post('/sendData', function (req, res) {
  var data = req.body;
  console.log(data);
  res.json(data);
})

app.post('/convertingMP4', async function (req, res) {
  const ffmpeg = createFFmpeg({
    log: true,
    // corePath: './ffmpeg-core-static',
  })
  let data = req.body;
  
  await ffmpeg.load();
  console.log(data.url)
  ffmpeg.FS('writeFile', 'recording.webm', await fetchFile(data.url));
  await ffmpeg.run('-i', 'recording.webm', 'converted.mp4');

  
  const mp4File = ffmpeg.FS('readFile', 'converted.mp4');
  const mp4Blob = new Blob([mp4File.buffer], {type: 'video/mp4'});
  const mp4Url = URL.createObjectURL(mp4Blob);

  res.json({
    file: mp4File,
    blob: mp4Blob,
    url: mp4Url,
    original: data.url,
  });

  ffmpeg.FS('unlink', 'recording.webm');
  ffmpeg.FS('unlink', 'converted.mp4');
})

app.use('/coloris', express.static(__dirname+'/coloris'));
app.use('/assets', express.static(__dirname+'/assets'));
app.use('/main.js', express.static(__dirname+'/main.js'));
app.use('/canvas.js', express.static(__dirname+'/canvas.js'));
app.use('/favicon.ico', express.static(__dirname+'/favicon.ico'));
app.use('/style.css', express.static(__dirname+'/style.css'));

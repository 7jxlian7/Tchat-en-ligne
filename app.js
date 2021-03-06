const { Socket } = require('socket.io');
const express = require('express');
const Datastore = require('nedb');

const app = express();
const http = require('http').createServer(app);
const path = require('path');
const port = process.env.PORT || 3000;

/**
 * @type {Socket}
 */
const io = require('socket.io')(http);

http.listen(port, () => console.log(`listening at ${port}`));

app.use('/bootstrap/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/bootstrap/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use(express.static('ressources'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

const database = new Datastore('database.db');
database.loadDatabase();

app.get('/api', (request, response) => {
  database.find({}).sort({timestamp: -1}).limit(15).exec((err, data) => {
    if(err){
      response.end();
      return;
    }
    data.reverse();
    response.json(data);
  })
});

app.post('/api', (request, response) => {
  console.log(request.body);
  const data = request.body;
  const timestamp = Date.now();
  data.timestamp = timestamp;
  database.insert(data);
  response.json({
    status: 'success',
    user: data.username,
    msg: data.message
  })
  database.count({}, function (err, count) {
		let deleteMsg = count >= 15 ? true : false;
    io.emit('update messages', data.username, data.message, deleteMsg);
    if(err != null)
      console.log(err)
	});
});

let countUserOnline = 0;

io.on('connection', (socket) => {
  console.log(`[connexion] ${socket.id}`);
  io.to(socket.id).emit('get messages');
  countUserOnline++;
  io.emit(('update online'), countUserOnline);
  socket.on('disconnect', () => {
    console.log(`[déconnexion] ${socket.id}`);
    countUserOnline--;
    io.emit(('update online'), countUserOnline);
  });
})
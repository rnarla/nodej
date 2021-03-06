load('vertx_tests.js');

var net = require('net');

function testNetFunctionsExist() {
  vassert.assertEquals('function', typeof(net.Server));
  vassert.assertEquals('function', typeof(net.Socket));
  vassert.assertEquals('function', typeof(net.createServer));
  vassert.assertEquals('function', typeof(net.connect));
  vassert.assertEquals('function', typeof(net.createConnection));
  vassert.testComplete();
}

function testServerListeningEvent() {
  listening = false;
  server = net.createServer();
  listenCallback = function() { listening = true; }
  server.listen(8800, listenCallback);

  tries = 0;
  // now wait up to 3 seconds for the event to be fired
  vertx.setPeriodic(1000, function(id) {
    if (listening || tries++ > 3) {
      vertx.cancelTimer(id);
      server.close();
      vassert.assertTrue(listening);
      vassert.testComplete();
    }
  });
}

function testServerClose() {
  closed = false;
  listening = false;
  server = net.createServer();
  listenCallback = function() { listening = true; }
  server.listen(8800, listenCallback);
  server.on('close', function(e) { closed = true; });

  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (listening || tries++ > 3) {
      vertx.cancelTimer(id);
      server.close();
      tries = 0;
      vertx.setPeriodic(1000, function(id2) {
        if (closed || tries++ > 3) {
          vertx.cancelTimer(id2);
          vassert.assertTrue(closed);
          vassert.testComplete();
        }
      });
    }
  });
}

function testServerCloseWithCallback() {
  closed = false;
  listening = false;
  server = net.createServer();
  listenCallback = function() { listening = true; }
  server.listen(8800, listenCallback);

  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (listening || tries++ > 3) {
      vertx.cancelTimer(id);
      server.close(function() { closed = true; });
      tries = 0;
      vertx.setPeriodic(1000, function(id2) {
        if (closed || tries++ > 3) {
          vertx.cancelTimer(id2);
          vassert.assertTrue(closed);
          vassert.testComplete();
        }
      });
    }
  });
}

function testConnect() {
  connected = false;
  server = net.createServer();
  server.listen(8800, function() { connected = true; });
  net.connect(8800);
  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (connected || tries++ > 3) {
      vertx.cancelTimer(id);
      vassert.assertTrue(connected);
      server.close();
      vassert.testComplete();
    }
  });
}

function testConnectWithCallback() {
  connected = false;
  server = net.createServer();
  server.listen(8800);
  net.connect(8800, function() { connected = true; });
  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (connected || tries++ > 3) {
      vertx.cancelTimer(id);
      vassert.assertTrue(connected);
      server.close();
      vassert.testComplete();
    }
  });
}

function testSocketReadWrite() {
  data = undefined;
  server = net.createServer();
  server.listen(8800);
  server.on('connection', function(socket) { 
    socket.on('data', function(buffer) {
      data = buffer; 
    });
  });
  socket = net.connect(8800, function() {
    socket.write("crunchy bacon", function() { 
      socket.destroy();
    });
  });
  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (data || tries++ > 3) {
      vertx.cancelTimer(id);
      vassert.assertEquals("crunchy bacon", data);
      server.close();
      vassert.testComplete();
    }
  });
}

function testSocketTimeout() {
  var timedOut = false;
  server = net.createServer();
  server.listen(8800);
  server.on('connection', function(socket) { 
    socket.setTimeout(100, function() {
      timedOut = true;
    }); // receive timeout event in 100 msec
  });
  socket = net.connect(8800, function() {
    vertx.setTimer(300, function() {
      vassert.assertTrue(timedOut);
      socket.destroy();
      server.close();
      vassert.testComplete();
    });
  });
}

function testSocketTimeoutCanceled() {
  var timedOut  = false;
  var timeoutId = 0;
  server = net.createServer();
  server.listen(8800);
  server.on('connection', function(socket) { 
    socket.setTimeout(1000, function() {
      timedOut = true;
    }); // receive timeout event in 1 second
    socket.setTimeout(0);
  });
  socket = net.connect(8800, function() {
    vertx.setTimer(300, function() {
      vassert.assertFalse(timedOut);
      socket.destroy();
      server.close();
      vassert.testComplete();
    });
  });
}

function testSocketPauseAndResume() {
  var paused = false;
  var server_socket = null;
  server = net.createServer();
  server.on('connection', function(socket) { 
    server_socket = socket;
    server_socket.pause();
    paused = true;
    server_socket.on('data', function(buffer) {
      paused = false;
      server.close();
      socket.destroy();
      vassert.testComplete();
    });
  });
  server.listen(8800);
  socket = net.connect(8800, function() {
    // I don't like having to set these timers
    // But I couldn't figure out a better way
    // to give the server time to do its thing
    // on the 'connection' and 'data' events
    vertx.setTimer(200, function() {
      socket.write('juicy burgers');
      vertx.setTimer(200, function() {
        vassert.assertTrue(paused);
        server_socket.resume();
      });
    });
  });
}

function testSocketRemoteAddress() {
  server = net.createServer();
  server.listen(8800);
  net.connect(8800, function(socket) {
      vassert.assertEquals('127.0.0.1', socket.remoteAddress);
      // Long vs. Int causes failure here
      vassert.assertEquals('8800', socket.remotePort.toString());
      socket.destroy();
      server.close();
      vassert.testComplete();
  });
}

function testServerAddress() {
  listening = false;
  server = net.createServer();
  listenCallback = function() { 
    listening = true;
  }
  server.listen(8800, listenCallback);

  // now wait up to 3 seconds for the event to be fired
  tries = 0;
  vertx.setPeriodic(1000, function(id) {
    if (tries++ > 3 || listening) {
      vertx.cancelTimer(id);
    }
  });
  address = server.address();
  vassert.assertEquals(8800, address.port);
  // TODO: Vert.x does not provide bind address info?
  // vassert.assertEquals("0.0.0.0", address.address);
  // vassert.assertEquals("IPv4", address.family);
  server.close();
  vassert.testComplete();
}


initTests(this);

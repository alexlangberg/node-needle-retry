'use strict';

var test = require('tape');
var http = require('http');
var R = require('ramda');
var nr = require('../');

var serverUrl = 'http://localhost:1337';
var url = serverUrl + '/200';
var server;

var defaultOptions = {
  'retry': {
    'minTimeout': 0,
    'maxTimeout': 0
  }
};

test('setup', function(t) {
  var failures = 0;
  server = http.createServer(function(request, response) {
    var code = request.url.substring(1);

    if (request.url === '/200') {
      response.writeHead(code, {'Content-Type': 'text/plain'});
      response.end('<p>Hello World</p>');
    }

    if (request.url === '/301' || request.url === '/302') {
      response.writeHead(code, {'Content-Type': 'text/plain'});
      response.end('<p>Not found</p>');
    }

    if (request.url === '/404') {
      response.writeHead(code, {'Content-Type': 'text/plain'});
      response.end('<p>Not found</p>');
    }

    if (request.url === '/thirdtimeacharm') {
      if (failures < 2) {
        failures++;
        response.writeHead(500, {'Content-Type': 'text/plain'});
        response.end('<p>Server error!</p>');
      } else {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('<p>Hello World</p>');
      }
    }

    if (request.url === '/onlyfulldocument') {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.end('<html><body><p>Incomplete</p>');
    }
  }).listen(1337);

  server.on('listening', function() {
    t.end();
  });
});

test('it loads without options', function(t) {
  nr.get(url, function() {
    t.end();
  });
});

test('it loads with options', function(t) {
  nr.get(url, defaultOptions, function() {
    t.end();
  });
});

test('it can request', function(t) {
  t.plan(3);

  nr.request('get', url, null, defaultOptions, function(error, response, body) {
    t.equal(error, null);
    t.equal(response.statusCode, 200);
    t.equal(body, '<p>Hello World</p>');
  });
});

test('it can request with get', function(t) {
  t.plan(3);

  nr.get(url, defaultOptions, function(error, response, body) {
    t.equal(error, null);
    t.equal(response.statusCode, 200);
    t.equal(body, '<p>Hello World</p>');
  });
});

test('it handles errors from needle', function(t) {
  t.plan(1);

  nr.get('foo', defaultOptions, function(error) {
    t.equal(error.errno, 'ENOTFOUND');
  });
});

test('it throws on too many redirects', function(t) {
  var url = serverUrl + '/301';
  var options = R.merge(defaultOptions, {
    'needle': {
      'follow_max': 0
    }
  });

  t.plan(2);

  nr.get(url, options, function(error, response) {
    t.equal(response.statusCode, 301);
    t.equal(error.message, 'Too many redirects. Increase in needle options.');
  });
});

test('it throws on 404', function(t) {
  var url = serverUrl + '/404';

  t.plan(2);

  nr.get(url, defaultOptions, function(error, response) {
    t.equal(response.statusCode, 404);
    t.equal(error.message, 'Request failed. Status code: 404.');
  });
});

test('it throws on incomplete document option', function(t) {
  var url = serverUrl + '/onlyfulldocument';
  var options = R.merge(defaultOptions, {
    'needleRetry': {
      'fullDocument': true
    }
  });

  t.plan(2);

  nr.get(url, options, function(error, response) {
    t.equal(response.statusCode, 200);
    t.equal(error.message, 'fullDocument: not full document.');
  });
});

test('it can retry on failure', function(t) {
  t.plan(3);

  nr.get(
    serverUrl + '/thirdtimeacharm',
    defaultOptions,
    function(error, response, body) {
      t.equal(error, null);
      t.equal(response.statusCode, 200);
      t.equal(body, '<p>Hello World</p>');
    });
});

test('teardown', function(t) {
  server.close();
  t.end();
});

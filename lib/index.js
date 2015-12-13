'use strict';

var R = require('ramda');
var needle = require('needle');
var retry = require('retry');
var nr;

function getDefaults(options) {
  var defaults = {
    'needleRetry': {
      'fullDocument': false
    },
    'needle': {
      'follow_max': 20
    },
    'retry': {
      'retries': 5
    }
  };

  if (!options) {
    return defaults;
  }

  return {
    'needle': R.merge(defaults.needle, options.needle),
    'retry': R.merge(defaults.retry, options.retry),
    'needleRetry': R.merge(
      defaults.needleRetry,
      options.needleRetry
    )
  };
}

function request(method, url, data, options, callback) {
  needle.request(method, url, data, options.needle, function(error, response, body) {
    if (error) {
      return callback(error);
    }

    if (response.statusCode === 301 || response.statusCode === 302) {
      return callback(
        new Error('Too many redirects. Increase in needle options.'),
        response
      );
    }

    if (response.statusCode >= 400) {
      return callback(
        new Error('Request failed. Status code: ' + response.statusCode + '.'),
        response
      );
    }

    if (options.needleRetry.fullDocument) {
      if (body.indexOf('</html>') === -1) {
        return callback(
          new Error('fullDocument: not full document.'),
          response,
          body
        );
      }
    }

    return callback(null, response, body);
  });
}

function run(method, url, data, userOptions, callback) {
  var operation;
  var options;
  if (typeof userOptions === 'function') {
    callback = userOptions;
    options = getDefaults();
  } else {
    options = getDefaults(userOptions);
  }

  operation = retry.operation(options.retry);
  operation.attempt(function() {
    request(method, url, data, options, function(error, response, body) {
      if (operation.retry(error)) {
        return undefined;
      }

      return callback(
        error ? operation.mainError() : null,
        response,
        body
      );
    });
  });
}

nr = {
  'get': function(url, options, callback) {
    return run('get', url, null, options, callback);
  },
  'put': function(url, data, options, callback) {
    return run('put', url, data, options, callback);
  },
  'post': function(url, data, options, callback) {
    return run('post', url, data, options, callback);
  },
  'delete': function(url, data, options, callback) {
    return run('delete', url, options, callback);
  },
  'head': function(url, options, callback) {
    return run('head', url, null, options, callback);
  },
  'patch': function(url, data, options, callback) {
    return run('patch', url, data, options, callback);
  },
  'request': function(method, url, data, options, callback) {
    return run(method, url, data, options, callback);
  }
};

module.exports = nr;

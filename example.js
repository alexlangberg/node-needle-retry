var needle = require('./');

needle.get('http://www.github.com', function(error, response, body) {
  console.log('end');
  console.log(process._getActiveHandles());
  console.log(process._getActiveRequests());
});

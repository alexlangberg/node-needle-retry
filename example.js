var needle = require('./');

needle.get('http://www.github.com', function(error, response) {
  console.log(response.body);
});

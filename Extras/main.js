/* 
- For this code to work I had to remove the .body parts of the res.body.results that was in the sample code from:
	" https://codetricity.github.io/theta-s/ "

- You also must install osc-client in node.js for it to work, using NPM which is the node package downloader:
  - You must first create a package.json file with:
	" npm init "
	- You must go through some prompts as it guides you through it
  - You can install osc-client with the command:
	" npm install osc-client --save "
  - Then simply run the file in the command line with:
	" node main.js " (Or whatever the filename is and .js, e.g. (file).js)
*/


var fs = require('fs');
var OscClientClass = require('osc-client').OscClient;

var domain = '192.168.1.1';
var port = '80';
var client = new OscClientClass(domain, port);
var sessionId;
var filename;

console.log('Program start');

client.startSession().then(function(res){
	sessionId = res.results.sessionId;
	console.log('Session started with ID: %s', sessionId);
	return client.takePicture(sessionId);
})

.then(function (res) {
	var pictureUri = res.results.fileUri;
	console.log('pictureUri :%s',pictureUri);

	var path = pictureUri.split('/');
	filename = path.pop();
	console.log(filename);
	return client.getImage(pictureUri);
})

.then(function(res){
	console.log(res);
	var imgData = res;
	fs.writeFile(filename,imgData);
	return client.closeSession(sessionId);
});

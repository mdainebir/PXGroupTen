var express = require('express');
var app = express();

var cameraDomain = '192.168.1.1';
var cameraPort = '80';
var ThetaSOscClientClass = require('osc-client-theta_s').ThetaSOscClient;
var thetaClient = new ThetaSOscClientClass(cameraDomain, cameraPort);

// normal, takepicture, startcapture, stopcapture, copyimages, deletepicture, getoptions, setoptions, checkstate
app.get('/', function (req, res) {
	res.send('OSC-Client App');
})

app.get('/takePicture', function (req, res) {
	
})

app.get('/startCapture', function (req, res) {
	
})

app.get('/stopCapture', function (req, res) {
	
})

app.get('/copyImages', function (req, res) {
	
})

app.get('/deletePicture', function (req, res) {
	
})

app.get('/getOptions', function (req, res) {
	var options = ['_captureInterval', '_captureNumber'];	// the options that will be gotten by get options

	thetaClient.startSession()
	.then(function(res){
		sessionId = res.results.sessionId;
		return thetaClient.getOptions(sessionId, options);
	})

	.then(function(res) {
		gotten = res.results;
	});
	res.send(gotten);
})

app.get('/setOptions', function (req, res) {
	var options = ['_captureInterval='+req.query.interval, '_captureNumber='+req.query.number];	

	thetaClient.startSession()
	.then(function(res){
		var sessionId = res.results.sessionId;
		console.log('Session started with ID: %s', sessionId);
		return thetaClient.setOptions(sessionId, options);
	})
	.then(function(res) {
		console.log(res);
	});
	res.send('Interval set to: ' + req.query.interval + '\n'
		+'Number of shots set to: ' + req.query.number + '\n');
})

app.get('/checkState', function (req, res) {
	
})

app.listen(3000, '127.0.0.1', function() {
	console.log('Server running on http://127.0.0.1:3000/');
})

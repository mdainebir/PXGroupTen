const url = require('url');
const fs = require('fs');
const shell = require('shelljs');
const ip = require('ip');
const express = require('express');

// the camera's details
var cameraDomain = '192.168.1.1';
var cameraPort = '80';

var OscClientClass = require('osc-client').OscClient;
var client = new OscClientClass(cameraDomain, cameraPort);

// a separate package that allows continuous shooting
var ThetaSOscClientClass = require('osc-client-theta_s').ThetaSOscClient;
var thetaClient = new ThetaSOscClientClass(cameraDomain, cameraPort);

//details for the http server
const http = require('http');
const httpHost = '127.0.0.1';
const httpPort = 3000;

//express for other certain functionalities
const app = express();

var sessionId;				// the session ID to be used
var options = ['_captureInterval', '_captureNumber', 'exposureCompensation', 'aperture', 'iso', 'shutterSpeed'];
					// the options that will be gotten by get options

//try both ajax and jquery
	// done (Y)

// the http server request handler
const requestHandler = (request, response) => {
	// enable cross original resource sharing to allow html page to access commands
	response.setHeader('Access-Control-Allow-Origin', '*');

	// return to the console the URL that is being accesssed
	console.log(request.url);
	var url_parts = url.parse(request.url, true);
	console.log(url_parts);

	if (url_parts.pathname == '/') {
		response.end('Hello Node.js Server!\n');

	} else if (url_parts.pathname == '/takePicture')  {
		// tells the user that a picture is being taken and then calls the takePicture function		
		takePicture(function(result) {
			response.end(result + "\n");
		});
		
	} else if (url_parts.pathname == '/startInterval') {
		startInterval(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/stopInterval') {
		stopInterval(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/nodeInterval') {
		nodeInterval(url_parts.query.interval, url_parts.query.number, url_parts.query.exposure, function(result) {
			response.end('Starting Node.JS interval shooting with:\n'
				+ url_parts.query.number + ' shots being taken every ' + url_parts.query.interval + ' seconds.\n');
		});

	} else if (url_parts.pathname == '/copyImages') {
		// creates a new folder and copies the top most image into that folder
		copyImages(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/createVideo') {
		// shelljs library
		// ffmpeg -start_number [5 digits after R00] -r (rate of input) 1 -1 R00%d.JPG -r (rate of output) 1 -vcodec mpeg4 			[filename]

		var dir = './images';
		var method = url_parts.query.method;

		var imageStart = url_parts.query.imageStart;
		var imageStart = imageStart.substr(3, 5);

		// end image as chosen by the user
		var imageEnd = url_parts.query.imageEnd;
		var imageEnd = imageEnd.substr(3, 5);

		var outputName = url_parts.query.outputName;
		var outputName = outputName + '.mp4';

		if (method == 'ffmpeg') {
		//start counter and end counter that converts into frame count in ffmpeg
		var vframes = imageEnd - imageStart;

		// modify timelapse output framerate
		var frameRate = url_parts.query.frameRate;	

		shell.cd(dir);
		shell.exec('ffmpeg -start_number ' + imageStart + 
					' -r 1 -i R00%d.JPG -vframes ' + vframes + ' -r ' + frameRate + ' -vcodec mpeg4 ' + outputName, 
		function() {		
			response.end('Video written to: ' + dir + '/' + outputName + "\n"
					+ 'Using the FFMpeg package.\n');
		});

		} else if (method == 'melt') {
		
		var currentImage = imageStart;
		var meltcommand = 'melt -profile equ_uhd_2688p_25 ';
		
		meltcommand += url_parts.query.imageStart + ' out=30 ';

		var numImages = imageEnd - imageStart;

		for(var i = 0; i < numImages; i++) {
			currentImage++;
			meltcommand += 'R00' + (currentImage) + '.JPG out=60 -mix 25 -mixer luma ';
		}

		meltcommand += '-consumer avformat:' + outputName + ' vodec=libx264 an=1'	

		shell.exec(meltcommand);

		}

	} else if (url_parts.pathname == '/listImages') {
		// lists the 20 newest images that have been taken
		listImages(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/deletePicture') {
		// delete an image based on the parameter given by the user
		deletePicture(url_parts.query.fileUri, function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/getOptions') {
		// lists the images stated in the array above, can be changed to user input
		getOptions(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/setOptions') {
		// changes the options based on the user input
		setOptions(url_parts.query.interval, url_parts.query.number, function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/checkState') {
		// gets the state of the camera
		checkState(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/getFiles') {
		var dir = './images';

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}

		var file = (fs.readdirSync(dir));
		response.writeHead(200, {"Content-Type": "application/json"});
		var json = JSON.stringify(file);
		response.end(json);

	} else {
		response.end('This page does not exist.\n');
	}
	
}

// create a server that listens on the details given before, using the request handler
const server = http.createServer(requestHandler);

server.listen(httpPort, httpHost, (err) => {
	if (err) {
		return console.log('Error', err);
	}

	console.log('server is listening at http://%s:%s/', httpHost, httpPort);
})


makeSession = function(callback) {
	//starts session if isn't one, otherwise updates current	
	client.startSession().then(function(res){
		sessionId = res.results.sessionId;
		console.log('Session started with ID: %s', sessionId);
		callback();
	});
}

takePicture = function(callback) {
	// starts a new session and gives that session to the takePicture
	// which takes a print and prints the ID and the uri
	
	if (!sessionId) {	
		makeSession(takePicture());
	} else {
		client.takePicture(sessionId)
		.then(function(res) {
			var pictureUri = res.results.fileUri;
			return (callback('Picture taken with URI: ' + pictureUri));
		});
	}
}

startInterval = function(callback) {
	if (!sessionId) {
		makeSession(startInterval);
	} else {
		thetaClient.startCapture(sessionId);
		return (callback('Capture has started'));
	}
}

stopInterval = function(callback) {
	thetaClient.stopCapture(sessionId);
	callback('Capture has stopped');
}

nodeInterval = function(interval, number, exposure, callback) {
	var timeout = interval * 1000;
	var exposureVal;
	//shutter speed, aperture, iso
		
	//exposure control flag
		//done
	//structure with exposure compensation variables, check it against timelapse progress, choose closest possible exposure settings
	var exposureCompensation = [-2.0, -1.7, -1.3, -1.0, -0.7, -0.3, 0.0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0];
	var adjustedTime = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];	

	for (var i = 0; i < number; i++) {
		setTimeout(function (i) {
			if (exposure == 'true') {
				var date = new Date();
				var hour = date.getHours();

				var progress = (adjustedTime[hour] / 12) * 4 - 2;
				progress = progress * -1;
				
				exposureVal = closest(progress, exposureCompensation);

				// exposure control function

				var exposureSetting = { exposureCompensation: parseInt(exposureVal) };
				client.setOptions(sessionId, exposureSetting)
				.then(function() {
				//how to confirm that it happens before take picture
				//how to check if setoptions fails			

				if (!sessionId) {	
					makeSession(takePicture);
				} else {
					client.takePicture(sessionId)
				}
				callback();
				});
			} else {
				//set exposure to default, no exposure settings, just take pictures
				exposureVal = 0;
				var exposureSetting = { exposureCompensation: parseInt(exposureVal) };
				client.setOptions(sessionId, exposureSetting).then(function() {
				
				if (!sessionId) {	
					makeSession(takePicture);
				} else {
					client.takePicture(sessionId)
				}
				callback();
				});
			}
		}, timeout * i, i);
			// change camera settings during shooting
	}
}

/* Function taken from:
 * http://www.stackoverflow.com/questions/8584902/get-closest-number-out-of-array/
 */
closest = function(num, arr) {
	var mid;
	var lo = 0;
	var hi = arr.length - 1;
	while (hi - lo > 1) {
		mid = Math.floor ((lo + hi) / 2);
		if (arr[mid] < num) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	if (num - arr[lo] <= arr[hi] - num) {
		return arr[lo];
	}
	return arr[hi];
}	

listImages = function(callback) {
	// lists the entry count and if there is a thumbnail
	// then gets the images based on entry count and lists their details
	var entryCount = 1;
	var includeThumb = false;

	client.listImages(entryCount, includeThumb)
	.then(function(res){
		entryCount = res.results.totalEntries;
		return client.listImages(entryCount, includeThumb);
	}).then(function(res){
		// interpret the object as string	
		var list = JSON.stringify(res.results.entries, null, 4);
		callback('There are a total of ' + entryCount + ' images on the camera.\n' + list);
	});
}

copyImages = function(callback) {
	// creates a new folder on the desktop based on the dir variable, if it doesn't exist
	// lists the newest image on the camera, and gets the uri and name of the image
	// combines the name of the file with the directory to put it in the newly created folder

	// check how many images are there on the camera
	// get all images off camera
	// callsback to itself until there are no images left

	var dir = './images';

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	var totalImages = 0;
	var approxTime = 0;
	var interval = 30 * 1000; // 30 seconds

	var entryCount = 1;
	var includeThumb = false;
	var filename;
	var fileuri;

	client.listImages(entryCount, includeThumb)
	.then(function(res){
		totalImages = res.results.totalEntries;
		approxTime = totalImages * 5;
		callback('Copying a total of: ' + totalImages + ' images'
			+ '\nTo folder: ' + dir
			+ '\nThis process will take approximately: ' + approxTime + ' seconds');
	});

	client.listImages(entryCount, includeThumb)
	.then(function(res) {
		filename  = dir + '/' + res.results.entries[0].name;
		fileuri = res.results.entries[0].uri;
		imagesLeft = res.results.totalEntries;
		client.getImage(res.results.entries[0].uri)
		.then(function(res){
			var imgData = res;
			fs.writeFile(filename, imgData);
			client.delete(fileuri).then(function() {
				if (imagesLeft != 0) {
					callback(copyImages());
				} else {
					callback();
				}
			});
		});
	});
		
}

deletePicture = function(uri, callback) {
	// deletes an image based on the uri given by the user
	var fileuri = uri;

	client.delete(fileuri).then(function() {
		callback('Deleted file: ' + fileuri);
	});
}

getOptions = function(callback){
	// starts a session to query the camera options
	// and then gets the options based on the array declared up top
	// can be changed later so the user can choose what options to get

	if (!sessionId) {	
		makeSession(getOptions);
	} else {
		client.getOptions(sessionId, options)
		.then(function(res) {
			var get = JSON.stringify(res, null, 4);
			return (callback(get));
		});
	}

}

setOptions = function(interval, number, callback) {
	// gets the user input based on the url and passes it to this function
	// which updates the camera settings
	// the _captureInterval value must be above 8, can be handled with some validation

	var newOptions = { _captureInterval: + parseInt(interval), _captureNumber: + parseInt(number)};
	
	if (!sessionId) {
		makeSession(sessionId);
	} else {
		client.setOptions(sessionId, newOptions)
		.then(function() {
			return (callback('Interval has been set to: ' + interval + 
					'\nNumber has been set to: ' + number));
		});
	}
}

checkState = function(callback) {
	// queries the camera and returns the state of the camera
	client.getState()
	.then(function(res) {
		var state = JSON.stringify(res, null, 4);
		callback(state);
	});
}

// handles error downloading and listens on port 3001
app.listen(3001, httpHost);

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	next();
})

app.get('/download', function (req, res) {
	var file = 'images/' + req.query.fileName;
	res.download(file);
})

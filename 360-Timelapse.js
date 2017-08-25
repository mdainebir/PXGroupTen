// extra packages that are required
const url = require('url');
const fs = require('fs');
const shell = require('shelljs');
const ip = require('ip');
const express = require('express');

// the camera's details, always the same
var cameraDomain = '192.168.1.1';
var cameraPort = '80';

// the OSC package that is used for majority of camera commication
var OscClientClass = require('osc-client').OscClient;
// client object made based on connection to camera
var client = new OscClientClass(cameraDomain, cameraPort);

// a separate package that allows continuous shooting
var ThetaSOscClientClass = require('osc-client-theta_s').ThetaSOscClient;
var thetaClient = new ThetaSOscClientClass(cameraDomain, cameraPort);

// details for the http server
const http = require('http');
const httpHost = '127.0.0.1';	// change based on host's IP address
const httpPort = 3000;		// change based on port needed

//express for other certain functionalities
const app = express();

var sessionId;	// the session ID to be used
		// the options that will be gotten by get options
var options = ['_captureInterval', '_captureNumber', 'exposureCompensation', 'aperture', 'iso', 'shutterSpeed'];

// the http server request handler
const requestHandler = (request, response) => {
	// enable cross original resource sharing to allow html page to access commands
	response.setHeader('Access-Control-Allow-Origin', '*');

	// return to the console the URL that is being accesssed, leaving for clarity
	console.log(request.url);
	var url_parts = url.parse(request.url, true);

	if (url_parts.pathname == '/') {

		// basic response if user visits /
		response.end('Hello Node.js Server!\n');

	} else if (url_parts.pathname == '/takePicture')  {

		// user accesses the address /takePicture, and the takePicture function is called
		takePicture(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/startInterval') {

		// user accesses /startInterval and the startInterval function is called
		startInterval(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/stopInterval') {

		// user accesses /stopInterval and the stopInterval function is called
		stopInterval(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/nodeInterval') {

		// user accesses /nodeInterval and the nodeInterval function is called
		// url.query objects are passed to it
		nodeInterval(url_parts.query.interval, url_parts.query.number, url_parts.query.exposure, function(result) {
			response.end('Starting Node.JS interval shooting with:\n'
				+ url_parts.query.number + ' shots being taken every ' + url_parts.query.interval + ' seconds.\n');
		});

	} else if (url_parts.pathname == '/copyImages') {

		// user accesses /copyImages and the copyImages function is called
		copyImages(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/createVideo') {
		// user access the path /createVideo
		/* THE MELT PARTS OF THIS CODE DO NOT WORK CORRECTLY */

		// a directory is initialised, which is where the video will be saved

		var dir = './images';

		// get how the user would like to produce a video, either ffmpeg or melt
		var method = url_parts.query.method;

		// get the start image, which will be in format R00xxxxx.JPG
		var imageStart = url_parts.query.imageStart;
		// extract the middle 5 numbers
		var imageStart = imageStart.substr(3, 5);

		// get end image chosen by the user, which will be format R00xxxxx.JPG
		var imageEnd = url_parts.query.imageEnd;
		// extrac tthe middle 5 numbers
		var imageEnd = imageEnd.substr(3, 5);

		// get the output name as specific by the user
		var outputName = url_parts.query.outputName;
		// attach a file type to the end of the chosen output name
		var outputName = outputName + '.mp4';

		//if the user has selected FFMPEG for video creation
		if (method == 'ffmpeg') {

			// subtract the extracted end from the extracted start to find number of images to use
			var vframes = imageEnd - imageStart;

			// get the framerate that was specificed by the user
			var frameRate = url_parts.query.frameRate;

			// change current shelljs directory to the images folder
			shell.cd(dir);
			// run the ffmpeg command, will need to be changed on the Pi
			// passes the start number, no. of images, framerate and outputname
			shell.exec('ffmpeg -start_number ' + imageStart +
						' -r 1 -i R00%d.JPG -vframes ' + vframes + ' -r ' + frameRate + ' -vcodec mpeg4 ' + outputName,
			function() {
				// inform the user when process is complete
				response.end('Video written to: ' + dir + '/' + outputName + "\n"
						+ 'Using the FFMpeg package.\n');
			});

		} else if (method == 'melt') {

			// get current image based on image start
			var currentImage = imageStart;

			// begin melt command, uses custom profile
			var meltcommand = 'melt -profile equ_uhd_2688p_25 ';

			// add the beginning image to the melt command
			meltcommand += url_parts.query.imageStart + ' out=30 ';

			// get the number of images to be used
			var numImages = imageEnd - imageStart;

			// loop to append the command based on images used
			for(var i = 0; i < numImages; i++) {
				currentImage++;
				meltcommand += 'R00' + (currentImage) + '.JPG out=60 -mix 25 -mixer luma ';
			}

			// add final parts to the command
			meltcommand += '-consumer avformat:' + outputName + ' vcodec=libx264 an=1'

			// execute the command
			shell.exec(meltcommand, function() {
				// inform the user when process is complete
				response.end('Video written to: ' + dir + '/' + outputName + "\n"
						+ 'Using the Melt package.\n');
			});

		}

	} else if (url_parts.pathname == '/listImages') {

		// user accesses the /listImages address and calls the listImages function
		listImages(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/deletePicture') {

		// user accesses the /deletePicture and call the deletePicture function, passing the fileUri
		deletePicture(url_parts.query.fileUri, function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/getOptions') {

		// user accesses /getOptions
		getOptions(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/setOptions') {

		// user accesses /setOptions, and passes interval and number
		setOptions(url_parts.query.interval, url_parts.query.number, function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/checkState') {

		// user access /checkState
		checkState(function(result) {
			response.end(result + "\n");
		});

	} else if (url_parts.pathname == '/getFiles') {

		// gets the files in the images folder
		// populate a drop down in the .html page that enables downloading
		var dir = './images';

		var file = (fs.readdirSync(dir));
		response.writeHead(200, {"Content-Type": "application/json"});
		var json = JSON.stringify(file);
		response.end(json);

	} else {

		// if the user accesses any of the not listed pages
		response.end('This page does not exist.\n');

	}

}

// create a server that listens on the details given before, using the request handler
const server = http.createServer(requestHandler);

server.listen(httpPort, (err) => {
	if (err) {
		return console.log('Error', err);
	}

	console.log('server is listening at *:%s', httpPort);
})


makeSession = function(called) {

	//starts session if there isn't one, and returns to the function that called it
	client.startSession().then(function(res){
		sessionId = res.results.sessionId;
		console.log('Session started with ID: %s', sessionId);
		called();
	});
}

takePicture = function(callback) {

	// starts a new session if there isn't one
	// takes a picture and prints the URI of the picture taken
	if (!sessionId) {
		makeSession(takePicture);
	} else {
		client.takePicture(sessionId)
		.then(function(res) {
			var pictureUri = res.results.fileUri;
			return (callback('Picture taken with URI: ' + pictureUri));
		});
	}
}

startInterval = function(callback) {

	// starts a new session if there isn't one
	// starts interval shooting using the second theta package
	if (!sessionId) {
		makeSession(startInterval);
	} else {
		thetaClient.startCapture(sessionId);
		return (callback('Capture has started'));
	}
}

stopInterval = function(callback) {

	// stops the currently running capture
	thetaClient.stopCapture(sessionId);
	callback('Capture has stopped');
}

nodeInterval = function(interval, number, exposure, callback) {

	// get the milliseconds for interval, as timeout uses milliseconds
	var timeout = interval * 1000;

	// global exposureVal to be used later
	var exposureVal;

	//structure with exposure compensation variables, check it against timelapse progress, choose closest possible exposure settings
	var exposureCompensation = [-2.0, -1.7, -1.3, -1.0, -0.7, -0.3, 0.0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0];

	// adjusted time of day that works better for the day/night cycle
	var adjustedTime = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

	// for the amount of shots the user specificied
	for (var i = 0; i < number; i++) {
		// time out based on interval
		setTimeout(function (i) {

			// if user wanted exposure settings
			if (exposure == 'true') {

				// get the hour of the day
				var date = new Date();
				var hour = date.getHours();

				// get the progress of the day and make it in a range between -2 and 2
				var progress = (i / number) * 4 - 2;
				// invert progress, as -2.0 is darker and 2.0 is brighter
				progress = progress * -1;

				// find the closest value in the exposureCompensation array compared to the progress
				exposureVal = closest(progress, exposureCompensation);

				// json array that is used to change camera settings
				var exposureSetting = { exposureCompensation: parseInt(exposureVal) };

				// update exposure value on camera
				client.setOptions(sessionId, exposureSetting)
				.then(function() {
					//take picture with new settings
					if (!sessionId) {
						makeSession(takePicture);
					} else {
						client.takePicture(sessionId)
					}
					callback();
				});
			} else {

				// if user doesn't want exposure settings

				// reset exposure val to neutral
				exposureVal = 0;
				var exposureSetting = { exposureCompensation: parseInt(exposureVal) };
				client.setOptions(sessionId, exposureSetting)
				.then(function() {
					// take pictures with these settings
					if (!sessionId) {
						makeSession(takePicture);
					} else {
						client.takePicture(sessionId)
					}
					callback();
				});
			}
		}, timeout * i, i);
	}
}

/* Function taken from:
 * http://www.stackoverflow.com/questions/8584902/get-closest-number-out-of-array/
 */
// used to find the closest value in the exposure compensation array
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
	// gets the first image and do not include thumbnails
	var entryCount = 1;
	var includeThumb = false;

	// list the first image
	client.listImages(entryCount, includeThumb)
	.then(function(res){
		// get the total number of images
		entryCount = res.results.totalEntries;

		//return the full list of images
		return client.listImages(entryCount, includeThumb);
	}).then(function(res){
		// interpret the object as string
		var list = JSON.stringify(res.results.entries, null, 4);
		callback('There are a total of ' + entryCount + ' images on the camera.\n' + list);
	});
}

copyImages = function(callback) {

	// creates a new a folder in the current working directory called images
	var dir = './images';

	// if the directory does not exist, make it
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	// initialise total images, approximate time
	var totalImages = 0;
	var approxTime = 0;

	// get the first image and do not include thumbnail
	var entryCount = 1;
	var includeThumb = false;
	var filename;
	var fileuri;

	// get the total amount of images
	client.listImages(entryCount, includeThumb)
	.then(function(res){
		totalImages = res.results.totalEntries;
		approxTime = totalImages * 5;
		callback('Copying a total of: ' + totalImages + ' images'
			+ '\nTo folder: ' + dir
			+ '\nThis process will take approximately: ' + approxTime + ' seconds');
	});

	// copy a single image, with the same name and put it in images folder
	client.listImages(entryCount, includeThumb)
	.then(function(res) {
		filename  = dir + '/' + res.results.entries[0].name;
		fileuri = res.results.entries[0].uri;
		imagesLeft = res.results.totalEntries;

		// gets the image data
		client.getImage(res.results.entries[0].uri)
		.then(function(res){

			var imgData = res;
			fs.writeFile(filename, imgData);
			client.delete(fileuri).then(function() {
				// deletes the image on the camera after copying
				if (imagesLeft != 0) {
					// callback to itself to continue copying if images are left
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

	// starts a session if there isn't one
	if (!sessionId) {
		makeSession(getOptions);
	} else {

		// get options based on array above, can be changed
		client.getOptions(sessionId, options)
		.then(function(res) {

			// return the json and print as a string
			var get = JSON.stringify(res, null, 4);
			return (callback(get));
		});
	}

}

setOptions = function(interval, number, callback) {

	// puts user input into a json object
	var newOptions = { _captureInterval: + parseInt(interval), _captureNumber: + parseInt(number)};

	// make session if there isn't one
	if (!sessionId) {
		makeSession(sessionId);
	} else {

		// change options based on user selection
		client.setOptions(sessionId, newOptions)
		.then(function() {
			return (callback('Interval has been set to: ' + interval +
					'\nNumber has been set to: ' + number));
		});
	}
}

checkState = function(callback) {

	// returns the state of the camera
	client.getState()
	.then(function(res) {
		// interpret json object as string, with formatting
		var state = JSON.stringify(res, null, 4);
		callback(state);
	});
}

// handles downloading and listens on port 3001
app.listen(3001, httpHost);

// allow CORS on the express server
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	next();
})

// give a download link based on filename
app.get('/download', function (req, res) {
	var file = 'images/' + req.query.fileName;
	res.download(file);
})

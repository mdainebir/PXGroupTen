// extra packages that are required
const url = require('url');
const fs = require('fs');
const shell = require('shelljs');
const ip = require('ip');
const express = require('express');
const path = require('path');
const tcpp = require('tcp-ping');

//split this createVideo fn out because it looks too long and messy
const createVideo = require( path.resolve( __dirname, "./createVideo.js" ) );

// the camera's details, always the same
var cameraIP = '192.168.1.1';
var camera1Port = '80';
var camera2Port = '81';
var imageFolder = 'images';

// the OSC package that is used for majority of camera commication
var OscClientClass = require('osc-client').OscClient;
// client object made based on connection to camera
var oscClient = new OscClientClass(cameraIP, camera1Port);

// a separate package that allows continuous shooting
var ThetaSOscClientClass = require('osc-client-theta_s').ThetaSOscClient;
var thetaClient = new ThetaSOscClientClass(cameraIP, camera1Port);

var sessionId="";	// the session ID to be used
		// the options that will be gotten by get options
var options = ['_captureInterval', '_captureNumber', 'exposureCompensation', 'aperture', 'iso', 'shutterSpeed'];

var cameraConnected = false;

//setTimeout(pingCamera(cameraIP,camera1Port,cameraConnected), 5000);

// details for the express server
const expressPort = 3000;	// change based on port needed

//express for other certain functionalities
const expressServer = express();

// handles downloading and listens on expressPort
expressServer.listen( expressPort, function() {
    console.log('expressServer listening at *:%d', expressPort );
	
});

// server static pages from /public/ folder
expressServer.use( '/public', express.static( 'public' ));

// allow CORS on the express server
expressServer.use(function(req, res, next) {
	// enable cross original resource sharing to allow html page to access commands
	res.header("Access-Control-Allow-Origin", "*");
	
	// return to the console the URL that is being accesssed, leaving for clarity
	console.log("\n"+req.url);
	
	next();
});


// **************************All express gets are here********************************************************************************************

expressServer.get('/hello', function(req, res) {
	// basic response if user visits /
	res.send('Hello I am Node.js Express Server!\n');
});

expressServer.get('/startSession', function(req, res) {
	makeSession(function(result){
	res.end(result + "\n");
	});
});


expressServer.get('/takePicture', function(req, res) {
	takePicture(function(result) {
		res.end(result + "\n");
	});
});

// give a download link based on filename
expressServer.get('/download', function (req, res) {
	var file = 'images/' + req.query.fileName;
	res.download(file);
});

expressServer.get('/listImages', function(req, res) {
	// user accesses the /listImages address and calls the listImages function
	listImages(function(result) {
		res.end(result + "\n");
	});		
});

//codes after this line is added on 12/09/17

expressServer.get('/startInterval', function(req, res) {
	// user accesses /startInterval and the startInterval function is called
	startInterval(function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/stopInterval', function (req, res) {
	// user accesses /stopInterval and the stopInterval function is called
	stopInterval(function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/nodeInterval', function (req, res) {
	// user accesses /nodeInterval and the nodeInterval function is called
	// url.query objects are passed to it
	nodeInterval(url_parts.query.interval, url_parts.query.number, url_parts.query.exposure, function(result) {
		res.end('Starting Node.JS interval shooting with:\n'
			+ url_parts.query.number + ' shots being taken every ' + url_parts.query.interval + ' seconds.\n');
	});
});

expressServer.get('/copyImages', function (req, res) {
	// user accesses /copyImages and the copyImages function is called
	copyImages(function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/deletePicture', function(req, res) {
	// user accesses the /deletePicture and call the deletePicture function, passing the fileUri
	deletePicture(url_parts.query.fileUri, function(result) {
		res.end(result + "\n");
	});	
});

expressServer.get('/getOptions', function(req, res) {
	// user accesses /getOptions
	getOptions(function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/setOptions', function(req, res) {
	// user accesses /setOptions, and passes interval and number
	setOptions(url_parts.query.interval, url_parts.query.number, function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/checkState', function(req, res) {
	// user access /checkState
	checkState(function(result) {
		res.end(result + "\n");
	});
});

expressServer.get('/getFiles', function(req, res) {
	// gets the files in the images folder
	// populate a drop down in the .html page that enables downloading
	if (!fs.existsSync( imageFolder )) {
		console.log("'images' folder does not exist");
		console.log("creating a new 'images' folder...");
		
		fs.mkdirSync( imageFolder );
		console.log("the new folder is created!");
		
	}
	else{
		console.log("found 'images' folder");
		console.log("reading the folder for image files...");

		var file = (fs.readdirSync( imageFolder ));
		if (file.length==0) console.log("no image found")
		else console.log("%s images are now loaded to Retrieve tab interface",file.length);
		res.writeHead(200, {"Content-Type": "application/json"});
		var json = JSON.stringify(file);
		res.end("Loaded images are as below: \n"+json);
		
		
	}
});

// *****************************All functions are here ******************************************************************************************************
makeSession=function(callback){
	var result="";
	if(sessionId==""){
		//starts session if there isn't one, and returns to the function that called it
		oscClient.startSession().then(function(res){
			sessionId = res.results.sessionId;
			result="Session started with ID: "+ sessionId;
			console.log(result);	
			return (callback(result));
		});
	}
	else 
	{
		result="Existing session ID is: "+sessionId;
		console.log(result);
		return(callback(result));
	}
}

takePicture = function(callback) {
	
	var result="";
	// starts a new session if there isn't one
	// takes a picture and prints the URI of the picture taken
	if (!sessionId) {
		makeSession(takePicture);
	} else {
		result='Preparing to take a picture. Please wait...';
		console.log(result);
		oscClient.takePicture(sessionId)
		.then(function(res) {
			var pictureUri = res.results.fileUri;
			result='Picture taken with URI: ' + pictureUri;
			console.log(result);
			return (callback(result));
		}).catch(function(error){
			console.log('* Oops, somethingn is disconnected e.g. wifi, camera or Pi \n'+error);
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
				oscClient.setOptions(sessionId, exposureSetting)
				.then(function() {
					//take picture with new settings
					if (!sessionId) {
						makeSession(takePicture);
					} else {
						oscClient.takePicture(sessionId)
					}
					callback();
				});
			} else {

				// if user doesn't want exposure settings

				// reset exposure val to neutral
				exposureVal = 0;
				var exposureSetting = { exposureCompensation: parseInt(exposureVal) };
				oscClient.setOptions(sessionId, exposureSetting)
				.then(function() {
					// take pictures with these settings
					if (!sessionId) {
						makeSession(takePicture);
					} else {
						oscClient.takePicture(sessionId)
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
	var result="";

	// list the first image
	oscClient.listImages(entryCount, includeThumb)
	.then(function(res){
		// get the total number of images
		entryCount = res.results.totalEntries;

		//return the full list of images
		return oscClient.listImages(entryCount, includeThumb);
	}).then(function(res){
		// interpret the object as string
		var list = JSON.stringify(res.results.entries, null, 4);
		if (entryCount==0) result='No image left in camera to list'
		else result='There are a total of ' + entryCount + ' images on the camera.\n' + list;
		console.log(result);
		callback(result);
	});
}

copyImages = function(callback) {

	// if the directory does not exist, make it
	if (!fs.existsSync( imageFolder )) {
		fs.mkdirSync( imageFolder );
		console.log("no 'images' folder found, so a new one has been created!");
	}

	// initialise total images, approximate time
	var totalImages = 0;
	var approxTime = 0;

	// get the first image and do not include thumbnail
	var entryCount = 1;
	var includeThumb = false;
	var filename;
	var fileuri;
	var result="";

	// get the total amount of images
	oscClient.listImages(entryCount, includeThumb)
	.then(function(res){
		totalImages = res.results.totalEntries;
		approxTime = totalImages * 5;
		result='Copying a total of: ' + totalImages + ' images'
			+ '\nTo folder: ' + imageFolder
			+ '\nThis process will take approximately: ' + approxTime + ' seconds';
		console.log(result);
		callback(result);
	});

	// copy a single image, with the same name and put it in images folder
	oscClient.listImages(entryCount, includeThumb)
	.then(function(res) {
		filename  = imageFolder + '/' + res.results.entries[0].name;
		fileuri = res.results.entries[0].uri;
		imagesLeft = res.results.totalEntries;

		// gets the image data
		oscClient.getImage(res.results.entries[0].uri)
		.then(function(res){

			var imgData = res;
			fs.writeFile(filename, imgData);
			oscClient.delete(fileuri).then(function() {
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
	oscClient.delete(fileuri).then(function() {
		callback('Deleted file: ' + fileuri);
	});
}

getOptions = function(callback){

	// starts a session if there isn't one
	if (!sessionId) {
		makeSession(getOptions);
	} else {
		try{
			// get options based on array above, can be changed
			oscClient.getOptions(sessionId, options)
			.then(function(res) {
				// return the json and print as a string
				var get = JSON.stringify(res, null, 4);
				if (get!=null) console.log("some camera options found")
				else	console.log('no option found');
				return (callback(get));
			}).catch(function(error){
				console.log('* Oops, somethingn is disconnected e.g. wifi, camera or Pi \n'+error);
			});
		}
		catch(error){
			console.log('* Oops, somethingn is disconnected e.g. wifi, camera or Pi \n'+error);
		}
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
		oscClient.setOptions(sessionId, newOptions)
		.then(function() {
			return (callback('Interval has been set to: ' + interval +
					'\nNumber has been set to: ' + number));
		});
	}
}


checkState = function(callback) {
	// ping the camera on port 80 and return if the camera is connected
	tcpp.probe('192.168.1.1', 80, function(err, available) {
		if (available == true) {
			// returns the state of the camera
			oscClient.getState()
			.then(function(res) {
				// interpret json object as string, with formatting
				var state = JSON.stringify(res, null, 4);
				if (state!=null) console.log("camera state found")
				else	console.log('no camera state found');
				callback(state);
			});
		} else {
			cameraConnected = false;
			console.log('Camera NOT Connected');
		}	
		console.log(available);
	});

}

pingCamera = function(callback) {
	tcpp.probe(cameraIP, cameraPort, function(err, available) {
		if (available == true) {
			cameraConnected = true;
			console.log('Camera Connected');
		} else {
			cameraConnected = false;
			console.log('Camera NOT Connected');
		}	
		console.log(available);
	});
	return cameraConnected;
}




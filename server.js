// extra packages that are required
const url = require('url');
const fs = require('fs');
const shell = require('shelljs');
const ip = require('ip');
const express = require('express');
const path = require('path');
const tcpp = require('tcp-ping');
const Domain = require('domain');

// create a domain for the use of error handling
const d = Domain.create();

//split this createVideo fn out because it looks too long and messy
//const createVideo = require( path.resolve( __dirname, "./createVideo.js" ) );

// the camera's details, always the same
//var cameraIP = '127.0.0.1';
//var camera1Port = '7777';
//var camera2Port = '7778';
var baseImageFolder = 'images';
var makeFramesRunning=false;

// the OSC package that is used for majority of camera commication
var OscClientClass = require('osc-client').OscClient;
var ThetaSOscClientClass = require('osc-client-theta_s').ThetaSOscClient;

// client object made based on connection to camera

// array for cameras
camArray = [{'ip': '127.0.0.1', 'port': 7777, 'sessionId': '', 'active': true, 'working': true},
	    {'ip': '127.0.0.1', 'port': 7778, 'sessionId': '', 'active': true, 'working': true}];

// array for oscClient
for(var i=0; i<camArray.length; i++){
	camArray[i].oscClient = new OscClientClass(camArray[i].ip, camArray[i].port);
        camArray[i].thetaClient = new ThetaSOscClientClass();
}

// the options that will be gotten by get options
var options = ['_captureInterval', '_captureNumber', 'exposureCompensation', 'aperture', 'iso', 'shutterSpeed'];

var cameraConnected = false;


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
	takePicture(function(resultPic) {
		res.end(resultPic + "\n");
	});
});
expressServer.get('/createVideo', function(req, res) {
	var url_parts = url.parse(req.url, true);
	
	//createVideo(url_parts, function(result) {res.end(result + "\n");});
	createVideo(url_parts, res);
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
	var url_parts = url.parse(req.url, true);
	// user accesses /nodeInterval and the nodeInterval function is called
	// url.query objects are passed to it
	nodeInterval(url_parts.query.interval, url_parts.query.number, url_parts.query.exposure, url_parts.query.HDR,  function(result) {
console.log("exposure: " + url_parts.query.exposure);
console.log("HDR: " + url_parts.query.HDR);
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
	var url_parts = url.parse(req.url, true);
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
	var url_parts = url.parse(req.url, true);
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

expressServer.get('/getFiles', function(req, res, camID) {
	// gets the files in the images folder
	// populate a drop down in the .html page that enables downloading
//	var imageFolder = baseImageFolder + camID;
	var imageFolder = "images";
	var images0, images1;
	if (!fs.existsSync( 'images0' ) && !fs.existsSync( 'images1' )) {
		console.log("'images' folder does not exist");
		console.log("creating a new 'images' folder...");
		
//		fs.mkdirSync( imageFolder );
//		fs.mkdirSync( 'images0' );
//		fs.mkdirSync( 'images1' );
		console.log("the new folder is created!");
	}
	else{
		console.log("found 'images' folder");
		console.log("reading the folder for image files...");

		var file = (fs.readdirSync( 'images' ));
		if (file.length==0) console.log("no image found")
		else console.log("%s images are now loaded to Retrieve tab interface",file.length);
		res.writeHead(200, {"Content-Type": "application/json"});
		var json = JSON.stringify(file);
		res.end(json);
	}
});

expressServer.get('/getFilesImages0', function(req, res, camID) {
        // gets the files in the images folder
        // populate a drop down in the .html page that enables downloading
//      var imageFolder = baseImageFolder + camID;
        var imageFolder = "images";
        var images0, images1;
        if (!fs.existsSync( 'images0' ) && !fs.existsSync( 'images1' )) {
                console.log("'images' folder does not exist");
                console.log("creating a new 'images' folder...");

//              fs.mkdirSync( imageFolder );
                fs.mkdirSync( 'images0' );
                fs.mkdirSync( 'images1' );
                console.log("the new folder is created!");

        }
        else{
                console.log("found 'images' folder");
                console.log("reading the folder for image files...");

                var file = (fs.readdirSync( 'images0' ));
                if (file.length==0) console.log("no image found")
                else console.log("%s images are now loaded to Retrieve tab interface",file.length);
                res.writeHead(200, {"Content-Type": "application/json"});
                var json = JSON.stringify(file);
                res.end(json);


        }
});



expressServer.get('/getFilesImages1', function(req, res, camID) {
        // gets the files in the images folder
        // populate a drop down in the .html page that enables downloading
//      var imageFolder = baseImageFolder + camID;
        var imageFolder = "images";
        var images0, images1;
        if (!fs.existsSync( 'images0' ) && !fs.existsSync( 'images1' )) {
                console.log("'images' folder does not exist");
                console.log("creating a new 'images' folder...");

//              fs.mkdirSync( imageFolder );
                fs.mkdirSync( 'images0' );
                fs.mkdirSync( 'images1' );
                console.log("the new folder is created!");

        }
        else{
                console.log("found 'images' folder");
                console.log("reading the folder for image files...");

                var file = (fs.readdirSync( 'images1' ));
                if (file.length==0) console.log("no image found")
                else console.log("%s images are now loaded to Retrieve tab interface",file.length);
                res.writeHead(200, {"Content-Type": "application/json"});
                var json = JSON.stringify(file);
                res.end(json);
        }
});

expressServer.get('/makeFrame', function(req, res) {
        var url_parts = url.parse(req.url, true);

        makeFrame(url_parts, res);
});

expressServer.get('/makeVR', function(req, res) {
        var url_parts = url.parse(req.url, true);

        makeVR(url_parts, res);
});


/*****************************All functions are here ******************************************************************************************************/

var result = "";

makeSession = function(callback){
		for(var i=0; i<camArray.length; i++){
                	if(camArray[i].active){
                        	if(camArray[i].sessionId == ""){
                                	startSession(i, callback);
                        	}
                       	else{
                               	result = "Session IDs already exist.";
                               	console.log(result);
               	        return(callback(result));
               	        }
       		 }
        }
}

startSession = function(camID, callback){

//	d.on('error', function(err){
//                console.log('There was an error starting the session');
//                return(callback('There was an error running a function, please make sure all cameras are connected and restart the server'));
//        })

	camArray[camID].oscClient.startSession()
		.then(function(res){
			camArray[camID].sessionId = res.results.sessionId;
			result += "Cam " + (camID + 1)  + " Session started with ID: "+ camArray[camID].sessionId + "\n";
			if (camID==camArray.length-1)
			{
				console.log(result);
				return (callback(result));
			}
	});
}

var resultPic = "";

takePicture = function(callback){
	var result='Preparing to take a picture. Please wait...';
        console.log(result);

        for(var i=0; i<camArray.length; i++){
                takeOnePicture(i, callback);
        }
	resultPic = "";
}

takeOnePicture = function(camID, callback) {
	camArray[camID].oscClient.takePicture(camArray[camID].sessionId)
		.then(function(res) {
			var pictureUri = res.results.fileUri;
			resultPic += 'Picture taken using Cam '+ (camID + 1) + ": "  + pictureUri + "\n";
			if (camID==camArray.length-1)
			{
				console.log(resultPic);
				return (callback(resultPic));
			}
		}).catch(function(error){
			console.log('* Oops, something is disconnected e.g. wifi, camera or Pi \n'+error);
		});

}

startInterval = function(callback) {
	for(var i=camArray.length-1; i>=0; i--){
		startOneInterval(i, callback);
	}
}

startOneInterval = function(camID, callback) {

	// starts a new session if there isn't one
	// starts interval shooting using the second theta package
	if (!camArray[camID].sessionId) {
		makeSession(startOneInterval(camID, callback));
	} else {
		camArray[camID].oscClient.startCapture(camArray[camID].sessionId);
console.log("camID: " + camArray[camID].sessionId);
		return (callback('Capture has started'));
	}
}

stopInterval = function(callback) {
        for(var i=0; i<camArray.length; i++){
                stopOneInterval(i, callback);
        }
}

stopOneInterval = function(camID, callback) {
        // stops the currently running capture
        camArray[camID].oscClient.stopCapture(camArray[camID].sessionId);
        callback('Capture has stopped');
}

nodeInterval=function(interval, number, exposure, HDR, callback) {
	for(var i=0; i<camArray.length; i++) {
		oneNodeInterval(i, interval, number, exposure, HDR, callback);
	}
}

oneNodeInterval = function(camID, interval, number, exposure, HDR, callback) {

	// get the milliseconds for interval, as timeout uses milliseconds
	var timeout = interval * 1000;

	// global exposureVal to be used later
	var exposureVal;

	//structure with exposure compensation variables, check it against timelapse progress, choose closest possible exposure settings
	var exposureCompensation = [0.0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0];

	var timedExposure = [{ Time: 500, Value: 2.0}, { Time: 515, Value: 1.7},{ Time: 530, Value: 1.3}, { Time: 545, Value: 1.0}, { Time: 600, Value: 0.7},
				 { Time: 615, Value: 0.3}, { Time: 625, Value: 0.0}, { Time: 1900, Value: 0.0}, { Time: 1915, Value: 0.3}, { Time: 1930, Value: 0.7},
 				{ Time: 1945, Value: 1.0}, { Time: 2000, Value: 1.3}, { Time: 2015, Value: 1.7}, { Time: 2025, Value: 2.0}];
  	var timedExposureTime;

	// for the amount of shots the user specificied
	for (var i = 0; i < number; i++) {
		// time out based on interval
		setTimeout(function (i) {
			exposureVal = 0;

			// if user wanted exposure settings
			if (exposure == 'true') {
				// get the hour of the day
				var date = new Date();
				var hour = date.getHours();
				var min = date.getMinutes();
				console.log("min: " + min);
				console.log("hour: " + hour);

				var currentTime = (hour * 100) + min;
				var mid;
				var lo = 0;
				var hi = timedExposure.length - 1;
				while (hi - lo > 1) {
    					mid = Math.floor ((lo + hi) / 2);
					if (timedExposure[mid].Time < currentTime) {
   						lo = mid;
					} else {
  						hi = mid;
					}
				}
    				if (currentTime - timedExposure[lo].Time <= timedExposure[hi].Time - currentTime) {
    					exposureVal = timedExposure[lo].Value;
				} else {
    					exposureVal = timedExposure[hi].Value;
				}

			}
			// Setting to control
			if(HDR == 'true') {
	                        var HDRSetting = { hdr: "true" };
console.log("HDR is true");
			}
			else {
				var HDRSetting = { hdr: "false" };
console.log("HDR is false");
			}
			var exposureSetting = { exposureCompensation: parseFloat(exposureVal) };
console.log("expSetting: " + exposureVal);
                        camArray[camID].oscClient.setOptions(camArray[camID].sessionId, exposureSetting, HDRSetting)
                           .then(function() {
                                //take picture with new settings
                                camArray[camID].oscClient.takePicture(camArray[camID].sessionId)
                                callback();
                           });
		}, timeout * i, i);
	}
}

// Global for list images
var resultListImages = "";

listImages = function (callback) {
    for (var i = 0; i < camArray.length; i++) {
        listOneImage(i, callback);
    }
}

listOneImage = function (camID, callback) {
    // gets the first image and do not include thumbnails
    var entryCount = 1;
    var includeThumb = false;

    // list the first image
    camArray[camID].oscClient.listImages(entryCount, includeThumb)
        .then(function (res) {
            // get the total number of images
            entryCount = res.results.totalEntries;

            //return the full list of images
            return camArray[camID].oscClient.listImages(entryCount, includeThumb);
        }).then(function (res) {
            // interpret the object as string
            var list = "";
            list = JSON.stringify(res.results.entries, null, 4);
            if (entryCount == 0) result = 'No image left in camera to list'
            else resultListImages += 'There are a total of ' + entryCount + ' images on camera' + (camID+1) + '.\n' + list;
            console.log(resultListImages);
            if (camID == camArray.length-1) {
                callback(resultListImages);
            }
        });
}

var resultCopyImages = "";

copyImages = function (callback) {
    resultCopyImages = "Copying images from both cameras...\n";
    for (var i = 0; i < camArray.length; i++) {
        copyOneCamImages(i, callback);
    }
    //return (callback(resultCopyImages));
//how to return multiple messages?
}

copyOneCamImages = function (camID, callback) {
    var imageFolder = baseImageFolder + camID;
    // if the directory does not exist, make it
    if (!fs.existsSync(imageFolder)) {
        fs.mkdirSync(imageFolder);
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

    // get the total amount of images
    // copy a single image, with the same name and put it in images folder
    camArray[camID].oscClient.listImages(entryCount, includeThumb)
        .then(function (res) {
                filename = imageFolder + '/' + res.results.entries[0].name;
                fileuri = res.results.entries[0].uri;
                imagesLeft = res.results.totalEntries;

                // gets the image data
                camArray[camID].oscClient.getImage(res.results.entries[0].uri)
                    .then(function (res) {

                        var imgData = res;
                        fs.writeFile(filename, imgData);
                        camArray[camID].oscClient.delete(fileuri).then(function () {
                            // deletes the image on the camera after copying
				console.log("imageLeft:" + imagesLeft);
                            if (imagesLeft > 1) {
                                // callback to itself to continue copying if images are left
                                callback(copyOneCamImages(camID, callback));
                            } else {
				resultCopyImages = "Finshed copying image.\n";
				console.log(resultCopyImages);
				return (callback(resultCopyImages));
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


var resultGetOption = "";

getOptions = function (callback) {
    for (var i = 0; i < camArray.length; i++) {
        getOneOption(i, callback);
    }
}

getOneOption = function (camID, callback) {
    // get options based on array above, can be changed
    camArray[camID].oscClient.getOptions(camArray[camID].sessionId, options)
        .then(function (res) {
            // return the json and print as a string
            resultGetOption += "Cam" + (camID + 1) + ": \n"+ JSON.stringify(res, null, 4) + "\n";
            if (resultGetOption != null) console.log("some camera options found\n"+ "Cam" + (camID+1) + resultGetOption);
            else console.log('no option found');
	    if(camID==camArray.length-1)
            	return (callback(resultGetOption));
        }).catch(function (error) {
            console.log('* Oops, somethingn is disconnected e.g. wifi, camera or Pi \n' + error);
        });
}

var resultSetOptions = "";

setOptions = function(interval, number, callback) {
	for(var i = 0; i < camArray.length; i++) {
		setOneOptions(interval, number, i, callback);
	}
}

setOneOptions = function(interval, number, camID, callback) {

	// puts user input into a json object
	var newOptions = { _captureInterval: + parseInt(interval), _captureNumber: + parseInt(number)};

	// make session if there isn't one
	if (!camArray[camID].sessionId) {
		makeSession(sessionId);
	} else {
		// change options based on user selection
		camArray[camID].oscClient.setOptions(camArray[camID].sessionId, newOptions)
		.then(function() {
			return (callback('Interval has been set to: ' + interval +
					'\nNumber has been set to: ' + number));
		});
	}
}

var resultState = "";

checkState = function(callback){
	for(var i=0; i<camArray.length; i++){
		checkOneState(i, callback);
	}
}


checkOneState = function(camID, callback) {

        camArray[camID].oscClient.getState()
			.then(function(res) {
			// interpret json object as string, with formatting
				resultState += JSON.stringify(res, null, 4) + "\n";

				if (resultState!=null){
					console.log("camera state found")
				}
				else{
					console.log('no camera state found');
				}
				if(camID == camArray.length-1){
					callback(resultState);
					console.log(resultState);
				}
			});
}

makeFrame = function(url_parts, res) {

	if(makeFramesRunning){
		console.log('Error! makeFrame is already running');
		return ('Error! makeFrame is already running');
	}
	makeFramesRunning=true;

	var rawImageStart1 = url_parts.query.rawImageStart1;
        var rawImageStart2 = url_parts.query.rawImageStart2;

	var rawImageEnd1 = url_parts.query.rawImageEnd1;
        var rawImageEnd2 = url_parts.query.rawImageEnd2;

	var numStart1 = parseInt(rawImageStart1.substr(3, 5));
	var numEnd1 = parseInt(rawImageEnd1.substr(3, 5));

        var numStart2 = parseInt(rawImageStart2.substr(3, 5));
	var numEnd2 = parseInt(rawImageEnd2.substr(3, 5));

	var cmds="";
	var folder0="images0/";
	var folder1="images1/";

	for(var i=0; i<(numEnd1-numStart1)+1; i++) {
		cmds+='./doStereo.sh '+folder0+'R00' + (numStart1 + i) + '.JPG '+folder1+'R00' 
		+ (numStart2 + i) + '.JPG;convert out-left.jpg out-right.jpg -append images/frame' 
		+(10000+ i)  + '.jpg;';
	}
	console.log("cmds:" + cmds);
        shell.exec(cmds,function() {
		makeFramesRunning=false;
                res.end('Stereo images written to: images.\n');
        });
}

makeVR = function(url_parts, res) {

        var rawImageLeft = url_parts.query.rawImageLeft;
        var rawImageRight = url_parts.query.rawImageRight;

        var numLeft = parseInt(rawImageLeft.substr(3, 5));
        var numRight = parseInt(rawImageRight.substr(3, 5));


        var folder0="images0/";
        var folder1="images1/";

        var cmds='./doStereo.sh '+folder0+'R00' + numLeft + '.JPG '+folder1+'R00' + numRight + '.JPG;';
	cmds+='./vrjoin.py --left=out-left.jpg  --right=out-right.jpg --output=outputVR.jpg';

        console.log("cmds:" + cmds);
        shell.exec(cmds,function() {
                makeFramesRunning=false;
                res.end('Stereo images written to: images.\n');
        });
}

createVideo = function(url_parts,res) {

	var imageFolder="images";
	/* THE MELT PARTS OF THIS CODE DO NOT WORK CORRECTLY */

	// get how the user would like to produce a video, either ffmpeg or melt
	var method = url_parts.query.method;
	//var method = "ffmpeg";

	// get the start image, which will be in format R00xxxxx.JPG
	var imageStart = url_parts.query.imageStart;
	// extract the middle 5 numbers
	var imageStart = imageStart.substr(5, 5);

	// get end image chosen by the user, which will be format R00xxxxx.JPG
	var imageEnd = url_parts.query.imageEnd;
	// extrac tthe middle 5 numbers
	var imageEnd = imageEnd.substr(5, 5);

	// get the output name as specific by the user
	var outputName = url_parts.query.outputName;
	// attach a file type to the end of the chosen output name
	var outputName = imageFolder+"/"+outputName + '.mp4';

	//if the user has selected FFMPEG for video creation
	if (method == 'ffmpeg') {

		// subtract the extracted end from the extracted start to find number of images to use
		var vframes = imageEnd - imageStart;

		// get the framerate that was specificed by the user
		var frameRate = url_parts.query.frameRate;

		// change current shelljs directory to the images folder
		//shell.cd( imageFolder );
		// run the ffmpeg command, will need to be changed on the Pi
		// passes the start number, no. of images, framerate and outputname
		//var cmds='avconv -start_number ' + imageStart +
		//	' -r 1 -i R00%d.JPG -vframes ' + vframes + ' -r ' + frameRate + ' -vcodec mpeg4 ' + outputName;
		var cmds='avconv -r '+frameRate+ ' -start_number '+imageStart
				+' -i '+ imageFolder+ '/frame%d.jpg -frames ' + (imageEnd-imageStart+1)+' -vcodec mpeg4 '+ outputName;  

		console.log(cmds);	
		shell.exec(cmds,function() {
				// inform the user when process is complete
				res.end('Video written to: ' + imageFolder + '/' + outputName + "\n"
						+ 'Using the FFMpeg package.\n');
			}
		);
	}
	else if (method == 'melt') {

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
			res.end('Video written to: ' + imageFolder + '/' + outputName + "\n"
					+ 'Using the Melt package.\n');
		});

	}
}


// expressServer.get('/createVideo', function (req, res) {
	// // user access the path /createVideo
	// /* THE MELT PARTS OF THIS CODE DO NOT WORK CORRECTLY */

	// // get how the user would like to produce a video, either ffmpeg or melt
	// var method = url_parts.query.method;

	// // get the start image, which will be in format R00xxxxx.JPG
	// var imageStart = url_parts.query.imageStart;
	// // extract the middle 5 numbers
	// var imageStart = imageStart.substr(3, 5);

	// // get end image chosen by the user, which will be format R00xxxxx.JPG
	// var imageEnd = url_parts.query.imageEnd;
	// // extrac tthe middle 5 numbers
	// var imageEnd = imageEnd.substr(3, 5);

	// // get the output name as specific by the user
	// var outputName = url_parts.query.outputName;
	// // attach a file type to the end of the chosen output name
	// var outputName = outputName + '.mp4';

	// //if the user has selected FFMPEG for video creation
	// if (method == 'ffmpeg') {

		// // subtract the extracted end from the extracted start to find number of images to use
		// var vframes = imageEnd - imageStart;

		// // get the framerate that was specificed by the user
		// var frameRate = url_parts.query.frameRate;

		// // change current shelljs directory to the images folder
		// shell.cd( imageFolder );
		// // run the ffmpeg command, will need to be changed on the Pi
		// // passes the start number, no. of images, framerate and outputname
		// shell.exec('ffmpeg -start_number ' + imageStart +
			// ' -r 1 -i R00%d.JPG -vframes ' + vframes + ' -r ' + frameRate + ' -vcodec mpeg4 ' + outputName,
		// function() {
			// // inform the user when process is complete
			// res.end('Video written to: ' + imageFolder + '/' + outputName + "\n"
					// + 'Using the FFMpeg package.\n');
		// });

	// } else if (method == 'melt') {

		// // get current image based on image start
		// var currentImage = imageStart;

		// // begin melt command, uses custom profile
		// var meltcommand = 'melt -profile equ_uhd_2688p_25 ';

		// // add the beginning image to the melt command
		// meltcommand += url_parts.query.imageStart + ' out=30 ';

		// // get the number of images to be used
		// var numImages = imageEnd - imageStart;

		// // loop to append the command based on images used
		// for(var i = 0; i < numImages; i++) {
			// currentImage++;
			// meltcommand += 'R00' + (currentImage) + '.JPG out=60 -mix 25 -mixer luma ';
		// }

		// // add final parts to the command
		// meltcommand += '-consumer avformat:' + outputName + ' vcodec=libx264 an=1'

		// // execute the command
		// shell.exec(meltcommand, function() {
			// // inform the user when process is complete
			// res.end('Video written to: ' + imageFolder + '/' + outputName + "\n"
					// + 'Using the Melt package.\n');
		// });

	// }
// });
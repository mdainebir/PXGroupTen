# PXGroupTen

Installation guide for 360 Stereo Time-lapse Video

#The project package will be available in /home/pi folder in the raspberry pi

Before running the package, user must make some changes to node_modules if user is not using the existing modules.
Changes are given bellow
1. Add extra [.set('Host', '192.168.1.1')] header in node_modules/osc-client/lib/makeHttpRequest.js under requestMethod(url) and node_modules/osc-client/lib/commandsExecute.js under request.post(commandsExecuteUrl)
2.	Add two functions to use oscClient for startCapture and stopCapture in node_modules/osc-client/lib/OscClient.js
	functions are:

	//camera._startCapture
	this.startCapture = function(sessionId, statusCallback) {
        return commandsExecute.apply(this, ['camera._startCapture', { sessionId: sessionId }, statusCallback]);
	};
	//camera._stopCapture
	this.stopCapture = function(sessionId, statusCallback) {
    return commandsExecute.apply(this, ['camera._stopCapture', { sessionId: sessionId }, statusCallback]);
	};

Steps to run the package with full functionalities.

Steps are given bellow.
Firstly, use putty to connect Raspberry Pi to get Pi terminal.(use Ethernet cable(ip 169.254.203.153) or use router to get wireless connection)
1. Turn on both cameras(make sure that the cameras are in camera mode and WiFi is on)
2. Turn on Raspberry Pi with atleast 3 wifi interfaces available.
3. Configure the cameras wifi ssid and password in raspberry pi to connect to the cameras wirelessly.
4. After both cameras connected to Raspberry Pi, force the second camera's IP address to make as same as the first camera which is 192.168.1.5
5. The linux command to force the IP address is [sudo ifconfig wlan(i) 192.168.1.5], (i) is the interface number where the second camera been connected.
6. Run 2 socat commands to make the tunnel connection with different port numbers.
7. 	The linux commands to run tunneling using different ports are
	[socat TCP4-LISTEN:7777,fork,reuseaddr TCP:192.168.1.1:80,bindtodevice=wlan0]
	[socat TCP4-LISTEN:7778,fork,reuseaddr TCP:192.168.1.1:80,bindtodevice=wlan1]
	if the cameras are connected to wlan0 and wlan1
8. Find the package if already available in Raspberry Pi, if not please copy the package from github.
9. Run the server.js in Pi using sudo permission.
10. Command to run the server is [sudo node server.js]
11. Open any browser and use (IP address:port number/public) to get the frontend access. address will be [IP:3000/public]
12. You are all set to use 360 Stereo Time-lapse Video package.

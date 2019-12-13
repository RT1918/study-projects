//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						// stream from getUserMedia()
var rec; 							// Recorder.js object
var input; 							// MediaStreamAudioSourceNode we'll be
									// recording
// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext // audio context to help us record
var speechToTextCallback;
var API = "";
var fileName = "";
var isSpeechTotext;

function hasGetUserMedia() {
	return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function startRecording(isSpeechTotext, fileName, onSuccess, onFailt) {
	this.fileName = fileName;
	this.isSpeechTotext = isSpeechTotext;
	if(isSpeechTotext){
		API = "https://speech-dot-comaiphuong-edu.appspot.com/speech";
	} else {
		API = "/uploadrecord"
	}
	if (!hasGetUserMedia()) {
		onFailt("Trình duyệt của bạn không hỗ trợ, vui lòng cập nhật trình duyệt lên phiên bản mới");
		return;
	}
//	console.log("starting record handler");

	/*
	 * Simple constraints object, for more advanced audio features see
	 * https://addpipe.com/blog/audio-constraints-getusermedia/
	 */
    
    var constraints = { audio: true, video:false }
	/*
	 * We're using the standard promise based getUserMedia()
	 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	 */

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
//		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
		/*
		 * create an audio context after getUserMedia is called sampleRate might
		 * change after getUserMedia is called, like it does on macOS when
		 * recording through AirPods the sampleRate defaults to the one set in
		 * your OS for your playback device
		 * 
		 */
		if(audioContext == null || audioContext == undefined ){
			audioContext = new AudioContext();
		}
		// update the format
//		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/* assign to gumStream for later use */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/*
		 * Create the Recorder object and configure to record mono sound (1
		 * channel) Recording 2 channels will double the file size
		 */
		rec = new Recorder(input,{numChannels:1})

		// start the recording process
		rec.record()
		onSuccess();
	}).catch(function(err) {
		console.log("startRecording error", err)
		var message = "Có lỗi xảy ra, vui lòng thử lại";
		if(err.message && err.message !== null && err.message !== undefined && err.message.length > 0){
			if(err.message == 'Permission denied'){
				message = "Bạn đã chặn quyền truy cập microphone, vui lòng kiểm tra lại";
			} else {
				message = err.message;
			}
		}
		onFailt(message);
	});
}

function pauseRecording(){
//	console.log("pauseButton clicked rec.recording=", rec.recording );
	if (rec.recording){
		// pause
		rec.stop();
	} else{
		// resume
		rec.record()
	}
}

function stopRecording(callback) {
	speechToTextCallback = callback;
//	console.log("stoping record handler");
	rec.stop();
	// stop microphone access
	gumStream.getAudioTracks()[0].stop();
	// create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(uploadData);
}

function uploadData(blob){
//	console.log("uploading..........");
	var xhr = new XMLHttpRequest();
	xhr.onload = function(e) {
	     if(this.readyState === 4) {
	    	 if(speechToTextCallback !== null && speechToTextCallback !== undefined){
	 			speechToTextCallback(e.target.responseText);
	 		}
	     }
	};
	var fd = new FormData();
	if(this.isSpeechTotext){
		fd.append("audio_data", blob, audioContext.sampleRate + "");
	} else {
		console.log("fileName", fileName);
		fd.append("audio_data", blob, this.fileName);
	}
	xhr.open("POST", API, true);
	xhr.send(fd);
}
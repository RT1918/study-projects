var USER_TABLE = "Users"
var MAIN_USER_TABLE = "Users"
var DISCONNECTED = "disconnected"
var RECONNECTED = "reconnected"
var SUBCRIBERS = "subcribers"
var VIEWERS = "viewers"
var SUBCRIBED = "subcribed"
var UPDATED = "updated"
var NOTIFICATION = "notification"
var STATUS_SEEN = "statusSeen"
var SUCCESS = "success"
var ONLINE = "online"
var LAST_ACTIVE = "lastActive"
var INPUTTING ="inputting"
var PEER_ID = "peerId"
var LIST_USER_ONLINE = "listUserOnline"
var mapSocketConnection = {} // url -> socket

var USER_ID = null;
var BRANCH = null;

var MAIN_PATH ="";
var COURSE_ID = null;
var USER_INFO = "userInfo";
var recentMessageLiveStream = 0

var initCount = 0;

var initEventListenFirebase = 0;
var initEventChangeFirebase = 0;

var KSFirebase = {
	mainApp : null,
	
//	config : {
//		apiKey: "AIzaSyBT8DmFSfHd3vYK8lFVnpRUkkABczLyFbU",
//	    authDomain: "chat-rn-firebase.firebaseapp.com",
//	    databaseURL: "https://chat-rn-firebase.firebaseio.com",
//		storageBucket: "chat-rn-firebase.appspot.com",
//	},
	
	initFirebase : function(apiKey, projectId){
		if(this.mainApp === null){
			var firebaseId = {
					apiKey : apiKey,
					authDomain : projectId+".firebaseapp.com",
					databaseURL : "https://"+projectId+".firebaseio.com",
					storageBucket : projectId+".appspot.com",
				}
			try {
				this.mainApp = firebase.initializeApp(firebaseId);
			} catch (e) {
			}
		}
	},

	init : function(userId, courseId) {
		if(userId.indexOf('.') > -1 || userId.indexOf('#') > -1 || userId.indexOf('$') > -1){
			return ;
		}
		COURSE_ID = courseId;
		USER_ID = userId;
		MAIN_PATH = courseId+"/"+userId;
		if(KSFirebase.checkMainApp()){
			KSFirebase.checkOnlineConnected();
			KSFirebase.addToListUserOnline(courseId, userId)
		}
	},
	
	addToListUserOnline : function(courseId, userId){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(courseId + "/" + LIST_USER_ONLINE + "/" + userId).set(new Date().getTime(),
				    function(error) {
					  if (error) {
					  } 
			});
		} catch (e) {
		}
	},
	
	checkOnlineConnected: function(){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var connectedRef = KSFirebase.mainApp.database().ref(".info/connected");
		connectedRef.on('value', function(snap) {
		  if (snap.val() === true) {
			  KSFirebase.setOnline()
			  KSFirebase.updateOnlineStatus();
		  }
		});
	},
	
	updateOnlineStatus: function(){
		KSFirebase.onDisconnectServer("");
	},
	
	setOnline: function (){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(MAIN_PATH + "/" + USER_INFO + "/" + ONLINE).set(true,
				    function(error) {
					  if (error) {
//						  console.log('Synchronization failed onlineStatus');
					  } else {
//						  console.log('Synchronization succeeded onlineStatus');
					  }
				});
		} catch (e) {
			// TODO: handle exception
		}
		
		
	},
	
	setPeerId: function (val){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		KSFirebase.mainApp.database().ref(MAIN_PATH + "/" + USER_INFO + "/" + PEER_ID).set(val,
			    function(error) {
				  if (error) {
				  } 
			});
	},
	
	onDisconnectServer: function(url){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(MAIN_PATH + "/" + USER_INFO + "/" + LAST_ACTIVE).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
			KSFirebase.mainApp.database().ref(MAIN_PATH + "/" + USER_INFO + "/" + ONLINE).onDisconnect().set(false);
			//KSFirebase.mainApp.database().ref(MAIN_PATH + "/" + USER_INFO + "/" + PEER_ID).onDisconnect().set("");
			KSFirebase.mainApp.database().ref(COURSE_ID + "/" + LIST_USER_ONLINE + "/" + USER_ID).onDisconnect().remove();
		} catch (e) {
			// TODO: handle exception
		}
	},

	resubcribe : function(url, onChangeDataEvent) {
		KSFirebase.setOnline()
		KSFirebase.onDisconnectServer(url);
		
		//SUBCIBE IF NOT YET SUBSCRIBE
		try {
			KSFirebase.mainApp.database().ref(url).once("value",
					function(subcribersData) {
						var refSubcriber = subcribersData.child(SUBCRIBERS).child(USER_ID).val();
						
						KSFirebase.mainApp.database().ref(url + "/" + SUBCRIBERS +"/" + USER_ID).set(ONLINE,
						    function(error) {
								  if (error) {
//									  console.log('Synchronization failed subcribeItemIfNotYet');
								  } else {
									  KSFirebase.createSocketForResubcribe(url, onChangeDataEvent);
								  }
							});
					},
					function (err) {
						  // code to handle read error
//						console.log("ERROR INTERNET CONNECTION AT : subcribeItemIfNotYet");
					});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	subcribe: function(url, onChangeDataEvent){
		
		//OPEN A SOCKET
		 KSFirebase.createSocket(url, onChangeDataEvent)
	},
	
	unsubcribe: function(url, onChangeDataEvent){
		KSFirebase.closeSocket(url)
		KSFirebase.removeSubcribedOfUser(url)
		
//		KSFirebase.closeSocket(url)
	},
	
	getData: function(url, onChangeDataEvent){
		try {
			KSFirebase.mainApp.database().ref(url).once("value", function(dataJson) {
		        var data = dataJson.val();
		        onChangeDataEvent(data)

				},
				function (err) {
			});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	listion: function(url, onChangeDataEvent){
//		console.log("listion...." + url);
		if(mapSocketConnection[url]){
//			console.log("ALREADY HAVE Socket listion...." + url);
			return;
		}
		try {
			var callBackTime = 0
			var socket = KSFirebase.mainApp.database().ref(url).on("value", function(dataSnapshot) {
//				console.log("listion value changed ON LISTION " + JSON.stringify(dataSnapshot.val()));
					if(callBackTime > 0){
			    		onChangeDataEvent(dataSnapshot.val())
			    	}
			    	callBackTime = callBackTime + 1
			});
			mapSocketConnection[url] = socket
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	listionAndFetchData: function(url, onChangeDataEvent){
//		KSFirebase.log("listion...." + url);
		if(mapSocketConnection[url]){
//			KSFirebase.log("ALREADY HAVE Socket listion...." + url);
			KSFirebase.mainApp.database().ref(url).off("value", mapSocketConnection[url]);
			mapSocketConnection[url] = null
		}
		try {
			var socket = KSFirebase.mainApp.database().ref(url).on("value", function(dataSnapshot) {
//				KSFirebase.log("listionAndFetchData value changed ON LISTION " + JSON.stringify(dataSnapshot.val()));
			    onChangeDataEvent(dataSnapshot.val())
			});
			mapSocketConnection[url] = socket
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	createSocketForResubcribe: function(url, onChangeDataEvent){
		var subcribeURL = url + "/" + UPDATED
		
		if(mapSocketConnection[url]){
//			console.log("ALREADY HAVE Socket 1...." + url);
			return;
		}
		try {
			var callBackTime = 0
//			console.log("Create Socket when Open app " + url);
			var socket = KSFirebase.mainApp.database().ref(subcribeURL).on("value",
				function(dataSnapshot) {
//				console.log("createSocketForResubcribe value changed ON create SocketForResubcribe " + JSON.stringify(dataSnapshot.val()));
//				console.log("callBackTime: " + callBackTime)
					if(callBackTime > 0){
			    		onChangeDataEvent(dataSnapshot.val())
			    	}
			    	
			    	callBackTime = callBackTime + 1
			});
			mapSocketConnection[url] = socket
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	createSocket: function (url, onChangeDataEvent){
		var subcribeUrl = url + "/" + UPDATED
		if(mapSocketConnection[url]){
			return
		}
		try {
			var callBackTime = 0
			var socket = KSFirebase.mainApp.database().ref(subcribeUrl).on("value",
				function(dataSnapshot) {
			    	if(callBackTime > 0){
			    		onChangeDataEvent(dataSnapshot.val())
			    	}
			    	callBackTime = callBackTime + 1
			});
			mapSocketConnection[url] = socket
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	closeSocket: function(url){
		try {
			var connection = mapSocketConnection[url]
			if(connection){
				KSFirebase.mainApp.database().ref(url + "/" + UPDATED).off("value", connection);
				delete mapSocketConnection[url]
			}
		} catch (e) {
		}
	},
	
	addSubcribedOfUser: function(newSubcribedURL){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			var userURL = USER_TABLE + "/" + USER_ID;
			KSFirebase.mainApp.database().ref(userURL)
				.once("value", function(itemData) {
						var refSubcribed = itemData.child(SUBCRIBED).val() || [];
						var existInArray = $.inArray(newSubcribedURL, refSubcribed) > -1
						if(existInArray){
							return
						}

						refSubcribed.push(newSubcribedURL);
						
						try {
							KSFirebase.mainApp.database().ref(userURL + "/" + SUBCRIBED).set(refSubcribed,
								    function(error) {
									  if (error) {
//										  console.log('Synchronization failed storeData');
									  } else {
//									      KSFirebase.log('Synchronization succeeded storeData' + 
									  }
									});
						} catch (e) {
							// TODO: handle exception
						}
					},
					function (err) {
						// code to handle read error
//						KSFirebase.log("ERROR INTERNET CONNECTION AT : updateSubcribedOf User");
					});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	removeSubcribedOfUser: function(newSubcribedURL){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var userURL = USER_TABLE + "/" + USER_ID;
		
//		console.log("REMOVE SUBCRIBE USER: " + newSubcribedURL)
		
		KSFirebase.mainApp.database().ref(userURL).once("value", function(itemData) {
//					KSFirebase.log(url + " subcribed DATA : " + JSON.stringify(itemData.child(SUBCRIBED).val()));
					var refSubcribed = itemData.child(SUBCRIBED).val() || [];
					var existInArray = $.inArray(newSubcribedURL, refSubcribed) > -1
					
//					KSFirebase.log("refSubcribed: " + refSubcribed)
//					KSFirebase.log("existInArray: " + existInArray)

					if(!existInArray) {
						return
					}
					
					var index = refSubcribed.indexOf(newSubcribedURL);

					if (index > -1) {
						refSubcribed.splice(index, 1);
					}
					
//					console.log("AFTER REMOVED: " + refSubcribed)
					
					console.mainApp.database().ref(userURL + "/" + SUBCRIBED).set(refSubcribed,
					    function(error) {
						  if (error) {
//							  console.log('Synchronization failed storeData');
						  } else {
//						      KSFirebase.log('Synchronization succeeded storeData' + 
						  }
						});
				},
				function (err) {
					// code to handle read error
//					console.log("ERROR INTERNET CONNECTION AT : updateSubcribedOf User");
				});
	},
	
	getDataAtNode: function(url, callBackKS){
		try {
			KSFirebase.mainApp.database().ref(url)
		    .once("value", function(userData) {
					callBackKS(userData.val())
				},
				function (err) {
					callBackKS(err)
				});
		} catch (e) {
		}
	},
	
	distroyAllSocketConnection: function(){
		
		KSFirebase.setOffLine()
		
		 for (key in mapSocketConnection) {
//			 console.log("DISCONNECT FIREBASE : " + key)
			
			var connection = mapSocketConnection[key]
				
	 		if(connection){
				try {
					KSFirebase.mainApp.database().ref(key).off("value", connection);
					mapSocketConnection[key] = null
				} catch (e) {
				}
	 		}
	    }
	},
	
	setOffLine: function(){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(USER_TABLE + "/" + USER_ID + "/" + ONLINE).set(false,
				    function(error) {
					  if (error) {
//						      KSFirebase.log('Synchronization failed onlineStatus');
					  } else {
//						      KSFirebase.log('Synchronization succeeded onlineStatus');
					  }
				});
		} catch (e) {
		}
	},
	
	
	sendDataChat: function(url, dataString,typeChat, callback){
//		console.log("change item : " + url)
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var updatedVal = {
			date: (new Date()).toString() + " - " + KSFirebase.randomText(),
			url: url,
			user: USER_ID,
			data: dataString,
			type: typeChat
		};
		try {
			KSFirebase.mainApp.database().ref(url + "/" + UPDATED).set(updatedVal,
				      function(error) {
						  if (error) {
						      callback(error)
						  } else {
						      callback(SUCCESS)
						  }
					});
		} catch (e) {
		}
	},
	
	sendStatusSeen : function (url,meSendId,status,date){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var updatedVal = {
			url : url,
			seen : status,
			date : date,
		};
		try {
			KSFirebase.mainApp.database().ref(url + "/" + STATUS_SEEN +"/"+meSendId).set(updatedVal,
				    function(error) {
						if (error) {
			//			      KSFirebase.log('Send Data Fail');
						} else {
			//			      KSFirebase.log('Send Data Success : ' + SUCCESS);
						}
					});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	recentStatusSeen : function(url,meSendId,onChangeDataEvent){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(url +"/" + STATUS_SEEN +"/"+meSendId).on("value",
					function(dataSnapshot) {
				    	onChangeDataEvent(dataSnapshot.val())
			});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	
	sendDataNotification : function(url,id,dataString,link,date,userSend,type,itemId, sourceUrl,callback){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var updatedVal = {
				url: url,
				id : id,
				data: dataString,
				link:link,
				date: date,
				userSend: userSend,
				type : type,
				itemId: itemId,
				sourceUrl: sourceUrl,
			};
		try {
			KSFirebase.mainApp.database().ref(url).set(updatedVal,
				      function(error) {
						  if (error) {
						      callback(error)
						  } else {
						      callback(SUCCESS)
						  }
					});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	
	
	inputting : function(url,isFocus,meId){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var inputingVal = {
			type : isFocus,
			friendId: meId
		}
		
		try {
			KSFirebase.mainApp.database().ref(url + "/" + INPUTTING).set(inputingVal,
				      function(error) {
						  if (error) {
//						      KSFirebase.log('Send Data Fail');
						  } else {
//						      KSFirebase.log('Send Data Success : ' + SUCCESS);
						  }
					});
		} catch (e) {
		}
	},
	
	recentInputing : function(url,onChangeDataEvent){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			 KSFirebase.mainApp.database().ref(url +"/" + INPUTTING).on("value",
						function(dataSnapshot) {
					    	onChangeDataEvent(dataSnapshot.val())
				});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	sendDataActivityLog : function(url, courseId, msg, date, itemId, from,type,userName){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		var data = {
				courseId : courseId,
				content: msg,
				date : date,
				itemId : itemId,
				userId : from,
				type : type,
				userName : userName,
			}
		try {
			KSFirebase.mainApp.database().ref(url).set(data,
				      function(error) {
						  if (error) {
//						      KSFirebase.log('Send Data Fail');
						  } else {
//						      KSFirebase.log('Send Data Success : ' + SUCCESS);
						  }
					});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	recentDataActivityLog : function(url,onChangeDataEvent){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			var callBackTime = 0
			var socket = KSFirebase.mainApp.database().ref(url).on("value",
				function(dataSnapshot) {
				    if(callBackTime > 0){
				    	onChangeDataEvent(dataSnapshot.val())
				    }
				    callBackTime = callBackTime + 1
			});
		} catch (e) {
		}
	},
	
	unSubcriberChanelLiveStream : function(url){
		try {
			var connection = mapSocketConnection[url]
			if(connection){
				KSFirebase.mainApp.database().ref(url).off("value", connection);
				delete mapSocketConnection[url]
			}
		} catch (e) {
		}
	},
	

	sendDataToChanel : function(url, data, callback){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			if(typeof data === 'string'){
				data = JSON.parse(data)
			}
			var soket = KSFirebase.mainApp.database().ref(url).set(data,
				      function(error) {
						  if (error) {
//						      KSFirebase.log('Send Data Fail');
						  } else {
//						      KSFirebase.log('Send Data Success : ' + SUCCESS);
						  }
					});
		} catch (e) {
			// TODO: handle exception
		}
	},

	recentDataFromChanel : function (url, callback){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			if(mapSocketConnection[url]){
				return;
			}
			var num = 0
			var socket = KSFirebase.mainApp.database().ref(url).on("value",
				function(dataSnapshot) {
				    if(num > 0){
				    	callback(dataSnapshot.val())
				    }
				    num = num + 1
			});
			mapSocketConnection[url] = socket;
		} catch (e) {
		}
	},
	
	randomText: function(){
		return Math.random();
	},
	
	log: function(message){
//		console.log(message)
	},
	
	queryUserOnline: function(courseId, onChangeDataEvent, onChangeFailure){
		if(!KSFirebase.checkMainApp()){
			onChangeFailure('failure queryUserOnline')
			return;
		}
		try {
			var callBackTime = 0;
			var socket = KSFirebase.mainApp.database().ref(courseId +"/" + LIST_USER_ONLINE)
			.on("value", function(dataSnapshot) {
				if(callBackTime < 1){
					onChangeDataEvent(dataSnapshot.val());
					callBackTime++;
				}
			});
		} catch (e) {
			onChangeFailure('failure queryUserOnline')
		}
	},
	
	queryUserOnlineHome: function(courseId, onChangeDataEvent, onChangeFailure){
		if(!KSFirebase.checkMainApp()){
			onChangeFailure('failure queryUserOnline')
			return;
		}
		try {
			var callBackTime = 0;
			var socket = KSFirebase.mainApp.database().ref(courseId +"/" + LIST_USER_ONLINE)
			.on("value", function(dataSnapshot) {
				//if(callBackTime < 1){
					onChangeDataEvent(dataSnapshot.val());
					//callBackTime++;
				//}
			});
		} catch (e) {
			onChangeFailure('failure queryUserOnline')
		}
	},
	
	checkMainApp: function(){
		if(KSFirebase.mainApp && KSFirebase.mainApp.database()){
			return true;
		} else{
			return false;
		}
	},
	
	onChangeValue: function(url, onChangeDataEvent){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			var callBackTime = 0;
			var socket = KSFirebase.mainApp.database().ref(url).on("value", function(dataSnapshot) {
			    if(callBackTime > 0){
			    		onChangeDataEvent(dataSnapshot.val());
			    }
			    callBackTime = callBackTime + 1;
			    initEventListenFirebase++;
			});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	changeValue : function(url, value, onChangeDataEvent){
		if(!KSFirebase.checkMainApp()){
			return;
		}
		try {
			KSFirebase.mainApp.database().ref(url).set(value, function(error) {
				if(!!error){
					onChangeDataEvent(error)
				} else {
					onChangeDataEvent({status: 'success'})
				}
			});
		} catch (e) {
			// TODO: handle exception
		}
	},
	
	getUserIpAddress: function(onNewIP) { //  onNewIp - your listener function for new IPs
	    getIpAddress(onNewIP)
	    function getIpAddress(callback){
	      local_ip(function(ip){
			  var xmlHttp = new XMLHttpRequest();
	          xmlHttp.onreadystatechange = function() { 
	            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
					callback(xmlHttp.response + (ip ? '&'+ip : ''));
	            }
	          }
	          xmlHttp.open("GET", '/get-ip-address', true); // true for asynchronous 
	          xmlHttp.send(null);
	      });
	    }
	    function local_ip(callback) {
	      var $mytimeout;
	      if ( window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection ) {
	    	  try {
		    	  $mytimeout = setTimeout(function(){
			          callback()
			        },3000);
			        window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
			        var $pc = new RTCPeerConnection({iceServers:[]}), $noop = function(){};      
			        $pc.createDataChannel("");
		        	$pc.createOffer($pc.setLocalDescription.bind($pc), $noop);
			        $pc.onicecandidate = function($ice) {
			          clearTimeout($mytimeout);
			          if(!$ice || !$ice.candidate || !$ice.candidate.candidate)  return;
			          $ip = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec($ice.candidate.candidate)[1];
			          $pc.onicecandidate = $noop;
			          callback($ip)
			        };
		      } catch(e){
		    	  console.log('cannot get ip adrress from this browser');
		      }
	      } else {
	    	  callback();
	      }
	    }
	  }
}







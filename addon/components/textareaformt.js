const nsISupports = Components.interfaces.nsISupports;
const nsIObserver = Components.interfaces.nsIObserver;

const CLASS_ID = Components.ID('{d47101dc-9988-4ad8-af30-2f7172c4ba26}');
const CLASS_NAME = 'TextareaForMT5 Ovserver';
const CONTRACT_ID = '@toi-planning.net/textareaformt5;1';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

function TextareaForMT5TracingListener() {
}

TextareaForMT5TracingListener.prototype =
{
	originalListener: null,
	receivedData: [],
	onDataAvailable: function(request, context, inputStream, offset, count) {
		function CCIN(cName, ifaceName) {
			return Cc[cName].createInstance(
				Ci[ifaceName]
			);
		}

		var binaryInputStream = CCIN(
			"@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream"
		);
		var storageStream = CCIN(
			"@mozilla.org/storagestream;1", "nsIStorageStream"
		);
		var binaryOutputStream = CCIN(
			"@mozilla.org/binaryoutputstream;1", "nsIBinaryOutputStream"
		);

		binaryInputStream.setInputStream(inputStream);
		storageStream.init(8192, count, null);
		binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

		var prefs = Cc["@mozilla.org/preferences-service;1"].
			getService(Ci.nsIPrefBranch2);

		// Copy received data as they come.
		var data = binaryInputStream.readBytes(count);

		var replaces = [
			{
				from: 'id="text"',
				to: 'id="text" style="height:' +
					prefs.getCharPref('extensions.textareaformt5.textareaheight') +
					'" '
			},
			{
				from: 'CodeMirror.fromTextArea',
				to: 'null;(function(){ ; })'
			}
		];
		for (var i = 0; i < replaces.length; i++) {
			var replace_from = replaces[i]['from'];
			var replace_re = RegExp(replace_from);
			var replace_to = replaces[i]['to'];
			if (data.match(replace_re)) {
				data = data.replace(replace_re, replace_to);
				count += replace_to.length - replace_from.length;
			}
		}

		this.receivedData.push(data);

		binaryOutputStream.writeBytes(data, count);

		this.originalListener.onDataAvailable(
			request, context, storageStream.newInputStream(0), offset, count
		);
	},

	onStartRequest: function(request, context) {
		this.originalListener.onStartRequest(request, context);
	},

	onStopRequest: function(request, context, statusCode) {
	   // Get entire response
	   var responseSource = this.receivedData.join();
	   this.originalListener.onStopRequest(request, context, statusCode);
	},

	QueryInterface: function (aIID) {
		if (aIID.equals(Ci.nsIStreamListener) || aIID.equals(Ci.nsISupports)) {
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	}
}

function TextareaForMT5Listener() { }

TextareaForMT5Listener.prototype = {
	readFromStream: function(stream, charset, noClose) {
		var sis = Cc['@mozilla.org/binaryinputstream;1'].
			getService(Ci['nsIBinaryInputStream']);
		sis.setInputStream(stream);

		var segments = [];
		for (var count = stream.available();count; count = stream.available()) {
			segments.push(sis.readBytes(count));
		}

		if (!noClose) {
			sis.close();
		}

		var text = segments.join("");

		try
		{
			return this.convertToUnicode(text, charset);
		}
		catch (err)
		{
		}

		return text;
	},
	observe : function(aSubject, aTopic, aData) {

		if (
			(aTopic == 'http-on-examine-response')
			|| (aTopic == 'http-on-examine-merged-response')
			|| (aTopic == 'http-on-examine-cached-response')
		) {
			var newListener = new TextareaForMT5TracingListener();
			aSubject.
				QueryInterface(Ci.nsITraceableChannel).
				QueryInterface(Ci.nsIHttpChannel);

			var to_replace = false;
			if (
				aSubject.URI.path.indexOf('__mode=view') != -1
				&& aSubject.URI.path.indexOf('_type=template') != -1
	   		) {
				to_replace = true;
			}

			try {
				if (aSubject.QueryInterface(Ci.nsIUploadChannel)) {
					var is = aSubject.uploadStream;
					if (is) {
						var ss = is.QueryInterface(Ci.nsISeekableStream);
						var prevOffset;
						if (ss) {
							prevOffset = ss.tell();
							ss.seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
						}

						// Read data from the stream..
						var charset = null;
						var text = this.readFromStream(ss, charset, true);

						if (ss && prevOffset == 0) {
							ss.seek(NS_SEEK_SET, 0);
						}

						if (
							text.indexOf('__mode=view')
							&& text.indexOf('_type=template')
						) {
							to_replace = true;
						}
					}
				}
			}
			catch(exc) {
			}

			if (to_replace) {
				newListener.originalListener
					= aSubject.setNewListener(newListener);
			}

			return;
		}

		if (aTopic == "app-startup") {
			Cc['@mozilla.org/observer-service;1'].
				getService(Ci.nsIObserverService).
				addObserver(this, 'http-on-examine-response', false);

			Cc['@mozilla.org/observer-service;1'].
				getService(Ci.nsIObserverService).
				addObserver(this, 'http-on-examine-merged-response', false);

			Cc['@mozilla.org/observer-service;1'].
				getService(Ci.nsIObserverService).
				addObserver(this, 'http-on-examine-cached-response', false);

			return;
		}
	},
 
	QueryInterface : function (aIID) {
		if (
			aIID.equals(Ci.nsIObserver) ||
			aIID.equals(Ci.nsISupports)
		) {
			return this;
		}

		throw Components.results.NS_NOINTERFACE;
	}
};

var TextareaForMT5Module = {
	registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
		aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.registerFactoryLocation(
			CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType
		);

		var catMgr = Cc["@mozilla.org/categorymanager;1"].
			getService(Ci.nsICategoryManager);
		catMgr.addCategoryEntry(
			'app-startup', CLASS_NAME, CONTRACT_ID, true, true
		);
	},

	unregisterSelf: function(aCompMgr, aLocation, aType) {
		aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
		aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);   
	},

	getClassObject: function(aCompMgr, aCID, aIID) {
		return this._factory;
	},

	_factory: {
		QueryInterface: function (aIID) {
			if (!aIID.equals(Components.interfaces.nsISupports) &&
					!aIID.equals(Components.interfaces.nsIFactory))
				throw Components.results.NS_ERROR_NO_INTERFACE;
			return this;
		},

		createInstance: function (outer, iid) { 
			return new TextareaForMT5Listener();
		}
	},

	canUnload: function(aCompMgr) {
		return true;
	}
};

function NSGetModule(aCompMgr, aFileSpec) {
	return TextareaForMT5Module;
}

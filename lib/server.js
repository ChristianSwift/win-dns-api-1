// Include Restify REST framework
// http://mcavage.me/node-restify/
const restify = require('restify');
const errors = require('restify-errors');
const fs = require('fs');
const path = require("path");
const zoneParser = require('zonefile-parser')

if (process.argv[process.argv.length - 1].toLocaleLowerCase() === "install") {

	console.log(process.execPath);

	// var Service = require('node-windows').Service;
	// // Create a new service object
	// var svc = new Service({
	// 	name: 'Hello World',
	// 	description: 'The nodejs.org example web server.',
	// 	script: path.join(__dirname, __filename)
	// });

	// // Listen for the "install" event, which indicates the
	// // process is available as a service.

	// svc.on('install', function () {
	// 	svc.start();
	// });

	// svc.install();
	return;
}

if (process.argv[process.argv.length - 1].toLocaleLowerCase() === "test") {

	console.log(process.env);
	return;
}

// Child process module
const exec = require('child_process').exec;

// Create the server object
const server = restify.createServer({
	name: 'WinDnsApi'
});

// Special logic for CURL's keep-alive behavior
server.pre(restify.pre.userAgentConnection());
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

// DNS Record Creates/Updates
function doDnsSet(req, res, next) {

	var RRType = req.params.type.toUpperCase(),
		NodeName = req.params.node,
		ZoneName = req.params.zone,
		IpAddress = req.params.ip;

	// Validate RRType
	if (RRType != "A" && RRType != "PTR") {
		return next(new errors.InvalidArgumentError("You specified an invalid record type ('" + RRType + "'). Currently, only the 'A' (alias) and 'PTR' record types are supported.  e.g. /dns/A/... or /dns/PTR/.."));
	}

	// Validate Node Name
	if (NodeName.match(/[^A-Za-z0-9\.-]+/g) !== null) {
		return next(new errors.InvalidArgumentError("Invalid node name ('" + NodeName + "'). Node names can only contain letters, numbers, dashes (-), and dots (.)."));
	}

	// Validate IP Address
	if (IpAddress.match(/^(([1-9]?\d|1\d\d|25[0-5]|2[0-4]\d)\.){3}([1-9]?\d|1\d\d|25[0-5]|2[0-4]\d)$/g) == null) {
		return next(new errors.InvalidArgumentError("Invalid IP address ('" + IpAddress + "'). Currently, only IPv4 addresses are accepted."));
	}

	var delexec, addexec;
	if (RRType == "A") {
		//ZoneName = NodeName.split(/\.(.+)/)[1];
		// Validate Zone Name
		if (ZoneName.match(/[^A-Za-z0-9\.-]+/g) !== null) {
			return next(new errors.InvalidArgumentError("Invalid zone name ('" + ZoneName + "'). Zone names can only contain letters, numbers, dashes (-), and dots (.)."));
		}

		delexec = 'dnscmd /recorddelete ' + ZoneName + ' ' + NodeName + ' ' + RRType + ' /f';
		addexec = 'dnscmd /recordadd ' + ZoneName + ' ' + NodeName + ' ' + RRType + ' ' + IpAddress;
	} else if (RRType == "PTR") {
		var ipsplit = IpAddress.split('.');
		ZoneName = ipsplit[2] + '.' + ipsplit[1] + '.' + ipsplit[0] + '.in-addr.arpa';

		delexec = 'dnscmd /recorddelete ' + ZoneName + ' ' + ipsplit[3] + ' ' + RRType + ' /f';
		addexec = 'dnscmd /recordadd ' + ZoneName + ' ' + ipsplit[3] + ' ' + RRType + ' ' + NodeName;
	}

	// Execute the Command

	var execRemove = exec(delexec,
		function (error, stdout, stderr) {
			if (error !== null) {

				var RespCode = "RecordUpdateFailed";
				var RespMessage = "An error occurred while trying to remove any existing records for the ('" + RRType + "') record '" + NodeName + "." + ZoneName + "'.  The operation was aborted.";

				res.send({
					code: RespCode,
					zone: ZoneName,
					node: NodeName,
					type: RRType,
					message: RespMessage
				});

				console.log(RespCode + ': ' + RespMessage);

			} else {

				var execSet = exec(addexec,
					function (error, stdout, stderr) {
						if (error !== null) {

							var RespCode = "RecordUpdateFailed";
							var RespMessage = "There was a problem creating or updating the ('" + RRType + "') record '" + NodeName + "." + ZoneName + "' to '" + IpAddress + "'.  The operation was aborted.";


						} else {

							var RespCode = "RecordUpdated";
							var RespMessage = "The ('" + RRType + "') record '" + NodeName + "." + ZoneName + "' was successfully updated to '" + IpAddress + "'.";

						}

						res.send({
							code: RespCode,
							zone: ZoneName,
							node: NodeName,
							type: RRType,
							ip: IpAddress,
							message: RespMessage
						});

						console.log(RespCode + ': ' + RespMessage);

					}
				);


			}
		}
	);
}

// DNS Record Removal
function doDnsRemove(req, res, next) {

	var RRType = req.params.type.toUpperCase(),
		ZoneName = req.params.zone,
		NodeName = req.params.node;

	// Validate RRType
	if (RRType != "A") {
		return next(new errors.InvalidArgumentError("You specified an invalid record type ('" + RRType + "'). Currently, only the 'A' (alias) record type is supported.  e.g. /dns/my.zone/A/.."));
	}

	// Validate Zone Name
	if (ZoneName.match(/[^A-Za-z0-9\.-]+/g) !== null) {
		return next(new errors.InvalidArgumentError("Invalid zone name ('" + ZoneName + "'). Zone names can only contain letters, numbers, dashes (-), and dots (.)."));
	}

	// Validate Node Name
	if (NodeName.match(/[^A-Za-z0-9\.-]+/g) !== null) {
		return next(new errors.InvalidArgumentError("Invalid node name ('" + NodeName + "'). Node names can only contain letters, numbers, dashes (-), and dots (.)."));
	}

	// Execute
	var execRemove = exec('dnscmd /recorddelete ' + ZoneName + ' ' + NodeName + ' ' + RRType + ' /f',
		function (error, stdout, stderr) {
			if (error !== null) {

				var RespCode = "RecordRemoveFailed";
				var RespMessage = "There was a problem removing the alias ('A') record '" + NodeName + "." + ZoneName + "'.  The operation was aborted.";

			} else {

				var RespCode = "RecordRemoved";
				var RespMessage = "The alias ('A') record '" + NodeName + "." + ZoneName + "' was successfully removed.";

			}

			res.send({
				code: RespCode,
				zone: ZoneName,
				node: NodeName,
				type: RRType,
				message: RespMessage
			});

			console.log(RespCode + ': ' + RespMessage);
		}
	);
}

// DNS query
function doDnsQuery(req, res, next) {
	try {
		var ZoneName = req.params.zone;
		let zoneFilePath = path.join(process.env.windir, "system32", "dns", ZoneName + ".dns");

		// Validate zone
		if (!fs.existsSync(zoneFilePath)) {
			return next(new errors.InvalidArgumentError("Zone does not exist ('" + ZoneName + "')."));
		}

		let output = fs.readFile(zoneFilePath, (err, data) => {
			res.set('Content-Type', 'application/json');
			res.send(zoneParser.parse(data.toString()));
		});


	} catch (e) {
		return next(new errors.InvalidArgumentError("Unable to query zone: " + e.message));

		// res.send({
		// 	code: "ZoneQueryError",
		// 	zone: ZoneName,
		// 	message: "Unable to query zone: " + e.message
		// });
	}
}

// DNS query
function doDnsRawQuery(req, res, next) {
	try {
		var ZoneName = req.params.zone;
		let zoneFilePath = path.join(process.env.windir, "system32", "dns", ZoneName + ".dns");

		// Validate zone
		if (!fs.existsSync(zoneFilePath)) {
			return next(new errors.InvalidArgumentError("Zone does not exist ('" + ZoneName + "')."));
		}

		let output = fs.readFile(zoneFilePath, (err, data) => {
			res.set('Content-Type', 'text/html');
			res.send(data.toString());
		});


	} catch (e) {
		return next(new errors.InvalidArgumentError("Unable to query zone: " + e.message));

		// res.send({
		// 	code: "ZoneQueryError",
		// 	zone: ZoneName,
		// 	message: "Unable to query zone: " + e.message
		// });
	}
}

// List zones
function doListZonesQuery(req, res, next) {
	try {
		let ZoneName = req.params.zone;
		let zones = fs.readdirSync(path.join(process.env.windir, "system32", "dns"));

		zones = zones.filter(function (elm) {
			return elm.match(/.*\.(dns)/ig);
		});

		zones = zones.map((val) => {
			return val.replace(".dns", "");
		});

		res.set('Content-Type', 'application/json')
		res.send(JSON.stringify(zones));

		// // Validate zone
		// if (!fs.existsSync(zoneFilePath)) {
		// 	return next(new errors.InvalidArgumentError("Zone does not exist ('" + ZoneName + "')."));
		// }

		// let output = fs.readFile(zoneFilePath, (err, data) => {
		// 	res.set('Content-Type', 'text/html')
		// 	res.send(data.toString());
		// });


	} catch (e) {
		return next(new errors.InvalidArgumentError("Unable to query zone: " + e.message));

		// res.send({
		// 	code: "ZoneQueryError",
		// 	zone: ZoneName,
		// 	message: "Unable to query zone: " + e.message
		// });
	}
}

// Register Restify outes
// - For 'set'
server.get('/dns/:zone/:type/:node/set/:ip', doDnsSet);
server.head('/dns/:zone/:type/:node/set/:ip', doDnsSet);

// - For 'remove'
server.get('/dns/:zone/:type/:node/remove', doDnsRemove);
server.head('/dns/:zone/:type/:node/remove', doDnsRemove);

// - For 'query'
server.get('/dns/:zone/raw', doDnsRawQuery);
server.head('/dns/:zone/raw', doDnsRawQuery);

// - For 'query'
server.get('/dns/:zone', doDnsQuery);
server.head('/dns/:zone', doDnsQuery);

// - For 'list zones'
server.get('/dns', doListZonesQuery);
server.head('/dns', doListZonesQuery);
server.get('/dns/', doListZonesQuery);
server.head('/dns/', doListZonesQuery);

// Start the server
server.listen(3111, function () {
	console.log('%s web server listening at %s', server.name, server.url);
});


//NEW A: /dns/A/ma3-lb-01.ciptex.net/set/10.255.0.108
//NEW PTR: /dns/PTR/ma3-lb-01.ciptex.net/set/10.255.0.108
var five = require("johnny-five");
var amqp = require('amqplib/callback_api');

var board;
var ledBlue, ledGreen, ledRed, ledYellow;
var lcd;

board = new five.Board();

board.on("ready", function() {
	ledBlue = new five.Led(9);
	ledGreen = new five.Led(10);
	ledRed = new five.Led(11);
	ledYellow = new five.Led(12);

	lcd = new five.LCD({
    	// LCD pin name  RS  EN  DB4 DB5 DB6 DB7
    	pins: [26, 28, 30, 32, 34, 36],
  	});

	amqp.connect(process.env.CLOUDAMQP_CONNECTION, function(err, conn) {
		if (err) console.error(err);
		conn.createChannel(function(err, ch) {
			ch.assertQueue("jenkins-ci", {exclusive: true, autoDelete: true});
			ch.assertQueue("jenkins-ci-result", {exclusive: true, autoDelete: true});
			ch.bindQueue("jenkins-ci-result", "build-monitor", "ROUTINGKEY");
			ch.bindQueue("jenkins-ci-result", "build-monitor", "org.jenkinsci.plugins.rabbitmqbuildtrigger");

			ch.consume("jenkins-ci", function(msg) {
				var split = msg.content.toString().split("#");
				if (split[2] === "building") {
					console.log(split[0]);

					lcd.print(splitTitleForLCD(split[0], 2, 16, 0));
					lcd.cursor(1, 0);
					lcd.print(splitTitleForLCD(split[0], 2, 16, 1));

					console.log("Build number: %d", split[1]);
					console.log(split[2]);
					ledBlue.blink();
					setTimeout(function() {
						ledBlue.stop().off();
					}, 30000);
					playMusic();
				}
			}, {noAck: true});

			ch.consume("jenkins-ci-result", function(msg) {
				var obj = JSON.parse(msg.content.toString("utf8"));
				console.log("Project : %s", obj.project);
				console.log("Number : %s", obj.number);
				console.log("Status : %s", obj.status);
				if (obj.status === "SUCCESS") {
					showSuccess();
				} else if (obj.status === "FAILED") {
					showFailed();
				} else if (obj.status === "UNSTABLE") {
					showUnstable();
				}
			}, {noAck: true});
		});
	});
});

function splitTitleForLCD(title, rows, cols, currentRow) {
	if (title.length <= cols) {
		return currentRow === 0 ? title : "";
	} else {
		return currentRow === 0 ? title.substring(0, cols) : title.substring(cols, title.length);
	}
}

function showSuccess() {
	console.log("success");
	ledBlue.stop().off();
	ledGreen.blink();
	setTimeout(function() {
		ledGreen.stop().off();
		lcd.clear();
	}, 10000);
}

function showFailed() {
	console.log("failed");
	ledBlue.stop().off();
	ledRed.blink();
	setTimeout(function() {
		ledRed.stop().off();
		lcd.clear();
	}, 10000);
}

function showUnstable() {
	console.log("unstable");
	ledBlue.stop().off();
	ledYellow.blink();
	setTimeout(function() {
		ledYellow.stop().off();
		lcd.clear();
	}, 10000);
}
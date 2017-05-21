var five = require("johnny-five");
// var rotaryEncoder = require("johnny-five-rotary-encoder");
var amqp = require('amqplib/callback_api');

var board;
var ledBlue, ledGreen, ledRed, ledYellow;
var piezo;
var lcd;

board = new five.Board();

board.on("ready", function() {
	ledBlue = new five.Led(9);
	ledGreen = new five.Led(10);
	ledRed = new five.Led(11);
	ledYellow = new five.Led(12);
	piezo = new five.Piezo(3);

/*
	const upButton = new five.Button(28);
	const downButton = new five.Button(18);
	const pressButton = new five.Button(19);
	rotaryEncoder({
		upButton,
		downButton,
		pressButton,
		onUp: () => {
			console.log("up");
		}, 
		onDown: () => {
			console.log("down");
		},
		onPress: () => {
			console.log("press");
		},
	});
*/

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
				} else if (split[2] === "success") {
					showSuccess(split[2])
				} else if (split[2] === "failed") {
					showFailed(split[2]);
				} else if (split[2] === "unstable") {
					showUnstable(split[2]);
				}
			}, {noAck: true});

			ch.consume("jenkins-ci-result", function(msg) {
				var obj = JSON.parse(msg.content.toString("utf8"));
				console.log("Status : %s", obj.status);
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

function showSuccess(success) {
	console.log(success);
	ledBlue.stop().off();
	ledGreen.blink();
	setTimeout(function() {
		ledGreen.stop().off();
		lcd.clear();
	}, 10000);
}

function showFailed(failed) {
	console.log(failed);
	ledBlue.stop().off();
	ledRed.blink();
	setTimeout(function() {
		ledRed.stop().off();
		lcd.clear();
	}, 10000);
}

function showUnstable(unstable) {
	console.log(unstable);
	ledBlue.stop().off();
	ledYellow.blink();
	setTimeout(function() {
		ledYellow.stop().off();
		lcd.clear();
	}, 10000);
}

function playMusic() {
	piezo.play({
		song: [
			["C2", 1 / 4],
			["F3", 1 / 4],
			["C3", 1 / 4],
			["A2", 1 / 4],
			["C3", 1 / 4],
			["F3", 1 / 4],
			["C3", 1 / 2],
			["C3", 1 / 4],
			["F3", 1 / 4],
			["C3", 1 / 4],
			["F3", 1 / 4],
			["A3", 1 / 3],
			["G3", 1 / 8],
			["F3", 1 / 8],
			["E3", 1 / 8],
			["D3", 1 / 8],
			["C3", 1 / 8],
			["C3", 1 / 4],
			["F3", 1 / 4],
			["A3", 1 / 4],
			["A2", 1 / 4],
			["C3", 1 / 4],
			["F3", 1 / 4],
			["C3", 1 / 2],
			["A3", 1 / 4],
			[null, 1 / 8],
			["G3", 1 / 8],
			["F3", 1 / 4],
			["E3", 1 / 4],
			["D3", 1 / 4],
			["C3", 1 / 4],
			["C3", 1 / 4]
		],
		tempo: 50
	});
}
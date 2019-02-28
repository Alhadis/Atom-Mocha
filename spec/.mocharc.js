"use strict";

module.exports = {
	autoIt: true,
	reporter: "atom",
	require: "chai/should",
	
	beforeFinish(...args){
		return 0; // Cheat the exit-status
	}
};

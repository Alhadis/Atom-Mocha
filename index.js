"use strict";

const AtomMocha = require("./lib/main.js");
module.exports  = args =>
	new AtomMocha(args).run(args);

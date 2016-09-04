"use strict";

global.Mocha  = require("mocha");
global.Chai   = require("chai");
global.expect = Chai.expect;


/** Check if an element contains one or more CSS classes */
addToChai(["class", "classes"], function(...classNames){
	const negated = Chai.util.flag(this, "negate");
	let subjects  = Chai.util.flag(this, "object");
	subjects      = "length" in subjects ? Array.from(subjects) : [subjects];
	
	for(const subject of subjects){
		const classList = subject.classList;
		for(let names of classNames){
			if(!Array.isArray(names))
				names = names.split(/\s+/g);
			
			for(let name of names){
				const list = subject.classList.length
					? `classList "${subject.className}"`
					: "empty classList";
				
				this.assert(
					classList.contains(name),
					`expected ${list} to include "${name}"`,
					`expected ${list} not to include "${name}"`
				);
			}
		}
	}
});


/** Attach one or more HTML elements to the spec-runner window */
global.attachToDOM = function(...elements){
	if(global.atom.getLoadSettings().headless)
		return;
	
	const mocha = document.querySelector("#mocha");
	for(const el of elements)
		if(el !== mocha && !mocha.contains(el))
			mocha.parentElement.insertBefore(el, mocha);
};



/** Thin wrapper around Chai.Assertion.addMethod to permit plugin aliases */
function addToChai(names, fn){
	for(const name of names)
		Chai.Assertion.addMethod(name, fn);
}

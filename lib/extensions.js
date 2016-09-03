"use strict";

const Chai = require("chai");
global.expect = Chai.expect;


/** Check if an element contains one or more CSS classes */
Chai.Assertion.addMethod("class", function(...classNames){
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
				
				const actual = Array.from(subject.classList);
				let expected = actual.slice(0);
				negated
					? expected = expected.filter(n => n !== name)
					: expected.push(name);
				
				this.assert(
					classList.contains(name),
					`expected ${list} to include "${name}"`,
					`expected ${list} not to include "${name}"`,
					expected.sort(),
					actual.sort(),
					true
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

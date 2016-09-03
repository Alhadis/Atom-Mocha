"use strict";

const Chai = require("chai");
global.expect = Chai.expect;


/** Check if an element contains one or more CSS classes */
Chai.Assertion.addMethod("class", function(classNames){
	const subject   = Chai.util.flag(this, "object");
	const negated   = Chai.util.flag(this, "negate");
	const classList = subject.classList;
	
	if(!Array.isArray(classNames))
		classNames = classNames.split(/\s+/g);
	
	for(let name of classNames){
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

"use strict";

const Chai = require("chai");
global.expect = Chai.expect;


/** Check if an element contains one or more CSS classes */
Chai.Assertion.addMethod("class", function(classNames){
	const subject   = Chai.util.flag(this, "object");
	const classList = subject.classList;
	
	if(!Array.isArray(classNames))
		classNames = classNames.split(/\s+/g);
	
	for(let name of classNames){
		this.assert(
			classList.contains(name),
			"expected classList '" + subject.className + "' to include #{exp}",
			"expected classList '" + subject.className + "' not to include #{exp}",
			subject.className,
			name,
			false
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

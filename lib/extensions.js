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


/** Assert that a file exists in the filesystem */
Chai.Assertion.addProperty("existOnDisk", function(){
	const path = Chai.util.flag(this, "object");
	let exists = false;
	
	try{
		require("fs").statSync(path);
		exists = true;
	} catch(e){}
	
	this.assert(
		exists,
		`expected "${path}" to exist in filesystem`,
		`expected "${path}" not to exist in filesystem`
	);
});


/** Assert that an HTML element has user focus */
Chai.Assertion.addProperty("focus", function(){
	const subject = Chai.util.flag(this, "object");
	let focussed;
	
	if(subject.jquery)
		focussed = subject.is(":focus");
	
	else{
		const ae = document.activeElement;
		focussed = ae === subject || ae.contains(ae);
	}
	
	this.assert(
		focussed,
		"expected element to have focus",
		"expected element not to have focus"
	);
});



/** Attach one or more HTML elements to the spec-runner window */
global.attachToDOM = function(...elements){
	if(global.atom.getLoadSettings().headless)
		return;
	
	const mocha = document.querySelector("#mocha");
	const body  = mocha.parentElement;
	for(const el of elements)
		if(el !== mocha && !body.contains(el))
			body.insertBefore(el, mocha);
};


/** Reset previously-added HTML elements */
global.resetDOM = function(){
	if(global.atom.getLoadSettings().headless)
		return;
	
	const mocha = document.querySelector("#mocha");
	for(const el of Array.from(document.body.children))
		if(el !== mocha) document.body.removeChild(el);
};



/** Thin wrapper around Chai.Assertion.addMethod to permit plugin aliases */
function addToChai(names, fn){
	for(const name of names)
		Chai.Assertion.addMethod(name, fn);
}

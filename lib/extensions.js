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


/** Assert that two filesystem paths are the same */
Chai.Assertion.addMethod("equalPath", function(path){
	const normalise = require("path").normalize;
	const subject   = Chai.util.flag(this, "object");
	const expected  = normalise(path);
	const actual    = normalise(subject);
	
	this.assert(
		actual === expected,
		"expected path #{act} to equal #{exp}",
		"expected path #{act} not to equal #{exp}",
		expected,
		actual,
		false
	);
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
	const ae = document.activeElement;
	
	let subject = Chai.util.flag(this, "object");
	if(subject.jquery)
		subject = subject[0];
	
	this.assert(
		ae === subject || ae.contains(subject),
		"expected element to have focus",
		"expected element not to have focus"
	);
});


/** Assert that an HTML element is rendered in the DOM tree */
Chai.Assertion.addProperty("drawn", function(){
	let subject = Chai.util.flag(this, "object");
	if(subject.jquery)
		subject = subject[0];
	
	const bounds = subject.getBoundingClientRect();
	const {top, right, bottom, left} = bounds;
	
	this.assert(
		!(top === 0 && right === 0 && bottom === 0 && left === 0),
		"expected element to be drawn",
		"expected element not to be drawn"
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


/** Remove previously-added HTML elements */
global.resetDOM = function(){
	if(global.atom.getLoadSettings().headless)
		return;
	
	const mocha = document.querySelector("#mocha");
	for(const el of Array.from(document.body.children))
		if(el !== mocha) document.body.removeChild(el);
};


/**
 * @global - Predicate to skip POSIX-only tests.
 * This avoids marking skipped tests as "pending" if run on Windows.
 *
 * @example
 * unlessOnWindows.describe("Symlinks", …);
 * unlessOnWindows.it("tests hard-links", …);
 * unlessOnWindows(posixOnlyFunc => …);
 *
 * @property {Function} describe
 * @property {Function} specify
 * @property {Function} it
 * @type {Function}
 */
global.unlessOnWindows = (mochFn => {
	const noope = () => {};
	const isWin = "win32" === process.platform;
	const output = cb => (cb && !isWin) ? cb() : noope();
	for(const name of mochFn){
		const value = isWin ? noope : (...args) => global[name](...args);
		Object.defineProperty(output, name, {value});
	}
	return output;
})(["describe", "it", "specify"]);


/**
 * Call `describe()` with "When " prepended to its description.
 *
 * Complements the `autoIt` setting and helps specs read more naturally.
 * Only globalised if `when` doesn't exist in global scope.
 *
 * @example when("it loads the page", () => it("does this", fn)));
 * @param {String} text
 * @param {...*} args
 * @type {Function}
 */
function when(text, ...args){
	return describe("When " + text, ...args);
}

if(null == global.when)
	global.when = when;


/** Thin wrapper around Chai.Assertion.addMethod to permit plugin aliases */
function addToChai(names, fn){
	for(const name of names)
		Chai.Assertion.addMethod(name, fn);
}

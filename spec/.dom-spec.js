"use strict";

atom.document.body.className += " nah";

describe("DOM", () => {
	
	it("checks class attributes correctly", () => {
		const body = atom.document.body;
		expect(body).not.to.have.class("nah");
	});
});

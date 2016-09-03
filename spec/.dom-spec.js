"use strict";

atom.document.body.className += " nah";

describe("DOM", () => {
	
	it("checks class attributes correctly", () => {
		const body = atom.document.body;
		const html = atom.document.documentElement;
		
		html.classList.add("root");
		expect([body, html]).to.have.class("platform-darwin", ["nah"]);
	});
});

"use strict";

atom.document.body.className += " nah";

describe("DOM", () => {
	
	it("shows what a failed class assertion looks like", () => {
		const {body, documentElement: html} = atom.document;
		
		html.classList.add("root");
		expect([body, html]).to.have.classes("platform-darwin", ["nah"]);
	});
});

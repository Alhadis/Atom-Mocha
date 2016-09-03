"use strict";

atom.document.body.className += " nah";

describe("DOM", () => {
	
	it("shows what a failed class assertion looks like", () => {
		const body = atom.document.body;
		const html = atom.document.documentElement;
		
		html.classList.add("root");
		expect([body, html]).to.have.classes("platform-darwin", ["nah"]);
	});
});

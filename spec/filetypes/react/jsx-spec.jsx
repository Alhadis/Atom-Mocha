"use babel";
/** @jsx */

const React = require("react");

describe("Filetype: JSX", () => {
	it("runs JSX specs", () => {
		const el = <div className="foo">This is text</div>;
		el.props.className.should.equal("foo");
	});
});

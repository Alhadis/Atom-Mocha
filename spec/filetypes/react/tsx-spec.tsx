import * as React from "react";

declare namespace JSX {
	interface IIntrinsicElements {
		foo: { bar: string; baz?: number };
	}
}

describe("Filetype: TSX", () => {
	it("runs TSX specs", () => {
		(<foo bar="xyz" />).props.should.have.property("bar").that.equals("xyz");
		(<foo baz={2 + 4} />).props.should.have.property("baz").that.equals(6);
	});
});

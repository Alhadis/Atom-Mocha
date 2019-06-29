describe("Subdirectory specs", () => {
	it("should run this if --recursive is enabled", () => {
		AtomMocha.options.recursive.should.equal(true);
	});
});

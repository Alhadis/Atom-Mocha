"use strict";

const {join, resolve}          = require("path");
const {tmpdir}                 = require("os");
const {captureScreen}          = require("../lib/utils.js");
const {existsSync, unlinkSync} = require("fs");

describe("Screenshots", function(){
	this.timeout(5000);
	const junkFiles = new Set();
	
	before("Attaching workspace element", () => {
		const ui = atom.workspace.getElement();
		if(!document.documentElement.contains(ui))
			attachToDOM(ui);
	});
	
	before("Testing JPEG snapshots (100% quality)", async () => {
		const saveTo  = join(tmpdir(), process.pid + ".jpeg.best-quality");
		const results = await AtomMocha.snapshot(saveTo, "jPg", 100);
		results.should.eql({img: saveTo + ".jpg", dom: saveTo + ".html"});
		expect(results.img).to.existOnDisk;
		expect(results.dom).to.existOnDisk;
	});
	
	before("Testing JPEG snapshots (0% quality)", async () => {
		let saveTo    = join(".atom-mocha", process.pid + ".jpeg.worst-quality");
		const results = await AtomMocha.snapshot(saveTo, "jpeg", 0);
		saveTo        = join(resolve(__dirname, ".."), saveTo);
		Object.values(results).forEach(junk => junkFiles.add(junk));
		results.should.eql({img: saveTo + ".jpg", dom: saveTo + ".html"});
		expect(results.img).to.existOnDisk;
		expect(results.dom).to.existOnDisk;
	});
	
	after("Removing unwanted artefact", () => {
		for(const junk of junkFiles){
			existsSync(junk) && unlinkSync(junk);
			junkFiles.delete(junk);
		}
	});
	
	it("demystifies unreproducible CI failures", () => { // Hopefully
		const saveTo = join(AtomMocha.options.snapshotDir, "screen.png");
		return captureScreen(saveTo);
	});
});

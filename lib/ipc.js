"use strict";

const {remote, ipcRenderer} = require("electron");
const EVENT_CLOSE_PROJECT   = "atom-mocha:close-project";
const EVENT_JUMP_TO_FILE    = "atom-mocha:jump-to-file";


class IPC{
	
	init(projectPath){
		global.AtomMocha = {};
		this.projectPath = projectPath;
		this.injectHooks();
	}
	
	
	jumpToFile(path, row, column){
		ipcRenderer.send(EVENT_JUMP_TO_FILE, path, row, column);
	}
	
	
	/**
	 * Install the `jumpToFile` command in project's window.
	 *
	 * NB: There's probably a better way to implement this.
	 * @private
	 */
	injectHooks(){
		const path = this.projectPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		const code = this.getInjectedCode(path);
		
		for(const item of remote.webContents.getAllWebContents())
			if("window" === item.getType())
				item.executeJavaScript(code);
	}
	
	
	getInjectedCode(path){
		return "if(global.atom && null == global.AtomMocha && " + 
		`-1 !== global.atom.project.getPaths().indexOf("${ path }")){
			const {remote, ipcRenderer} = require("electron");
			const {Range} = require("atom");
			
			const AtomMocha = {
				handleJump(event, ...args){
					AtomMocha.jumpToFile(...args);
				},
				jumpToFile(file, row, col){
					atom.project.contains(file) && atom.workspace.open(file).then(editor => {
						const cursor = editor.getLastCursor();
						const offset = Math.floor(editor.rowsPerPage / 2);
						cursor.setBufferPosition([row, col], {autoscroll: false});
						editor.scrollToScreenRange(new Range([row - offset, col], [row + offset, col]));
						atom.focus();
					});
				}
			};
			
			global.AtomMocha = AtomMocha;
			remote.ipcMain.on("${ EVENT_JUMP_TO_FILE }", AtomMocha.handleJump);
			window.addEventListener("beforeunload", () => {
				ipcRenderer.send("${ EVENT_CLOSE_PROJECT }", "${ path }");
				remote.ipcMain.removeListener("${ EVENT_JUMP_TO_FILE }", AtomMocha.handleJump);
			});
		}`;
	}
}

module.exports = new IPC();

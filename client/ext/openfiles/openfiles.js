/**
 * Code Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var editors = require("ext/editors/editors");
var settings = require("ext/settings/settings");
var treepanel = require("ext/tree/tree");
var markup = require("text!ext/openfiles/openfiles.xml");

module.exports = ext.register("ext/openfiles/openfiles", {
    name            : "Active Files",
    dev             : "Ajax.org",
    alone           : true,
    type            : ext.GENERAL,
    markup          : markup,
    nodes           : [],

    hook : function(){
        this.nodes.push(
            mnuFilesSettings.insertBefore(new apf.divider(), 
                mnuFilesSettings.firstChild),
            mnuFilesSettings.insertBefore(new apf.item({
                type : "radio",
                caption : "Show Open Files",
                onclick : function(){
                    _self.showOpenFiles();
                }
            }), mnuFilesSettings.firstChild),
            mnuFilesSettings.insertBefore(new apf.item({
                type : "radio",
                selected : true,
                caption : "Show Project Files",
                onclick : function(){
                    _self.showProjectFiles();
                }
            }), mnuFilesSettings.firstChild)
        );

        var _self = this;
        var model = this.model = new apf.model().load("<files />");

        ide.addEventListener("afteropenfile", function(e){
            var node = e.doc.getNode();
            if (node) {
                if (!model.queryNode("//node()[@path='" + node.getAttribute("path") + "']"))
                    model.appendXml(apf.getCleanCopy(node));
            }
        });

        ide.addEventListener("closefile", function(e){
            var node = e.xmlNode;
            model.removeXml("//node()[@path='" + node.getAttribute("path") + "']");
        });

        ide.addEventListener("updatefile", function(e){
            var node  = e.xmlNode;
            var fNode = model.queryNode("//node()[@path='" + e.path + "']");
            if (node && fNode) {
                fNode.setAttribute("path", node.getAttribute("path"));
                if (e.name)
                    apf.xmldb.setAttribute(fNode, "name", apf.getFilename(e.name));
            }
        });
    },

    init : function() {
        var _self = this;
        
        this.nodes.push(winFilesViewer.appendChild(lstOpenFiles));
        
        lstOpenFiles.setModel(this.model);

        lstOpenFiles.addEventListener("afterselect", this.$afterselect = function(e) {
            var node = this.selected;
            if (!node || this.selection.length > 1) //ide.onLine can be removed after update apf
                return;

            ide.dispatchEvent("openfile", {doc: ide.createDocument(node)});
        });

        lstOpenFiles.addEventListener("afterremove", function(e){
            //Close selected files
            var sel = this.getSelection();
            for (var i = 0; i < sel.length; i++) {
                tabEditors.remove(tabEditors.getPage(sel[i].getAttribute("path")));
            }
        });

        tabEditors.addEventListener("afterswitch", function(e){
            var page = e.nextPage;
            if (page) {
                var node = _self.model.queryNode("//node()[@path='" + page.$model.data.getAttribute("path") + "']");
                if (node)
                    lstOpenFiles.select(node);
            }
        });

        ide.addEventListener("treechange", function(e) {
            var path    = e.path.replace(/\/([^/]*)/g, "/node()[@name=\"$1\"]")
                                .replace(/\[@name="workspace"\]/, "")
                                .replace(/\//, "");
            var parent = trFiles.getModel().data.selectSingleNode(path);
            if (!parent)
                return;

            var nodes = parent.childNodes;
            var files = e.files;
            var removed = [];

            for (var i = 0; i < nodes.length; ++i) {
                var node    = nodes[i],
                    name    = node.getAttribute("name");

                if (files[name])
                    delete files[name];
                else
                    removed.push(node);
            }
            removed.forEach(function (node) {
                // console.log("REMOVE", node);
                apf.xmldb.removeNode(node);
            });
            path = parent.getAttribute("path");
            for (var name in files) {
                var file = files[name];

                xmlNode = "<" + file.type +
                    " type='" + file.type + "'" +
                    " name='" + name + "'" +
                    " path='" + path + "/" + name + "'" +
                "/>";
                // console.log("CREATE", xmlNode, parent);
                trFiles.add(xmlNode, parent);
            }
        });
    },
    
    showOpenFiles : function(){
        ext.initExtension(this);
        
        trFiles.hide();
        lstOpenFiles.show();
        
        winFilesViewer.setTitle("Open Files");
        sbTrFiles.setAttribute("for", "lstOpenFiles");
    },
    
    showProjectFiles : function(){
        trFiles.show();
        if (self.lstOpenFiles)
            lstOpenFiles.hide();
        
        winFilesViewer.setTitle("Project Files");
        sbTrFiles.setAttribute("for", "trFiles");
    },
    
    enable : function(){
        this.nodes.each(function(item){
            item.enable();
        });
    },
    
    disable : function(){
        this.nodes.each(function(item){
            item.disable();
        });
    },
    
    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
    },
});

});

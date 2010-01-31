// ==UserScript==
// // @name         TextareaForMT5
// // @namespace    http://github.com/usualoma/textarea-for-mt5
// // @description  Editing template by plain textarea.
// // @include      http://*
// // @exclude
// // ==/UserScript==
if (
	(typeof unsafeWindow.MT !== 'undefined')
	&& (typeof unsafeWindow.jQuery !== 'undefined')
) {
	(function() {
		var $ = unsafeWindow.jQuery;
		var code_mirror = $('#template-body-field .CodeMirror-wrapping');
		if (code_mirror.length) {
			setTimeout(function() {
				unsafeWindow.editor.getCode = null;
				code_mirror.hide();
				$('#text').attr('rows', 30).show();
			}, 1000);
		}
	})();
}

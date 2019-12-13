//get by id
var classMainElement = "mainPanelAutoIndexLine";
var classMainParaQuestion = "mainParaQuestion";
var classParaQuestionFilter = "p.ng-scope";
var tagOfRefQuestion = "associatedtext";
var cssMarkFiveLine = "mark-line-five";
var tagOfRefQuestionAnswer = "linetext";
var lastWidth = 0;
var lastHeight = 0;
var paraMaps = {};
var interValAutoIndex = 2000;
var idInterVal;

$(window).resize(function() {
	if (idInterVal !== null && idInterVal !== undefined) {
		clearTimeout(idInterVal);
	}
    idInterVal = setTimeout(autoGenIndexLines, interValAutoIndex);
    
});

function doneResizing(){
	reset();
	autoGenIndexLines();
}

function reset() {
	if (idInterVal !== null && idInterVal !== undefined) {
		clearInterval(idInterVal);
	}
	lastWidth = 0;
	lastHeight = 0;
}

function autoGenIndexLines() {
	try {
		var mainParaElements = $('body').find("." + this.classMainElement);
		if (mainParaElements.size() > 0) {
			var currentWidth = $((mainParaElements)[0]).width();
			var currentHeight = $((mainParaElements)[0]).height();

			if ((lastWidth !== currentWidth) || (lastHeight !== currentHeight)) {
				$('.mark-line-five').remove();
				mainParaElements.each(function(index) {
					var mainParaElement = $(this);
					var paraMap = {};
					paraMaps = {};
					paraMaps[index] = paraMap;
					autoGenIndexEachLine(paraMap, mainParaElement);

					lastWidth = currentWidth;
					lastHeight = currentHeight;
				});
			}
		} else {
			reset();
		}
	} catch (ex) {
		console.log(ex.message);
	}
}

function initLineByHeight(paraMap, mainParaElement) {
	try {
		var mainParaQuestion = $(mainParaElement).find(
				"." + classMainParaQuestion);

		var paraQuestions = $(mainParaQuestion).find(classParaQuestionFilter);
		var offsetMainTop = mainParaQuestion.offset().top;
		var totalLine = 0;
		paraQuestions.each(function() {
			var currentParaQuestion = $(this)[0];
			if ($.trim($(currentParaQuestion).text()) == '') {
				return;
			}
			var offsetTopParaQuestion = $(currentParaQuestion).offset().top;

			var headerSize = offsetTopParaQuestion - offsetMainTop;

			var height = $(currentParaQuestion).height();
			var lineHeight = getExactlyLineHeight($(currentParaQuestion));
			if (lineHeight === "normal") {
				console.log("lineHeight is normal");
				return;
			}

			var refTexts = $(currentParaQuestion).find(tagOfRefQuestion);

			refTexts.each(function() {
				var currentRefText = $(this)[0];
				var idText = currentRefText.id;

				var offsetParentTop = $(currentRefText).offset().top
						- offsetTopParaQuestion;
				var lineText = totalLine + 1;
				if (offsetParentTop >= lineHeight) {
					lineText += Math.round(offsetParentTop / lineHeight);
				}
				paraMap[idText] = lineText;
				// console.log('idText: ' + idText + ' __line : ' + lineText);
			});

			var totalLineInPara = Math.round(height / lineHeight);
			if (totalLineInPara >= 1) {
				for (var i = 1; i <= totalLineInPara; i++) {
					totalLine += 1;

					if (totalLine % 5 === 0) {
						var currentLineInPara = i;
						var currentLineOffsetTop = 3 + headerSize
								+ (lineHeight * (currentLineInPara - 1));
						var markLineFive = $("<div/>", {
							"class" : cssMarkFiveLine,
							"css" : {
								"position" : "absolute",
								"top" : currentLineOffsetTop,
								"left" : 0,
								"font-size" : "0.9em",
								"font-weight" : "bold",
								"color" : "red"
							},
							"text" : totalLine
						});
						mainParaQuestion.append(markLineFive);
					}

				}
			}
		});

	} catch (ex) {
		console.log(ex.message);
	}
}

function autoGenIndexEachLine(paraMap, mainParaElement) {
	try {
		initLineByHeight(paraMap, mainParaElement);

		var lineTexts = $(mainParaElement).find(tagOfRefQuestionAnswer);
		lineTexts.each(function() {
			var currentLineText = $(this)[0];
			var idText = tagOfRefQuestion + "#"
					+ $(currentLineText).eq(0).attr('ref');
			var realLine = paraMap[idText];

			var prevElement = currentLineText.previousSibling;
			if (prevElement == null) {
				console.log("idtext prev null : " + idText);
				return;
			}
			var contentPrev = prevElement.nodeValue;
			if (contentPrev === null) {
				contentPrev = "";
			}

			var indexNeedRemove = contentPrev.lastIndexOf("line");
			if (indexNeedRemove != -1) {
				contentPrev = contentPrev.substring(0, indexNeedRemove);
			}

			contentPrev += " line " + realLine + " ";
			prevElement.nodeValue = contentPrev;
		});
	} catch (ex) {
		console.log(ex.message);
	}
}

function getExactlyLineHeight(paraElement) {
	var eleAutoLineHeight = $("<span/>", {
		"class" : "auto-cal-line-height",
		"css" : {
			"display" : "inline-block"
		},
		"text" : "0"
	});
	$(paraElement).append(eleAutoLineHeight);
	var lineHeight = $(eleAutoLineHeight).outerHeight();
	$(eleAutoLineHeight).remove();
	return lineHeight;
}

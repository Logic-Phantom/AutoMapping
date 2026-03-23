/*
 * 🚀 Grid + DataSet 최종판: 'N건' 요청 시 실제로 N개의 행(Row)을 물리적으로 생성
 */
function onBtnSmartGridFillClick(e){

	var rawText = app.lookup("txaUserInput").value; 
	if (!rawText) return alert("추가할 데이터를 텍스트로 입력해주세요.");

	var grid = app.lookup("grd1");
	var dataSet = grid.dataSet; 
	var headers = dataSet.getHeaders(); 
	
	var today = new Date();
	var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
	
	var columnNames = []; 
	
	var codeDictionaries = {
		"deptCode": "영업팀: DEPT_001, 인사팀: DEPT_002, IT팀: DEPT_003",
		"bankCode": "국민은행: KB_04, 신한은행: SH_05, 우리은행: WR_06",
		"itemCategory": "모니터: CAT_M, 마우스: CAT_MO, 키보드: CAT_K" 
	};
	
	import("../google_ai.js").then(function(module) {
		var GoogleGenerativeAI = module.GoogleGenerativeAI;
		var SchemaType = module.SchemaType;
		var genAI = new GoogleGenerativeAI(""); // 🚨 키 입력
		
		var dynamicProperties = {}; 
		
		for(var i = 0; i < headers.length; i++) {
			var header = headers[i];
			var colId = header.getName(); 
			var colInfo = header.getInfo() || colId; 
			
			var schemaType = (header.getDataType() === "number" || header.getDataType() === "decimal") ? SchemaType.NUMBER : SchemaType.STRING;
			
			var extraRule = "";
			
			if(colId.toLowerCase().indexOf("date") > -1 || colId.toLowerCase().indexOf("dt") > -1) {
				extraRule += " (기준일 [" + todayStr + "] 바탕으로 YYYY-MM-DD 변환 필)";
			}
			
			if (codeDictionaries[colId]) {
				extraRule += " (🔥반드시 다음 사전을 참고하여 한글 대신 '코드값'으로 추출할 것. [사전: " + codeDictionaries[colId] + "])";
			}

			columnNames.push(colId);
			dynamicProperties[colId] = { 
				type: schemaType, 
				description: "'" + colInfo + "' 데이터 추출." + extraRule 
			};
		}
		
		var model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash", 
			generationConfig: {
				temperature: 0, 
				responseMimeType: "application/json",
				responseSchema: {
					type: SchemaType.ARRAY, 
					items: {
						type: SchemaType.OBJECT, 
						properties: dynamicProperties,
						required: columnNames
					}
				}
			}
		});

		// 🚀 [수정된 프롬프트] N건 요청 시 수량 컬럼에 넣지 않고, 'N개의 행(Row)'으로 쪼개서 생성하도록 강제 지시
		var prompt = "주어진 텍스트를 분석하여 요청된 데이터를 배열(Array) 형태로 추출해 주세요.\n\n" + 
		"🔥 [데이터 추출의 엄격한 3대 원칙] 🔥\n" +
		"1. 다건(Row) 물리적 복제: 텍스트에 'N건', 'N개' 등 수량이 명시되어 있다면, 하나의 객체에 수량을 텍스트로 넣는 대신 **반드시 해당 데이터를 N번 복제하여 배열 내에 N개의 독립된 객체(Row)로 생성**하세요. (예: '짜장면 5건' -> 똑같은 짜장면 데이터가 들어있는 객체를 5개 만들어서 배열에 담을 것)\n" +
		"2. 유추 및 생성 절대 금지 (No Hallucination): 텍스트에 명시적으로 언급되지 않은 다른 품목(예: 짬뽕, 탕수육 등)이나 정보는 문맥상 그럴듯해 보이더라도 절대 임의로 지어내지 마세요.\n" +
		"3. 빈 값 처리: 텍스트에서 찾을 수 없는 속성은 반드시 null로 처리하세요.\n\n" +
		"분석할 텍스트:\n\"" + rawText + "\"";
		
		console.log("AI 다건(Row 복제) 분석 시작...");
		return model.generateContent(prompt);

	}).then(function(result) {
		var extractedArray = JSON.parse(result.response.text());
		console.log("✅ AI 추출 완료 (총 " + extractedArray.length + "건):", extractedArray);
		
		var insertIdx = grid.getSelectedRowIndex();
		
		for(var j = 0; j < extractedArray.length; j++) {
			var rowData = extractedArray[j];
			
			if (insertIdx === -1) {
				dataSet.addRowData(rowData);
			} else {
				grid.insertRowData(insertIdx + 1, false, rowData);
				insertIdx++; 
			}
		}
		
		app.getContainer().redraw();
		alert(extractedArray.length + "건의 행(Row)이 성공적으로 추가되었습니다!");

	}).catch(function(error) {
		console.error("AI 연동 오류:", error);
		alert("처리 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
	});
}
/*
 * 🚀 DataMap 단건 버전: 공통 코드(Code) 자동 치환 적용판
 */
function onBtnAutoFillMapClick(e){

	var rawText = app.lookup("txaUserInput").value; 
	if (!rawText) return alert("분석할 텍스트를 입력해주세요.");

	var targetDataMap = app.lookup("dmOrder"); 
	var headers = targetDataMap.getHeaders(); 
	var columnNames = []; 
	
	import("../google_ai.js").then(function(module) {
		var GoogleGenerativeAI = module.GoogleGenerativeAI;
		var SchemaType = module.SchemaType;
		var genAI = new GoogleGenerativeAI("");
		var dynamicProperties = {}; 

		// 💡 [고도화 2] 화면에서 쓰는 공통 코드들을 미리 사전(Dictionary)처럼 정의합니다.
		// 실무에서는 app.lookup("dsDeptCode") 등에서 라벨/값을 뽑아와 조립하면 완벽합니다!
		var codeDictionaries = {
			"deptCode": "영업팀: DEPT_001, 인사팀: DEPT_002, IT팀: DEPT_003",
			"bankCode": "국민은행: KB_04, 신한은행: SH_05, 우리은행: WR_06"
		};
		
		for(var i = 0; i < headers.length; i++) {
			var header = headers[i];
			var colId = header.getName(); 
			var colInfo = header.getInfo() || colId; 
			
			var schemaType = (header.getDataType() === "number") ? SchemaType.NUMBER : SchemaType.STRING;
			
			// 💡 코드 맵핑 룰 주입: 이 컬럼이 공통 코드 대상이라면 AI에게 규칙을 강제합니다.
			var extraRule = "";
			if (codeDictionaries[colId]) {
				extraRule = " (🔥매우 중요: 반드시 다음 매핑을 참고하여 한글이 아닌 '코드값'으로만 반환할 것. [매핑: " + codeDictionaries[colId] + "])";
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
					type: SchemaType.OBJECT,
					properties: dynamicProperties,
					required: columnNames
				}
			}
		});

		var prompt = "다음 텍스트에서 데이터를 추출해:\n\"" + rawText + "\"";
		return model.generateContent(prompt);

	}).then(function(result) {
		var extractedData = JSON.parse(result.response.text());
		console.log("✅ 코드 치환 완료:", extractedData);
		
		for(var i = 0; i < columnNames.length; i++) {
			var colName = columnNames[i];
			if(extractedData[colName] != null) targetDataMap.setValue(colName, extractedData[colName]);
		}
		
		app.getContainer().redraw();
		alert("공통 코드 치환이 완료되었습니다!");
	});
}
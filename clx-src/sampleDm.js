function onBtnAutoFillClick(e){

	var rawText = app.lookup("txaUserInput").value; 
	if (!rawText) return alert("분석할 텍스트를 입력해주세요.");

	var targetDataMap = app.lookup("dmOrder"); 
	var headers = targetDataMap.getHeaders(); 
	
	// 기준이 될 '오늘 날짜' 구하기 (프롬프트 본문이 아닌 변수로 빼둡니다)
	var today = new Date();
	var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
	
	var columnNames = []; 
	
	import("./google_ai.js").then(function(module) {
		var GoogleGenerativeAI = module.GoogleGenerativeAI;
		var SchemaType = module.SchemaType;
		var genAI = new GoogleGenerativeAI("");
		
		var dynamicProperties = {}; 
		
		// 🚀 [전문가 방식] 반복문을 돌면서 컬럼의 특성에 따라 '맞춤형 스키마'를 자동 생성합니다.
		for(var i = 0; i < headers.length; i++) {
			var header = headers[i];
			var colId = header.getName(); 
			var colInfo = header.getInfo() || colId; 
			
			// eXBuilder6 컬럼의 실제 데이터 타입 가져오기 ("string", "number" 등)
			var eXBuilderDataType = header.getDataType(); 
			
			// 1. 기본 타입 설정 (숫자형 컬럼이면 AI에게도 NUMBER로 강제)
			var schemaType = SchemaType.STRING;
			if(eXBuilderDataType === "number" || eXBuilderDataType === "decimal") {
				schemaType = SchemaType.NUMBER;
			}
			
			// 2. 날짜 컬럼 자동 감지 및 포맷팅 규칙 주입
			// 컬럼 ID에 'date', 'dt'가 포함되어 있으면 날짜 변환 규칙을 스키마 설명(Description)에 몰래 끼워 넣습니다.
			var extraRule = "";
			var lowerColId = colId.toLowerCase();
			if(lowerColId.indexOf("date") > -1 || lowerColId.indexOf("dt") > -1) {
				extraRule = " (단, 상대적인 날짜 표현은 기준일 [" + todayStr + "]을 바탕으로 계산하여 반드시 'YYYY-MM-DD' 형식으로 변환할 것)";
			}

			columnNames.push(colId);
			
			// 3. 거대한 프롬프트 대신, 컬럼별 설명(Description)에 규칙을 분산 배치!
			dynamicProperties[colId] = { 
				type: schemaType, 
				description: "'" + colInfo + "' 데이터 추출." + extraRule + + "' 입니다. 해당하는 내용이 없으면 null로 반환하세요."
			};
		}
		
		// 시스템 설정과 스키마 주입
		var model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash",
			// systemInstruction: "너는 엔터프라이즈 데이터 추출 AI다. 주어진 스키마 규칙을 엄격히 준수해라.", (선택 사항)
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

		// 💡 메인 프롬프트가 기가 막히게 짧고 단순해집니다. (유지보수 극대화)
		var prompt = "다음 텍스트에서 데이터를 추출해:\n\"" + rawText + "\"";
		
		return model.generateContent(prompt);

	}).then(function(result) {
		var extractedData = JSON.parse(result.response.text());
		console.log("AI 추출 완료:", extractedData);
		
		for(var i = 0; i < columnNames.length; i++) {
			var colName = columnNames[i];
			var extractedValue = extractedData[colName];
			
			if(extractedValue !== undefined && extractedValue !== null) {
				targetDataMap.setValue(colName, extractedValue);
			}
		}
		
		app.getContainer().redraw();
		alert("자동 완성이 완료되었습니다!");

	}).catch(function(error) {
		console.error("AI 연동 오류:", error);
	});
}
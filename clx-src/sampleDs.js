/*
 * 🚀 Grid + DataSet 연동판: 선택된 행 위치에 AI 추출 데이터 삽입/추가
 */
function onBtnAddGridRowClick(e){

	var rawText = app.lookup("txaUserInput").value; 
	if (!rawText) return alert("추가할 데이터를 텍스트로 입력해주세요.");

	// 1. 그리드 및 데이터셋 객체 획득
	var grid = app.lookup("grd1");
	var dataSet = grid.dataSet; // 그리드에 바인딩된 데이터셋
	var headers = dataSet.getHeaders(); 
	
	// 기준 날짜 세팅 (프롬프트 간소화용)
	var today = new Date();
	var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
	
	var columnNames = []; 
	
	import("./google_ai.js").then(function(module) {
		var GoogleGenerativeAI = module.GoogleGenerativeAI;
		var SchemaType = module.SchemaType;
		var genAI = new GoogleGenerativeAI("AIzaSyAN8UeHL5VAEkhrJNluAtMnIs2591pM8i0");
		
		var dynamicProperties = {}; 
		
		// 2. 데이터셋 헤더를 돌면서 AI 스키마 동적 생성 (DataMap 방식과 동일)
		for(var i = 0; i < headers.length; i++) {
			var header = headers[i];
			var colId = header.getName(); 
			var colInfo = header.getInfo() || colId; 
			var eXBuilderDataType = header.getDataType(); 
			
			var schemaType = SchemaType.STRING;
			if(eXBuilderDataType === "number" || eXBuilderDataType === "decimal") {
				schemaType = SchemaType.NUMBER;
			}
			
			var extraRule = "";
			var lowerColId = colId.toLowerCase();
			if(lowerColId.indexOf("date") > -1 || lowerColId.indexOf("dt") > -1) {
				extraRule = " (상대적인 날짜는 [" + todayStr + "] 기준 YYYY-MM-DD 포맷 변환)";
			}

			columnNames.push(colId);
			
			dynamicProperties[colId] = { 
				type: schemaType, 
				description: "'" + colInfo + "' 의미의 데이터 추출." + extraRule 
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
		console.log("AI 분석 시작...");
		return model.generateContent(prompt);

	}).then(function(result) {
		var extractedData = JSON.parse(result.response.text());
		console.log("AI 추출 완료:", extractedData);
		
		// 3. DataSet에 밀어넣을 단일 행(Row) 데이터 객체 조립하기
		var rowData = {};
		for(var i = 0; i < columnNames.length; i++) {
			var colName = columnNames[i];
			var extractedValue = extractedData[colName];
			
			// null이나 undefined가 아닌 유효한 값만 조립
			if(extractedValue !== undefined && extractedValue !== null) {
				rowData[colName] = extractedValue;
			}
		}
		
		// 4. [핵심] 그리드 선택 행 Index에 따른 분기 처리
		var selectedRowIndex = grid.getSelectedRowIndex();
		
		if (selectedRowIndex === -1) {
			// 선택된 행이 없으면 DataSet 맨 끝에 새 행으로 추가
			dataSet.addRowData(rowData);
			console.log("그리드 맨 끝에 행 추가 완료");
		} else {
			// 선택된 행이 있으면 해당 인덱스에 삽입 
			// 두 번째 파라미터 false: 선택된 행 '아래'에 삽입 (true면 '위'에 삽입)
			grid.insertRowData(selectedRowIndex, false, rowData);
			console.log(selectedRowIndex + "번 인덱스 아래에 행 삽입 완료");
		}
		
		// 화면 갱신
		app.getContainer().redraw();
		alert("그리드에 데이터가 반영되었습니다!");

	}).catch(function(error) {
		console.error("AI 연동 오류:", error);
		alert("오류가 발생했습니다.");
	});
}
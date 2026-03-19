/*
 * 🚀 Grid + DataSet 최종판: 배열(Array) 다건 추출 & 공통 코드(Combo) 자동 치환
 */
function onBtnSmartGridFillClick(e){

	var rawText = app.lookup("txaUserInput").value; 
	if (!rawText) return alert("추가할 데이터를 텍스트로 입력해주세요.");

	var grid = app.lookup("grd1");
	var dataSet = grid.dataSet; 
	var headers = dataSet.getHeaders(); 
	
	// 기준 날짜 세팅
	var today = new Date();
	var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
	
	var columnNames = []; 
	
	// 💡 [핵심] 그리드 내 콤보박스 컬럼들이 사용하는 '코드 사전' 정의
	// (실무에서는 이 부분을 app.lookup("dsDeptCode") 등에서 동적으로 읽어오게 만들면 완벽합니다!)
	var codeDictionaries = {
		"deptCode": "영업팀: DEPT_001, 인사팀: DEPT_002, IT팀: DEPT_003",
		"bankCode": "국민은행: KB_04, 신한은행: SH_05, 우리은행: WR_06",
		"itemCategory": "모니터: CAT_M, 마우스: CAT_MO, 키보드: CAT_K" // 품목 카테고리 예시 추가
	};
	
	import("../google_ai.js").then(function(module) {
		var GoogleGenerativeAI = module.GoogleGenerativeAI;
		var SchemaType = module.SchemaType;
		var genAI = new GoogleGenerativeAI("");
		
		var dynamicProperties = {}; 
		
		// 1. 그리드 컬럼(헤더) 속성을 돌며 맞춤형 양식 생성
		for(var i = 0; i < headers.length; i++) {
			var header = headers[i];
			var colId = header.getName(); 
			var colInfo = header.getInfo() || colId; 
			
			var schemaType = (header.getDataType() === "number" || header.getDataType() === "decimal") ? SchemaType.NUMBER : SchemaType.STRING;
			
			var extraRule = "";
			
			// [규칙 1] 날짜 컬럼 감지
			if(colId.toLowerCase().indexOf("date") > -1 || colId.toLowerCase().indexOf("dt") > -1) {
				extraRule += " (기준일 [" + todayStr + "] 바탕으로 YYYY-MM-DD 변환 필)";
			}
			
			// 💡 [규칙 2] 콤보박스(공통 코드) 컬럼 감지 및 변환 규칙 주입
			if (codeDictionaries[colId]) {
				extraRule += " (🔥반드시 다음 사전을 참고하여 한글 대신 '코드값'으로 추출할 것. [사전: " + codeDictionaries[colId] + "])";
			}

			columnNames.push(colId);
			dynamicProperties[colId] = { 
				type: schemaType, 
				description: "'" + colInfo + "' 데이터 추출." + extraRule 
			};
		}
		
		// 2. 모델 설정 (최상위를 배열 ARRAY로 강제!)
		var model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash", 
			generationConfig: {
				temperature: 0, // 창의성 0 (정확도 100% 모드)
				responseMimeType: "application/json",
				responseSchema: {
					type: SchemaType.ARRAY, // 여러 줄을 추출하라는 핵심 명령
					items: {
						type: SchemaType.OBJECT, 
						properties: dynamicProperties,
						required: columnNames
					}
				}
			}
		});

		//var prompt = "다음 텍스트를 분석하여 요청된 항목이 여러 개라면 반드시 배열(목록) 형태로 분리해서 추출해 줘:\n\"" + rawText + "\"";
		// 🚀 [범용 메타 프롬프트] 도메인 무관, 지어내기(Hallucination) 완벽 차단 로직
		var prompt = "주어진 텍스트를 분석하여 요청된 데이터를 배열(Array) 형태로 추출해 주세요.\n\n" + 
		"🔥 [데이터 추출의 엄격한 3대 원칙] 🔥\n" +
		"1. 유추 및 생성 절대 금지 (No Hallucination): 텍스트에 명시적으로 언급되지 않은 정보(명칭, 날짜, 상태 등)는 문맥상 그럴듯해 보이더라도 절대 임의로 지어내지 마세요. 텍스트에서 찾을 수 없는 속성은 반드시 null로 처리하세요.\n" +
		"2. 수량(Quantity)과 데이터 행(Row)의 분리: 텍스트에 'N개', 'N명', 'N건' 등 특정 항목의 수량이 명시되어 있더라도, 데이터 배열에 똑같은 항목을 N번 반복해서 생성하지 마세요. 해당 항목에 대한 데이터는 단 1개의 객체(Row)로만 생성하고, 숫자 N은 '수량'을 의미하는 속성(컬럼)에 매핑하세요.\n" +
		"3. 다건(Array) 분리 기준: 텍스트 내에서 '서로 다른 대상'이나 '독립된 여러 종류의 항목'이 명확히 병렬로 나열되어 있을 때만 배열을 여러 개로 쪼개서 분리하세요.\n\n" +
		"분석할 텍스트:\n\"" + rawText + "\"";
		console.log("AI 다건 & 코드 치환 분석 시작...");
		return model.generateContent(prompt);

	}).then(function(result) {
		var extractedArray = JSON.parse(result.response.text());
		console.log("✅ AI 추출 완료 (총 " + extractedArray.length + "건):", extractedArray);
		
		var insertIdx = grid.getSelectedRowIndex();
		
		// 3. 추출된 배열을 순회하며 그리드에 행(Row) 단위로 꽂아 넣기
		for(var j = 0; j < extractedArray.length; j++) {
			var rowData = extractedArray[j];
			
			if (insertIdx === -1) {
				// 선택된 행이 없으면 맨 밑에 추가
				dataSet.addRowData(rowData);
			} else {
				// 선택된 행이 있으면 그 아래에 차례대로 삽입
				grid.insertRowData(insertIdx + 1, false, rowData);
				insertIdx++; // 방금 삽입한 행 밑으로 다음 데이터가 들어가도록 인덱스 증가
			}
		}
		
		app.getContainer().redraw();
		alert(extractedArray.length + "건의 데이터가 성공적으로 반영되었습니다!");

	}).catch(function(error) {
		console.error("AI 연동 오류:", error);
		alert("처리 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
	});
}
# main.py - FastAPI를 사용한 채팅 서버 구현

# 필요한 라이브러리 임포트
from fastapi import FastAPI,Request        # FastAPI 웹 프레임워크
from fastapi.responses import HTMLResponse, FileResponse  # 웹 응답 처리
from fastapi.templating import Jinja2Templates
from openai import OpenAI          # OpenAI API 사용
from dotenv import load_dotenv     # 환경변수 로드
import uvicorn                     # ASGI 서버
import os                          # 운영체제 관련 기능 사용
import socket                      # 네트워크 기능

# .env 파일에서 환경변수 로드 (API 키 등)
load_dotenv()

# OpenAI API 클라이언트 초기화 (환경변수에서 'OPENAI_API_KEY'에 저장된 API 키 가져옴)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# FastAPI 애플리케이션 객체 생성
app = FastAPI()
# 템플릿 설정
templates = Jinja2Templates(directory="templates")
# 대화 기록을 저장할 리스트
messages_list = []

# 루트 경로("/") 처리 - 메인 페이지 반환

@app.get("/")
async def root_page(request: Request):
    # socket.gethostbyname(socket.gethostname())를 사용하여 서버의 IP 주소를 가져옵니다.
    # - socket.gethostname(): 현재 컴퓨터의 호스트명을 반환
    # - socket.gethostbyname(): 호스트명을 IP 주소로 변환
    client_ip = socket.gethostbyname(socket.gethostname())

    # templates.TemplateResponse()를 사용하여 HTML 템플릿을 렌더링합니다.
    # - 첫 번째 인자 "index.html": 렌더링할 템플릿 파일명
    # - 두 번째 인자: 템플릿에 전달할 데이터 딕셔너리
    #   - request: FastAPI의 Request 객체 (템플릿 렌더링에 필요)
    #   - client_ip: 클라이언트 IP 주소 (템플릿에서 {{ client_ip }}로 사용)
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "client_ip": client_ip}
    )

# 정적 파일 처리 (HTML, CSS, JS 등)
@app.get("/{path:path}", response_class=HTMLResponse)
async def serve_page(path: str):
    
    # templates 폴더에서 요청된 파일 찾기
    file_path = os.path.join("templates", path)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return "404 - 페이지를 찾을 수 없습니다."

# 채팅 API 엔드포인트
@app.post("/chat")
async def chat_endpoint(message: dict):
    """채팅 메시지를 처리하고 AI 응답을 반환하는 엔드포인트"""
    try:
        # 시스템 프롬프트(학교 안내파일) 설정 

        if not messages_list : # messages_list가 비어있는지 확인
            # messages_list에 이전 대화 내용이 없는 경우는 처음 시작할 때
            # jshs-story.txt 파일에서 시스템 설정 읽기
            with open('data/jshs-story.txt', 'r', encoding='utf-8') as f: # encoding='utf-8' 한글 인코딩
                messages_list.append({
                    "role": "system",
                    "content": f.read()
                })

        # 사용자 메시지를 대화 기록에 추가
        messages_list.append({
            "role": "user", 
            "content": message["message"]
        })
        
        # OpenAI API를 통해 AI 응답 생성
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # 사용할 AI 모델
            messages=messages_list,
            temperature=0.7       # 값이 낮을수록(0에 가까울수록) 더 일관되고 예측 가능한 응답을 생성합니다. 0.7은 적당한 창의성과 일관성의 균형을 제공하는 중간 값입니다.
            # temperature=0.7 # 응답의 창의성 조절 (0: 보수적, 1: 창의적)
            # max_tokens=1000 # 응답 최대 길이 
            # top_p=0.9 # 응답 다양성 조절
            # frequency_penalty=0.0 # 단어 반복 억제 (-2.0 ~ 2.0)
            # n=1 # 생성할 응답 수
            # stream=False # 스트리밍 응답 여부

            # tokens는 AI가 생성하는 텍스트의 길이를 제한하는 단위입니다.
            # 1토큰은 대략 영어 4글자 또는 한글 1-2글자 정도입니다.
            # max_tokens=1000 # 응답 최대 길이를 1000토큰(약 영어 4000자, 한글 1000-2000자)으로 제한
            # 예시: "안녕하세요" = 2-3토큰, "Hello" = 1토큰
            # GPT-4 모델의 경우 입력+출력 합쳐서 최대 8000토큰까지 처리 가능

        )
        
        # AI 응답을 대화 기록에 추가
        assistant_message = response.choices[0].message.content
        messages_list.append({
            "role": "assistant", 
            "content": assistant_message
        })
        
        return {"response": assistant_message}
    
    except Exception as e:
        return {"error": str(e)}

# 메인 실행 부분
if __name__ == "__main__":
    # 현재 컴퓨터의 호스트명과 IP 주소 가져오기
    hostname = socket.gethostname()
    HOST = socket.gethostbyname(hostname)
    PORT = 8080
    
    # uvicorn 서버 실행 (자동 재시작 활성화)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)

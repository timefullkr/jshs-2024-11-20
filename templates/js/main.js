/* templates/js/main.js */


$(document).ready(function() {
    /* 
     * jQuery의 document.ready() 함수
     * - DOM이 완전히 로드된 후 실행되는 코드 블록
     * - 페이지의 모든 HTML 요소가 준비된 후에 jQuery 코드를 실행하여 안전성 보장
     * - 사용자 인터페이스 초기화 및 이벤트 핸들러 설정을 담당
     */
    let isProcessing = false;
    const messageInput = $('#message-input')
    const sendButton = $('#send-button');
   
    const chatMessages = $('#chat-messages');
    // 사용자와 어시스턴트 아이콘 정의
    const userIcon = '<i class="fa-solid fa-user me-2 text-primary"></i>';
    const assistantIcon = '<i class="fa-regular fa-user me-2 text-success"></i>';

    // CDN: cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js
    marked.setOptions({
        highlight: function(code, lang) {
            // 코드 하이라이팅을 처리하는 함수
            // 마크다운을 HTML로 변환하고 코드 하이라이팅을 적용하는 옵션 설정
            // 하이라이팅: 코드 블록에 구문 강조(syntax highlighting)를 적용하여 가독성을 높이는 기능
            // hljs는 highlight.js의 인스턴스입니다.
            // hljs.getLanguage() 메소드는 highlight.js의 언어 감지 기능을 제공합니다.
            // hljs.highlightAuto() 메소드는 코드 내용을 자동으로 언어로 인식하여 하이라이팅을 적용합니다.

            // 언어가 지정되어 있고 highlight.js가 해당 언어를 지원하는 경우
            if (lang && hljs.getLanguage(lang)) {
                // 지정된 언어로 코드 하이라이팅 적용
                return hljs.highlight(code, { language: lang }).value;
            }
            // 언어가 지정되지 않은 경우 자동으로 언어 감지하여 하이라이팅 적용
            return hljs.highlightAuto(code).value;
        },
        breaks: true, // 줄바꿈을 <br> 태그로 변환
        gfm: true // GitHub Flavored Markdown 활성화
    });

    function adjustTextareaHeight() {
        // 텍스트 입력창의 높이를 내용에 맞게 자동으로 조절하는 함수
        messageInput.height('auto').height(messageInput[0].scrollHeight);
    }

    // CDN: cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js
    function appendMessage(role, content) {
        // 채팅 메시지를 화면에 추가하는 함수
        // role: 메시지 작성자(user/assistant)
        // content: 메시지 내용
        // DOMPurify는 HTML 콘텐츠를 안전하게 정화(sanitize)하는 라이브러리입니다.
        // XSS(Cross-Site Scripting) 공격을 방지하기 위해 사용됩니다.
        // XSS: 악의적인 스크립트를 웹페이지에 삽입하여 사용자의 정보를 탈취하는 공격
        
        const htmlContent = role === 'assistant' ? 
            DOMPurify.sanitize(marked.parse(content)) : 
            DOMPurify.sanitize(content);

        // role에 따라 적절한 아이콘 선택
        const icon = role === 'assistant' ? assistantIcon : userIcon;

        const messageDiv = $('<div>')
            .addClass(`message ${role}-message`)
            .html(` 
                <div class="d-flex">
                    <div class="me-2">${icon}</div>
                    <div>
                        ${htmlContent}
                    </div>
                </div>
            `);

        chatMessages.append(messageDiv);
        
        messageDiv.find('pre code').each(function(i, block) {
            hljs.highlightBlock(block);
        });

        chatMessages.scrollTop(chatMessages[0].scrollHeight);
    }

    function sendMessage(message, showUserMessage = true, isInitialMessage = false) {
        // 메시지를 서버로 전송하고 응답을 처리하는 함수
        // message: 전송할 메시지 내용
        // showUserMessage: 사용자 메시지를 화면에 표시할지 여부
        // isInitialMessage: 초기 접속 메시지인지 여부
        
        if (isProcessing) return;
        
        const messageText = message || messageInput.val().trim();
        if (!messageText) return;

        isProcessing = true;
        sendButton.prop('disabled', true);
        
        if (showUserMessage) {
            appendMessage('user', messageText);
        }
        
        if (!message) {
            messageInput.val('').trigger('input');
        }

        const loading = $('<div>')
            .addClass('my-2')
            .html(`${assistantIcon}<div class="spinner-border spinner-border-sm text-primary"></div> ${
                isInitialMessage ? 'ChatGPT에 접속 중...' : '응답 생성 중...'
            }`);

        chatMessages.append(loading);
        
        $.ajax({
            url: '/chat',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: messageText }),
            success: function(data) {
                loading.remove();
                if (data.error) {
                    appendMessage('assistant', `오류가 발생했습니다: ${data.error}`);
                    return;
                }
                appendMessage('assistant', data.response);
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                loading.remove();
                appendMessage('assistant', `오류가 발생했습니다: ${error}`);
            },
            complete: function() {
                isProcessing = false;
                sendButton.prop('disabled', false);
                messageInput.focus();
            }
        });
    }

    // 이벤트 핸들러 등록 - 텍스트 입력창 높이 조절 및 Enter 키 입력 처리
    messageInput
        .on('input', adjustTextareaHeight)
        .on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

    // 전송 버튼 클릭 이벤트 처리
    sendButton.on('click', function() {
        sendMessage();
    });
    
    // 페이지 로드 시 접속 확인을 위한 초기 인사말 목록 생성
    const greetings = [
        "안녕하세요! 반가워요!",
        "안녕하세요, 오늘도 좋은 하루 보내세요!",
        "반갑습니다! 잘 지내고 있나요?",
        "안녕하세요! 대화를 시작해볼까요?",
        "반가워요! ",
        "안녕!",
        "안녕, 기분이 어떤가요?"
    ];
    // 랜덤 인덱스 생성
    // greetings.length: 인사말 목록의 길이
    const randomIndex = Math.floor(Math.random() * greetings.length);
    // greetings 목록에서 랜덤 인덱스로 랜덤 인사말 선택
    const randomGreeting = greetings[randomIndex];
    // 선택한 랜덤 인사말로 sendMessage 함수를 통해 초기 메시지 전송
    // sendMessage(randomGreeting, false, true);
});
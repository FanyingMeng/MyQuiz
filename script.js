// ==========================
// 用户登录 / 退出
// ==========================
function login() {
    let username = document.getElementById("username").value.trim();
    if (!username) return alert("请输入用户名");
    localStorage.setItem("username", username);
    window.location.href = "subject.html";
}

function logout() {
    localStorage.removeItem("username");
    window.location.href = "index.html"; 
}

// 当前用户信息
function getCurrentUser() {
    return localStorage.getItem("username") || "guest";
}
function userKey(base) {
    return `${base}_${getCurrentUser()}`;
}


// ==========================
// 科目页面逻辑
// ==========================
async function loadSubjects() {
    const res = await fetch(`./Questions.json?t=${Date.now()}`);
    const data = await res.json();
    const container = document.getElementById("subjects");

    data.subjects.forEach(sub => {
        container.innerHTML += `
        <div style="margin-bottom:20px;">
            <h3>${sub.SubjectName}</h3>
            <div class="subject-buttons">
                <button onclick="startSequence(${sub.SubjectID})">顺序做题</button>
                <button onclick="startQuiz(${sub.SubjectID}, 'random')">随机做题</button>
                <button onclick="startQuiz(${sub.SubjectID}, 'mistake')">错题重做</button>
                <button onclick="clearMistakes(${sub.SubjectID})">清除错题</button>
            </div>
        </div>`;
    });
}

// 跳转到顺序做题第一页
function startSequence(subjectID){
    window.location.href = `sequence_start.html?subjectID=${subjectID}`;
}

// 跳转到正式做题页
function startQuiz(subjectID, mode, startIndex = 0) {
    window.location.href = `quiz.html?subjectID=${subjectID}&mode=${mode}&startIndex=${startIndex}`;
}

// 清除错题
function clearMistakes(subjectID) {
    if(confirm("确定要清除该科目的错题吗？")) {
        let userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
        if(userMistakes[subjectID]) {
            delete userMistakes[subjectID];
            localStorage.setItem(userKey("mistakes"), JSON.stringify(userMistakes));
            alert("该科目错题已清除");
        } else {
            alert("该科目没有错题");
        }
    }
}


// ==========================
// 顺序做题起始页逻辑（第一页）
// ==========================
function loadSequenceStart() {
    const params = new URLSearchParams(window.location.search);
    const subjectID = parseInt(params.get("subjectID"));
    const progressData = JSON.parse(localStorage.getItem(userKey("progress")) || "{}");

    document.getElementById("jumpBtn").onclick = () => {
        const input = document.getElementById("jumpInput").value;
        let target = parseInt(input);
        if(isNaN(target) || target < 1){
            return alert("请输入大于等于1的数字");
        }
        startQuiz(subjectID, 'sequence', target - 1);
    };

    document.getElementById("continueBtn").onclick = () => {
        let startIndex = progressData[subjectID] || 0;
        startQuiz(subjectID, 'sequence', startIndex);
    };

    document.getElementById("backBtn").onclick = () => {
        window.location.href = "subject.html";
    };
}


// ==========================
// 做题逻辑（第二页起）
// ==========================
let questions = [];
let currentIndex = 0;
let userMistakes = {};
let progressData = {};

// 加载题目
async function loadQuiz() {
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    progressData = JSON.parse(localStorage.getItem(userKey("progress")) || "{}");

    const params = new URLSearchParams(window.location.search);
    const subjectID = parseInt(params.get("subjectID"));
    const mode = params.get("mode");
    const startIndex = parseInt(params.get("startIndex"));

    const res = await fetch(`./Questions.json?t=${Date.now()}`);
    const data = await res.json();
    let subject = data.subjects.find(s => s.SubjectID === subjectID);
    questions = subject.questions.map(q => ({ ...q, SubjectID: subjectID }));

    if(mode === 'random') questions.sort(() => Math.random() - 0.5);
    if(mode === 'mistake') questions = userMistakes[subjectID] || [];

    currentIndex = !isNaN(startIndex) ? startIndex : 0;
    showQuestion();

    document.getElementById("submitBtn").onclick = submitAnswer;
    document.getElementById("prevBtn").onclick = prevQuestion;
    document.getElementById("nextBtn").onclick = nextQuestion;
    document.getElementById("homeBtn").onclick = goHome;
}

// 显示题目
function showQuestion() {
    if(questions.length === 0){
        document.getElementById("quizContainer").innerHTML = "<p>没有题目可做</p>";
        return;
    }

    let q = questions[currentIndex];
    document.getElementById("questionText").innerText = q.QuestionText;

    const img = document.getElementById("questionImage");
    if(q.ImageURL){
        img.src = q.ImageURL;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }

    let optionsHtml = "";
    q.Options.forEach(opt => {
        optionsHtml += `<label>
            <input type="checkbox" value="${opt.label}"> ${opt.label}. ${opt.text}
        </label>`;
    });
    document.getElementById("options").innerHTML = optionsHtml;
    document.getElementById("explanation").innerText = "";
    document.getElementById("progress").innerText = `第 ${currentIndex+1} / ${questions.length} 题`;

    // 保存进度
    const params = new URLSearchParams(window.location.search);
    const subjectID = parseInt(params.get("subjectID"));
    const mode = params.get("mode");
    if(mode === 'sequence') {
        progressData[subjectID] = currentIndex;
        localStorage.setItem(userKey("progress"), JSON.stringify(progressData));
    }
}

// 提交答案
function submitAnswer() {
    let q = questions[currentIndex];
    let selected = Array.from(document.querySelectorAll("#options input:checked")).map(i=>i.value);
    let correct = [...q.CorrectAnswer];

    const labels = document.querySelectorAll("#options label");
    labels.forEach(label => {
        const val = label.querySelector("input").value;
        label.classList.remove("correct-option", "wrong-option");
        if(correct.includes(val)) label.classList.add("correct-option");
        if(selected.includes(val) && !correct.includes(val)) label.classList.add("wrong-option");
    });

    document.getElementById("explanation").innerText = q.Explanation;
    
    if(JSON.stringify(selected.sort()) === JSON.stringify(correct.sort())) {
        removeMistake(q);
    } else {
        addMistake(q);
    }
}

// 添加错题
function addMistake(q) {
    let subjectID = q.SubjectID;
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    if(!userMistakes[subjectID]) userMistakes[subjectID] = [];
    if(!userMistakes[subjectID].some(m => m.QuestionID === q.QuestionID)) userMistakes[subjectID].push(q);
    localStorage.setItem(userKey("mistakes"), JSON.stringify(userMistakes));
}

// 删除错题
function removeMistake(q) {
    let subjectID = q.SubjectID;
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    if(userMistakes[subjectID]) {
        userMistakes[subjectID] = userMistakes[subjectID].filter(m => m.QuestionID !== q.QuestionID);
        localStorage.setItem(userKey("mistakes"), JSON.stringify(userMistakes));
    }
}

// 翻页控制
function prevQuestion() {
    if(currentIndex > 0) currentIndex--;
    showQuestion();
}
function nextQuestion() {
    if(currentIndex < questions.length-1) currentIndex++;
    showQuestion();
}

// 返回主界面
function goHome() {
    window.location.href = "subject.html";
}


// ==========================
// 页面加载入口控制
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("subjects")) loadSubjects();
    if(document.getElementById("jumpControls")) loadSequenceStart();
    if(document.getElementById("quizContainer") && document.getElementById("submitBtn")) loadQuiz();
});
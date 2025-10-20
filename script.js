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
    // 仅移除登录状态，不删除用户数据
    localStorage.removeItem("username");
    window.location.href = "index.html"; 
}

// 当前用户辅助方法
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
    const res = await fetch("./Questions.json");
    const data = await res.json();
    let container = document.getElementById("subjects");

    data.subjects.forEach(sub => {
        container.innerHTML += `
        <div style="margin-bottom:20px;">
            <h3>${sub.SubjectName}</h3>
            <div class="subject-buttons">
                <button onclick="startQuiz(${sub.SubjectID}, 'sequence')">顺序做题</button>
                <button onclick="startQuiz(${sub.SubjectID}, 'random')">随机做题</button>
                <button onclick="startQuiz(${sub.SubjectID}, 'mistake')">错题重做</button>
                <button onclick="clearMistakes(${sub.SubjectID})">清除错题</button>
            </div>
        </div>`;
    });
}

function startQuiz(subjectID, mode) {
    window.location.href = `quiz.html?subjectID=${subjectID}&mode=${mode}`;
}

// 清除科目错题（按用户）
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

// DOM 加载完成后调用科目逻辑
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("subjects")) loadSubjects();
});


// ==========================
// 做题逻辑
// ==========================
let questions = [];
let currentIndex = 0;
let userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
let progressData = JSON.parse(localStorage.getItem(userKey("progress")) || "{}");

// 加载做题
async function loadQuiz() {
    // 每次进入 quiz 页面都重新读取最新数据
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    progressData = JSON.parse(localStorage.getItem(userKey("progress")) || "{}");

    const urlParams = new URLSearchParams(window.location.search);
    const subjectID = parseInt(urlParams.get("subjectID"));
    const mode = urlParams.get("mode");

    const res = await fetch("./Questions.json");
    const data = await res.json();

    // 找到科目
    let subject = data.subjects.find(s => s.SubjectID === subjectID);
    questions = subject.questions.map(q => ({ ...q, SubjectID: subjectID }));

    if(mode === 'random') questions.sort(() => Math.random() - 0.5);
    if(mode === 'mistake') questions = userMistakes[subjectID] || [];

    // 顺序模式恢复进度
    if(mode === 'sequence' && progressData[subjectID] !== undefined) {
        currentIndex = Math.min(progressData[subjectID], Math.max(0, questions.length - 1));
    } else {
        currentIndex = 0;
    }

    showQuestion();
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
    document.getElementById("options").className = "";
    document.getElementById("explanation").innerText = "";
    document.getElementById("progress").innerText = `第 ${currentIndex+1} / ${questions.length} 题`;

    // 保存进度（顺序模式）
    const urlParams = new URLSearchParams(window.location.search);
    const subjectID = parseInt(urlParams.get("subjectID"));
    const mode = urlParams.get("mode");
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

// 添加错题（按用户）
function addMistake(q) {
    let subjectID = q.SubjectID;
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    if(!userMistakes[subjectID]) userMistakes[subjectID] = [];
    if(!userMistakes[subjectID].some(m => m.QuestionID === q.QuestionID)) userMistakes[subjectID].push(q);
    localStorage.setItem(userKey("mistakes"), JSON.stringify(userMistakes));
}

// 删除错题（按用户）
function removeMistake(q) {
    let subjectID = q.SubjectID;
    userMistakes = JSON.parse(localStorage.getItem(userKey("mistakes")) || "{}");
    if(userMistakes[subjectID]) {
        userMistakes[subjectID] = userMistakes[subjectID].filter(m => m.QuestionID !== q.QuestionID);
        localStorage.setItem(userKey("mistakes"), JSON.stringify(userMistakes));
    }
}

// 上一题 / 下一题
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

// 页面加载
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("quizContainer")) loadQuiz();
});
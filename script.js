// ==========================
// 用户登录
// ==========================
function login() {
    let username = document.getElementById("username").value.trim();
    if (!username) return alert("请输入用户名");
    localStorage.setItem("username", username);
    window.location.href = "subject.html";
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

// 清除科目错题
function clearMistakes(subjectID) {
    if(confirm("确定要清除该科目的错题吗？")) {
        let userMistakes = JSON.parse(localStorage.getItem("mistakes") || "{}");
        if(userMistakes[subjectID]) {
            delete userMistakes[subjectID];
            localStorage.setItem("mistakes", JSON.stringify(userMistakes));
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
let userMistakes = JSON.parse(localStorage.getItem("mistakes") || "{}");

// 加载做题
async function loadQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectID = parseInt(urlParams.get("subjectID"));
    const mode = urlParams.get("mode");

    const res = await fetch("./Questions.json");
    const data = await res.json();

    // 找到科目
    let subject = data.subjects.find(s => s.SubjectID === subjectID);

    // 给题目加上 SubjectID
    questions = subject.questions.map(q => ({ ...q, SubjectID: subjectID }));

    if(mode === 'random') questions.sort(() => Math.random() - 0.5);
    if(mode === 'mistake') questions = userMistakes[subjectID] || [];

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
    // 无论答对还是答错，都显示解析
    document.getElementById("explanation").innerText = q.Explanation;
    
    if(JSON.stringify(selected.sort()) === JSON.stringify(correct.sort())) {
        removeMistake(q);
    } else {
        document.getElementById("explanation").innerText = q.Explanation;
        addMistake(q);
    }
}

// 添加错题
function addMistake(q) {
    let subjectID = q.SubjectID;
    if(!userMistakes[subjectID]) userMistakes[subjectID] = [];
    if(!userMistakes[subjectID].some(m => m.QuestionID === q.QuestionID)) userMistakes[subjectID].push(q);
    localStorage.setItem("mistakes", JSON.stringify(userMistakes));
}

// 删除错题
function removeMistake(q) {
    let subjectID = q.SubjectID;
    if(userMistakes[subjectID]) {
        userMistakes[subjectID] = userMistakes[subjectID].filter(m => m.QuestionID !== q.QuestionID);
        localStorage.setItem("mistakes", JSON.stringify(userMistakes));
    }
}

// 上一题
function prevQuestion() {
    if(currentIndex > 0) currentIndex--;
    showQuestion();
}

// 下一题
function nextQuestion() {
    if(currentIndex < questions.length-1) currentIndex++;
    showQuestion();
}

// 返回主界面
function goHome() {
    window.location.href = "subject.html";
}

// DOM 加载完成后调用做题逻辑
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("quizContainer")) loadQuiz();
});
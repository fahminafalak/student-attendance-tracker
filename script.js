const $ = id => document.getElementById(id);

let students = JSON.parse(localStorage.getItem("students") || "null");
let attendance = JSON.parse(localStorage.getItem("attendance") || "[]");
let editingId = null;

if (!Array.isArray(students)) {
    students = [
        { id: "ST101", name: "Aarav Kumar", dept: "Computer Science" },
        { id: "ST102", name: "Priya Sharma", dept: "Computer Science" },
        { id: "ST103", name: "Rahul Raj", dept: "Information Technology" },
        { id: "ST104", name: "Ananya Das", dept: "Commerce" }
    ];
}

if (!Array.isArray(attendance)) attendance = [];

const statuses = ["Present", "Absent", "Late", "On Leave"];

function localDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

$("date").value = localDate();

function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    localStorage.setItem("attendance", JSON.stringify(attendance));
}

function safe(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[char]);
}

function todayRecord(id) {
    return attendance.find(a =>
        a.id === id && a.date === $("date").value
    );
}

function studentStats(id) {
    const records = attendance.filter(a =>
        a.id === id && a.status !== "On Leave"
    );

    const attended = records.filter(a =>
        a.status === "Present" || a.status === "Late"
    ).length;

    return records.length
        ? Math.round(attended / records.length * 100)
        : 0;
}

function showMessage(text) {
    $("message").textContent = text;
}

function render() {
    saveData();

    const date = $("date").value;
    const today = attendance.filter(a => a.date === date);
    const present = today.filter(a =>
        a.status === "Present" || a.status === "Late"
    ).length;
    const absent = today.filter(a => a.status === "Absent").length;
    const eligible = today.filter(a => a.status !== "On Leave");
    const rate = eligible.length
        ? Math.round(present / eligible.length * 100)
        : 0;

    $("total").textContent = students.length;
    $("present").textContent = present;
    $("absent").textContent = absent;
    $("rate").textContent = rate + "%";

    const search = $("search").value.toLowerCase().trim();
    const filter = $("statusFilter").value;
    const threshold = Math.max(0, Math.min(100,
        Number($("threshold").value) || 0
    ));

    const list = students.filter(s => {
        const record = todayRecord(s.id);
        const matchesSearch =
            `${s.id} ${s.name} ${s.dept}`.toLowerCase().includes(search);
        const matchesStatus = !filter ||
            (record && record.status === filter);

        return matchesSearch && matchesStatus;
    });

    $("studentList").innerHTML = list.length
        ? list.map(s => {
            const record = todayRecord(s.id);
            const status = record ? record.status : "";
            const percent = studentStats(s.id);
            const low = percent < threshold;

            return `
            <tr>
                <td>
                    <div class="student-name">${safe(s.name)}</div>
                    <div class="student-id">${safe(s.id)}</div>
                </td>
                <td>${safe(s.dept)}</td>
                <td>
                    <select class="status-select"
                        onchange="markAttendance('${safe(s.id)}', this.value)">
                        <option value="">Not Marked</option>
                        ${statuses.map(st =>
                            `<option value="${st}" ${status === st ? "selected" : ""}>${st}</option>`
                        ).join("")}
                    </select>
                </td>
                <td class="${low ? "low" : "good"}">
                    ${percent}%
                    ${low ? " ⚠" : ""}
                </td>
                <td>
                    <div class="actions">
                        <button class="small-btn secondary"
                            onclick="openForm('${safe(s.id)}')">Edit</button>
                        <button class="small-btn secondary"
                            onclick="showHistory('${safe(s.id)}')">History</button>
                        <button class="small-btn delete-btn"
                            onclick="deleteStudent('${safe(s.id)}')">Delete</button>
                    </div>
                </td>
            </tr>`;
        }).join("")
        : `<tr><td colspan="5" class="empty">No students found.</td></tr>`;
}

function markAttendance(id, status) {
    if (!statuses.includes(status)) return;

    const record = todayRecord(id);

    if (record) {
        record.status = status;
    } else {
        attendance.push({ id, date: $("date").value, status });
    }

    showMessage("Attendance saved successfully.");
    render();
}

function markAllPresent() {
    if (!students.length) {
        showMessage("Add students first.");
        return;
    }

    students.forEach(s => {
        const record = todayRecord(s.id);

        if (record) {
            record.status = "Present";
        } else {
            attendance.push({
                id: s.id,
                date: $("date").value,
                status: "Present"
            });
        }
    });

    showMessage("All students marked present.");
    render();
}

function openForm(id = null) {
    editingId = id;
    $("studentForm").reset();
    $("formTitle").textContent = id ? "Edit Student" : "Add Student";
    $("studentId").disabled = Boolean(id);

    if (id) {
        const s = students.find(s => s.id === id);
        if (!s) return;

        $("studentId").value = s.id;
        $("studentName").value = s.name;
        $("department").value = s.dept;
    }

    $("studentModal").style.display = "flex";
}

function closeForm() {
    $("studentModal").style.display = "none";
}

$("studentForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("studentId").value.trim();
    const name = $("studentName").value.trim();
    const dept = $("department").value.trim();

    if (!id || !name || !dept) return;

    if (!editingId && students.some(s =>
        s.id.toLowerCase() === id.toLowerCase()
    )) {
        alert("This Student ID already exists.");
        return;
    }

    if (editingId) {
        const s = students.find(s => s.id === editingId);
        if (s) {
            s.name = name;
            s.dept = dept;
        }
    } else {
        students.push({ id, name, dept });
    }

    closeForm();
    showMessage(editingId
        ? "Student details updated."
        : "Student added successfully."
    );

    render();
});

function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student?")) return;

    students = students.filter(s => s.id !== id);
    attendance = attendance.filter(a => a.id !== id);

    showMessage("Student and attendance records deleted.");
    render();
}

function showHistory(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;

    $("historyTitle").textContent = s.name + " — Attendance History";

    const records = attendance
        .filter(a => a.id === id)
        .sort((a, b) => b.date.localeCompare(a.date));

    $("historyContent").innerHTML = records.length
        ? records.map(a => `
            <div class="history-item">
                <span>${safe(a.date)}</span>
                <strong>${safe(a.status)}</strong>
            </div>
        `).join("")
        : `<p class="empty">No attendance history available.</p>`;

    $("historyModal").style.display = "flex";
}

function closeHistory() {
    $("historyModal").style.display = "none";
}

$("date").addEventListener("change", render);
$("search").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);
$("threshold").addEventListener("input", render);

render();

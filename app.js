const STORAGE_KEY = "leavewise-standalone-demo-v1";

const starterData = () => ({
  students: [
    { id: "stu-1001", name: "jeeva k", roll: "24itr037", department: "information technology", casual: 12, casualTotal: 15, medical: 8, medicalTotal: 10 },
    { id: "stu-1002", name: "kathir s.s", roll: "24itr044", department: "information technology", casual: 10, casualTotal: 15, medical: 6, medicalTotal: 10 },
    { id: "stu-1003", name: "mani", roll: "24itr055", department: "information technology", casual: 9, casualTotal: 15, medical: 9, medicalTotal: 10 }
  ],
  requests: [
    { id: "req-1001", studentId: "stu-1001", type: "casual", days: 2, startDate: dateOffset(4), reason: "Attending a family event out of town.", status: "pending", note: "", submittedAt: dateOffset(-1) },
    { id: "req-1002", studentId: "stu-1002", type: "medical", days: 1, startDate: dateOffset(-3), reason: "Routine medical appointment.", status: "approved", note: "Approved. Take care.", submittedAt: dateOffset(-5), reviewedAt: dateOffset(-4) },
    { id: "req-1003", studentId: "stu-1003", type: "casual", days: 1, startDate: dateOffset(7), reason: "Personal commitment.", status: "declined", note: "Please choose a date after the lab review.", submittedAt: dateOffset(-8), reviewedAt: dateOffset(-7) },
    { id: "req-1004", studentId: "stu-1002", type: "casual", days: 2, startDate: dateOffset(10), reason: "Travel for a student conference.", status: "pending", note: "", submittedAt: dateOffset(0) }
  ]
});

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (days === 0) date.setHours(12, 0, 0, 0);
  else date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.students) && Array.isArray(saved.requests)) return saved;
  } catch (error) {
    console.warn("Could not read saved demo data; starting with examples.", error);
  }
  return starterData();
}

let data = readData();
let selectedStudentId = data.students[0]?.id || "";
let toastTimeout;

const $ = (id) => document.getElementById(id);

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    showToast("Could not save changes in this browser.", true);
  }
}

function showToast(message, isError = false) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function currentStudent() {
  return data.students.find((student) => student.id === selectedStudentId) || data.students[0];
}

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function makeEmpty(message, detail = "") {
  const box = document.createElement("div");
  box.className = "empty-state";
  const title = document.createElement("strong");
  title.textContent = message;
  box.append(title);
  if (detail) {
    const text = document.createElement("span");
    text.textContent = detail;
    box.append(text);
  }
  return box;
}

function setView(view) {
  const isStudent = view === "student";
  const studentView = $("student-view");
  const adminView = $("admin-view");
  if (studentView) studentView.hidden = !isStudent;
  if (adminView) adminView.hidden = isStudent;
  
  $("student-tab")?.classList.toggle("active", isStudent);
  $("admin-tab")?.classList.toggle("active", !isStudent);
  $("student-tab")?.setAttribute("aria-selected", String(isStudent));
  $("admin-tab")?.setAttribute("aria-selected", String(!isStudent));
  if (!isStudent) renderAdmin();
}

function renderStudentPicker() {
  const picker = $("student-picker");
  if (!picker) return;
  const selected = currentStudent();
  picker.replaceChildren();
  for (const student of data.students) {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = `${student.name} · ${student.roll}`;
    option.selected = student.id === selected?.id;
    picker.append(option);
  }
  if (!selected) {
    picker.disabled = true;
    return;
  }
  picker.disabled = false;
  if ($("student-name")) $("student-name").textContent = selected.name;
  if ($("student-meta")) $("student-meta").textContent = `${selected.roll} · ${selected.department}`;
  if ($("student-avatar")) $("student-avatar").textContent = selected.name.trim().charAt(0).toUpperCase() || "S";
}

function renderBalances(student) {
  const casual = Math.max(0, Number(student?.casual) || 0);
  const medical = Math.max(0, Number(student?.medical) || 0);
  const casualTotal = Math.max(casual, Number(student?.casualTotal) || 0);
  const medicalTotal = Math.max(medical, Number(student?.medicalTotal) || 0);
  
  if ($("casual-balance")) $("casual-balance").textContent = casual;
  if ($("medical-balance")) $("medical-balance").textContent = medical;
  if ($("casual-bar")) $("casual-bar").style.width = `${casualTotal ? Math.min(100, (casual / casualTotal) * 100) : 0}%`;
  if ($("medical-bar")) $("medical-bar").style.width = `${medicalTotal ? Math.min(100, (medical / medicalTotal) * 100) : 0}%`;
}

function renderStudentRequests(student) {
  const requestList = $("student-requests");
  if (!requestList) return;

  const requests = data.requests
    .filter((request) => request.studentId === student?.id)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const pending = requests.filter((request) => request.status === "pending").length;
  
  if ($("my-request-count")) $("my-request-count").textContent = requests.length;
  if ($("my-pending-count")) $("my-pending-count").textContent = `${pending} pending review`;
  if ($("history-count")) $("history-count").textContent = requests.length;
  requestList.replaceChildren();

  if (!requests.length) {
    requestList.append(makeEmpty("No requests yet", "Your submitted leave applications will appear here."));
    return;
  }

  for (const request of requests) {
    const card = document.createElement("article");
    card.className = "student-request";
    const top = document.createElement("div");
    top.className = "student-request-top";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "request-title";
    title.textContent = `${titleCase(request.type)} leave · ${request.days} ${request.days === 1 ? "day" : "days"}`;
    const subtitle = document.createElement("p");
    subtitle.className = "request-subtitle";
    subtitle.textContent = `Starts ${formatDate(request.startDate)}`;
    titleWrap.append(title, subtitle);
    top.append(titleWrap, makeStatusBadge(request.status));
    const reason = document.createElement("p");
    reason.className = "request-reason";
    reason.textContent = request.reason;
    const submitted = document.createElement("p");
    submitted.className = "request-date";
    submitted.textContent = `Submitted ${formatDate(request.submittedAt, { month: "short", day: "numeric" })}`;
    card.append(top, reason, submitted);
    if (request.note) card.append(makeReviewNote(request.note));
    requestList.append(card);
  }
}

function makeStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = `status-badge status-${status}`;
  badge.textContent = status;
  return badge;
}

function makeReviewNote(noteText) {
  const note = document.createElement("p");
  note.className = "review-note";
  note.textContent = `Admin note: ${noteText}`;
  return note;
}

function titleCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderStudent() {
  renderStudentPicker();
  const student = currentStudent();
  const requestList = $("student-requests");
  if (!student) {
    renderBalances({});
    if (requestList) requestList.replaceChildren(makeEmpty("No student account", "Reset the demo data to restore sample accounts."));
    return;
  }
  renderBalances(student);
  renderStudentRequests(student);
}

function renderAdmin() {
  const adminRequestList = $("admin-requests");
  if (!adminRequestList) return;

  const counts = {
    pending: data.requests.filter((request) => request.status === "pending").length,
    approved: data.requests.filter((request) => request.status === "approved").length,
    declined: data.requests.filter((request) => request.status === "declined").length
  };
  if ($("admin-pending")) $("admin-pending").textContent = counts.pending;
  if ($("admin-approved")) $("admin-approved").textContent = counts.approved;
  if ($("admin-declined")) $("admin-declined").textContent = counts.declined;
  if ($("admin-total")) $("admin-total").textContent = data.requests.length;

  const filter = $("status-filter")?.value || "all";
  const requests = [...data.requests]
    .filter((request) => filter === "all" || request.status === filter)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  adminRequestList.replaceChildren();
  if (!requests.length) {
    adminRequestList.append(makeEmpty("No requests found", filter === "all" ? "Student applications will show here." : `There are no ${filter} requests.`));
    return;
  }

  for (const request of requests) {
    const student = data.students.find((item) => item.id === request.studentId);
    if (!student) continue;
    adminRequestList.append(makeAdminRequest(request, student));
  }
}

function makeAdminRequest(request, student) {
  const card = document.createElement("article");
  card.className = "admin-request";
  card.dataset.requestId = request.id;
  const top = document.createElement("div");
  top.className = "admin-request-top";
  const studentBlock = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "request-title";
  title.textContent = student.name;
  const subtitle = document.createElement("p");
  subtitle.className = "request-subtitle";
  subtitle.textContent = `${student.roll} · ${student.department}`;
  studentBlock.append(title, subtitle);
  top.append(studentBlock, makeStatusBadge(request.status));

  const meta = document.createElement("div");
  meta.className = "admin-request-meta";
  meta.append(metaItem("Leave", `${titleCase(request.type)} · ${request.days} ${request.days === 1 ? "day" : "days"}`));
  meta.append(metaItem("Start date", formatDate(request.startDate)));
  meta.append(metaItem("Submitted", formatDate(request.submittedAt)));
  const reason = document.createElement("p");
  reason.className = "request-reason";
  reason.textContent = request.reason;
  card.append(top, meta, reason);

  if (request.status === "pending") {
    const noteLabel = document.createElement("label");
    noteLabel.className = "note-label";
    noteLabel.textContent = "Review note (optional)";
    const note = document.createElement("input");
    note.className = "note-input";
    note.type = "text";
    note.maxLength = 250;
    note.placeholder = "Add a note for the student";
    note.value = request.note || "";
    noteLabel.append(note);

    const actions = document.createElement("div");
    actions.className = "admin-actions";
    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "decline-button";
    decline.dataset.action = "decline";
    decline.textContent = "Decline";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "approve-button";
    approve.dataset.action = "approve";
    approve.textContent = "Approve request";
    actions.append(decline, approve);
    card.append(noteLabel, actions);
  } else {
    const review = document.createElement("p");
    review.className = "request-date";
    review.textContent = `${titleCase(request.status)} ${request.reviewedAt ? `on ${formatDate(request.reviewedAt)}` : ""}`.trim();
    card.append(review);
    if (request.note) card.append(makeReviewNote(request.note));
  }
  return card;
}

function metaItem(label, value) {
  const span = document.createElement("span");
  span.textContent = `${label}: ${value}`;
  return span;
}

function getTodayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function submitLeaveRequest(event) {
  event.preventDefault();
  const student = currentStudent();
  const type = $("leave-type")?.value;
  const days = Number($("leave-days")?.value);
  const startDate = $("leave-start")?.value;
  const reason = $("leave-reason")?.value.trim();
  const error = $("form-error");
  if (error) error.textContent = "";

  const setError = (msg) => {
    if (error) error.textContent = msg;
    else showToast(msg, true);
  };

  if (!student) {
    setError("Choose a student account first.");
    return;
  }
  if (!Number.isSafeInteger(days) || days < 1) {
    setError("Enter a whole number of leave days greater than zero.");
    return;
  }
  if (!startDate || startDate < getTodayString()) {
    setError("Choose today or a future start date.");
    return;
  }
  if (!reason) {
    setError("Add a short reason for your request.");
    return;
  }
  const balance = Number(type === "casual" ? student.casual : student.medical) || 0;
  if (days > balance) {
    setError(`This account has ${balance} ${type} leave days available.`);
    return;
  }

  data.requests.unshift({
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId: student.id,
    type,
    days,
    startDate: new Date(`${startDate}T12:00:00`).toISOString(),
    reason,
    status: "pending",
    note: "",
    submittedAt: new Date().toISOString()
  });
  saveData();
  $("leave-form")?.reset();
  setMinimumDate();
  if ($("leave-days")) $("leave-days").value = "1";
  renderAll();
  showToast("Leave request submitted for review.");
}

function reviewRequest(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".admin-request");
  const request = data.requests.find((item) => item.id === card?.dataset.requestId);
  if (!request || request.status !== "pending") return;
  const student = data.students.find((item) => item.id === request.studentId);
  if (!student) return;

  const note = card.querySelector(".note-input")?.value.trim() || "";
  if (button.dataset.action === "approve") {
    const balanceKey = request.type === "casual" ? "casual" : "medical";
    const currentBalance = Number(student[balanceKey]) || 0;
    if (currentBalance < request.days) {
      showToast(`Cannot approve: ${student.name} has only ${currentBalance} ${request.type} leave days left.`, true);
      return;
    }
    student[balanceKey] = currentBalance - request.days;
    request.status = "approved";
    showToast("Request approved and leave balance updated.");
  } else {
    request.status = "declined";
    showToast("Request declined.");
  }
  request.note = note;
  request.reviewedAt = new Date().toISOString();
  saveData();
  renderAll();
}

function setMinimumDate() {
  const startInput = $("leave-start");
  if (startInput) startInput.min = getTodayString();
}

function renderAll() {
  renderStudent();
  renderAdmin();
}

function init() {
  $("student-tab")?.addEventListener("click", () => setView("student"));
  $("admin-tab")?.addEventListener("click", () => setView("admin"));
  $("student-picker")?.addEventListener("change", (e) => {
    selectedStudentId = e.target.value;
    renderStudent();
  });
  $("leave-form")?.addEventListener("submit", submitLeaveRequest);
  $("status-filter")?.addEventListener("change", renderAdmin);
  $("admin-requests")?.addEventListener("click", reviewRequest);
  $("reset-demo")?.addEventListener("click", () => {
    if (!window.confirm("Reset all local demo changes and restore the sample requests?")) return;
    data = starterData();
    selectedStudentId = data.students[0]?.id || "";
    if ($("status-filter")) $("status-filter").value = "all";
    saveData();
    renderAll();
    setView("student");
    showToast("Demo data restored.");
  });

  setMinimumDate();
  renderAll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
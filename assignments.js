
// ==========================================
// COLLEGEHUB - COMBINED UNIT & ASSIGNMENT MANAGER
// ==========================================

let assignments = [];
let units = [];
let feedbackEntries = [];
let currentUser = null;
let feedbackAssignmentId = null;
let confirmResolver = null;
let currentUnitId = null;
let unitAssignmentId = null;


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ==========================================
// WEBSITE NOTIFICATIONS
// ==========================================

function showNotification(message, type = "success") {
    let notification = document.getElementById("collegeHubToast");

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "collegeHubToast";
        document.body.appendChild(notification);
    }

    notification.style.cssText = `
        position: fixed;
        top: 25px;
        right: 25px;
        z-index: 10001;
        padding: 15px 22px;
        border-radius: 9px;
        color: white;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateY(-10px);
        transition: 0.25s ease;
        max-width: 350px;
        pointer-events: none;
    `;

    notification.style.background =
        type === "error" ? "#d94b57" :
        type === "warning" ? "#d69e28" :
        "#258b62";

    notification.textContent = message;
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";

    clearTimeout(notification.timeout);

    notification.timeout = setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(-10px)";
    }, 3000);
}


// ==========================================
// DATE FUNCTIONS
// ==========================================

function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round((due - today) / 86400000);
}

function getDeadlineClass(assignment, days) {
    if (assignment.completed || assignment.status === "Completed") {
        return "completed";
    }

    if (days < 7) return "red";
    if (days <= 14) return "yellow";

    return "green";
}

function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


// ==========================================
// PAGE NAVIGATION
// ==========================================

function showMainSections() {
    document.getElementById("unitManager")?.classList.remove("hidden");
    document.getElementById("assignmentManager")?.classList.remove("hidden");
    document.getElementById("unitDetails")?.classList.add("hidden");
}

function openUnitDetails(id) {
    const unit = units.find(item => item.id === id);

    if (!unit) {
        showNotification("Could not find that unit.", "error");
        return;
    }

    currentUnitId = id;

    document.getElementById("unitManager")?.classList.add("hidden");
    document.getElementById("assignmentManager")?.classList.add("hidden");
    document.getElementById("unitDetails")?.classList.remove("hidden");

    renderUnitDetails();
}

function closeUnitDetails() {
    currentUnitId = null;

    showMainSections();
    renderUnits();
}


// ==========================================
// FEEDBACK MODAL
// ==========================================

function createFeedbackModal() {
    if (document.getElementById("feedbackModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="feedback-modal" id="feedbackModal">
            <div class="feedback-modal-content">

                <div class="feedback-modal-header">
                    <div>
                        <h2>Add Teacher Feedback</h2>
                        <p>Record feedback and areas for improvement.</p>
                    </div>

                    <button type="button"
                        class="feedback-modal-close"
                        id="closeFeedbackModal">
                        &times;
                    </button>
                </div>

                <form id="feedbackModalForm">

                    <label for="modalTeacherFeedback">
                        Teacher Feedback
                    </label>

                    <textarea
                        id="modalTeacherFeedback"
                        placeholder="Enter your teacher's feedback..."
                        required
                    ></textarea>

                    <label for="modalFutureImprovements">
                        Future Improvements
                    </label>

                    <textarea
                        id="modalFutureImprovements"
                        placeholder="What do you need to improve next?"
                    ></textarea>

                    <div class="feedback-modal-actions">
                        <button type="button"
                            class="feedback-cancel-btn"
                            id="cancelFeedbackModal">
                            Cancel
                        </button>

                        <button type="submit"
                            class="feedback-save-btn"
                            id="saveFeedbackModal">
                            Save Feedback
                        </button>
                    </div>

                </form>
            </div>
        </div>
    `);

    document.getElementById("closeFeedbackModal")
        .addEventListener("click", closeFeedbackModal);

    document.getElementById("cancelFeedbackModal")
        .addEventListener("click", closeFeedbackModal);

    document.getElementById("feedbackModal")
        .addEventListener("click", event => {
            if (event.target.id === "feedbackModal") {
                closeFeedbackModal();
            }
        });

    document.getElementById("feedbackModalForm")
        .addEventListener("submit", async event => {
            event.preventDefault();

            if (feedbackAssignmentId) {
                await addFeedback(feedbackAssignmentId);
            }
        });
}

function openFeedbackModal(id) {
    feedbackAssignmentId = id;

    document.getElementById("feedbackModalForm").reset();
    document.getElementById("feedbackModal").classList.add("active");

    document.body.classList.add("modal-open");

    document.getElementById("modalTeacherFeedback").focus();
}

function closeFeedbackModal() {
    document.getElementById("feedbackModal")?.classList.remove("active");

    document.body.classList.remove("modal-open");

    feedbackAssignmentId = null;
}


// ==========================================
// COMPLETED ASSIGNMENT VIEW MODAL
// ==========================================

function createCompletedViewModal() {
    if (document.getElementById("completedViewModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="feedback-modal" id="completedViewModal">
            <div class="feedback-modal-content">

                <div class="feedback-modal-header">
                    <div>
                        <h2 id="completedViewTitle">Assignment Details</h2>
                        <p>Completed assignment information</p>
                    </div>

                    <button type="button"
                        class="feedback-modal-close"
                        id="closeCompletedView">
                        &times;
                    </button>
                </div>

                <div id="completedViewBody"></div>

                <div class="feedback-modal-actions">
                    <button type="button"
                        class="feedback-cancel-btn"
                        id="closeCompletedViewButton">
                        Close
                    </button>
                </div>

            </div>
        </div>
    `);

    document.getElementById("closeCompletedView")
        .addEventListener("click", closeCompletedView);

    document.getElementById("closeCompletedViewButton")
        .addEventListener("click", closeCompletedView);

    document.getElementById("completedViewModal")
        .addEventListener("click", event => {
            if (event.target.id === "completedViewModal") {
                closeCompletedView();
            }
        });
}

function openCompletedView(id) {
    const assignment = assignments.find(item => item.id === id);

    if (!assignment) {
        showNotification("Could not find that assignment.", "error");
        return;
    }

    const unit = units.find(
        item => item.id === assignment.coursework_id
    );

    const assignmentFeedback = feedbackEntries.filter(
        entry => entry.assignment_id === assignment.id
    );

    const feedbackHTML = assignmentFeedback.length
        ? assignmentFeedback.map(entry => `
            <div class="feedback-entry">
                <p>
                    <strong>Date:</strong>
                    ${formatDate(entry.created_at)}
                </p>

                <p><strong>Teacher feedback:</strong></p>
                <p>${escapeHTML(entry.feedback)}</p>

                ${entry.improvements ? `
                    <p><strong>Future improvements:</strong></p>
                    <p>${escapeHTML(entry.improvements)}</p>
                ` : ""}
            </div>
        `).join("")
        : `<p class="muted">No feedback recorded.</p>`;

    document.getElementById("completedViewTitle").textContent =
        assignment.title;

    document.getElementById("completedViewBody").innerHTML = `
        <div class="completed-assignment-details">

            <p>
                <strong>Subject:</strong>
                ${escapeHTML(assignment.subject || "Unassigned")}
            </p>

            <p>
                <strong>Unit:</strong>
                ${escapeHTML(unit?.unit_name || "No Unit")}
            </p>

            <p>
                <strong>Deadline:</strong>
                ${formatDate(assignment.deadline + "T00:00:00")}
            </p>

            <p>
                <strong>Target grade:</strong>
                ${escapeHTML(assignment.target_grade || "Not set")}
            </p>

            <p>
                <strong>Received grade:</strong>
                ${escapeHTML(assignment.received_grade || "Pending")}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(assignment.status || "Completed")}
            </p>

            <hr>

            <h3>Teacher Feedback</h3>

            ${feedbackHTML}

        </div>
    `;

    document.getElementById("completedViewModal").classList.add("active");
    document.body.classList.add("modal-open");
}

function closeCompletedView() {
    document.getElementById("completedViewModal")
        ?.classList.remove("active");

    document.body.classList.remove("modal-open");
}


// ==========================================
// CONFIRMATION MODAL
// ==========================================

function createConfirmModal() {
    if (document.getElementById("confirmModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="feedback-modal" id="confirmModal">
            <div class="feedback-modal-content confirm-modal-content">

                <div class="feedback-modal-header">
                    <div>
                        <h2 id="confirmTitle">Confirm Action</h2>
                        <p id="confirmMessage">Are you sure?</p>
                    </div>

                    <button type="button"
                        class="feedback-modal-close"
                        id="confirmClose">
                        &times;
                    </button>
                </div>

                <div class="feedback-modal-actions">
                    <button type="button"
                        class="feedback-cancel-btn"
                        id="confirmCancel">
                        Cancel
                    </button>

                    <button type="button"
                        class="confirm-delete-btn"
                        id="confirmDelete">
                        Confirm
                    </button>
                </div>

            </div>
        </div>
    `);

    document.getElementById("confirmCancel")
        .addEventListener("click", () => resolveConfirm(false));

    document.getElementById("confirmClose")
        .addEventListener("click", () => resolveConfirm(false));

    document.getElementById("confirmDelete")
        .addEventListener("click", () => resolveConfirm(true));

    document.getElementById("confirmModal")
        .addEventListener("click", event => {
            if (event.target.id === "confirmModal") {
                resolveConfirm(false);
            }
        });
}

function showConfirmModal(title, message) {
    return new Promise(resolve => {
        confirmResolver = resolve;

        document.getElementById("confirmTitle").textContent = title;
        document.getElementById("confirmMessage").textContent = message;

        document.getElementById("confirmModal").classList.add("active");
        document.body.classList.add("modal-open");
    });
}

function resolveConfirm(result) {
    document.getElementById("confirmModal")?.classList.remove("active");

    document.body.classList.remove("modal-open");

    if (confirmResolver) {
        const resolve = confirmResolver;
        confirmResolver = null;
        resolve(result);
    }
}


// ==========================================
// ADD / CHANGE UNIT MODAL
// ==========================================

function createAddToUnitModal() {
    if (document.getElementById("addToUnitModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="feedback-modal" id="addToUnitModal">
            <div class="feedback-modal-content">

                <div class="feedback-modal-header">
                    <div>
                        <h2 id="addToUnitTitle">Add Assignment to Unit</h2>
                        <p id="addToUnitAssignmentName">
                            Select which unit this assignment belongs to.
                        </p>
                    </div>

                    <button type="button"
                        class="feedback-modal-close"
                        id="closeAddToUnitModal">
                        &times;
                    </button>
                </div>

                <form id="addToUnitForm">

                    <label for="addToUnitSelect">Select a unit</label>

                    <select id="addToUnitSelect" required>
                        <option value="">Choose an option</option>
                    </select>

                    <div id="createUnitFields" class="hidden">

                        <h3>Create a New Unit</h3>

                        <label for="modalNewUnitName">Unit name</label>
                        <input
                            type="text"
                            id="modalNewUnitName"
                            placeholder="Enter unit name"
                        >

                        <label for="modalNewUnitSubject">Subject</label>
                        <input
                            type="text"
                            id="modalNewUnitSubject"
                            placeholder="Enter subject"
                        >

                        <label for="modalNewUnitGrade">Target grade</label>
                        <select id="modalNewUnitGrade">
                            <option value="">Select target grade</option>
                            <option value="Pass">Pass</option>
                            <option value="Merit">Merit</option>
                            <option value="Distinction">Distinction</option>
                        </select>

                        <label for="modalNewUnitStatus">Unit status</label>
                        <select id="modalNewUnitStatus">
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>

                    </div>

                    <div class="feedback-modal-actions">

                        <button type="button"
                            class="feedback-cancel-btn"
                            id="cancelAddToUnit">
                            Cancel
                        </button>

                        <button type="submit"
                            class="feedback-save-btn"
                            id="saveAddToUnit">
                            Save Changes
                        </button>

                    </div>

                </form>

            </div>
        </div>
    `);

    document.getElementById("closeAddToUnitModal")
        .addEventListener("click", closeAddToUnitModal);

    document.getElementById("cancelAddToUnit")
        .addEventListener("click", closeAddToUnitModal);

    document.getElementById("addToUnitModal")
        .addEventListener("click", event => {
            if (event.target.id === "addToUnitModal") {
                closeAddToUnitModal();
            }
        });

    document.getElementById("addToUnitSelect")
        .addEventListener("change", event => {
            const creatingNew = event.target.value === "__create_new__";

            document.getElementById("createUnitFields")
                .classList.toggle("hidden", !creatingNew);

            document.getElementById("addToUnitTitle").textContent =
                creatingNew
                    ? "Create Unit and Link Assignment"
                    : "Add / Change Unit";
        });

    document.getElementById("addToUnitForm")
        .addEventListener("submit", async event => {
            event.preventDefault();

            if (!unitAssignmentId) return;

            const selectedOption =
                document.getElementById("addToUnitSelect").value;

            if (selectedOption === "__create_new__") {
                await createUnitAndLinkAssignment(unitAssignmentId);
            } else {
                await saveAssignmentUnit(unitAssignmentId);
            }
        });
}


function openAddToUnitModal(id) {
    const assignment = assignments.find(item => item.id === id);

    if (!assignment) {
        showNotification("Could not find that assignment.", "error");
        return;
    }

    unitAssignmentId = id;

    const selector = document.getElementById("addToUnitSelect");

    selector.innerHTML = `
        <option value="">Choose an option</option>
    `;

    units.forEach(unit => {
        selector.innerHTML += `
            <option value="${escapeHTML(unit.id)}">
                ${escapeHTML(unit.unit_name)}
            </option>
        `;
    });

    selector.innerHTML += `
        <option value="__no_unit__">No Unit (Unlink Assignment)</option>
        <option value="__create_new__">+ Create New Unit</option>
    `;

    document.getElementById("addToUnitForm").reset();

    selector.value = assignment.coursework_id || "__no_unit__";

    document.getElementById("createUnitFields").classList.add("hidden");

    document.getElementById("addToUnitTitle").textContent =
        assignment.coursework_id
            ? "Change Assignment Unit"
            : "Add Assignment to Unit";

    document.getElementById("addToUnitAssignmentName").textContent =
        "Assignment: " + assignment.title;

    document.getElementById("addToUnitModal").classList.add("active");
    document.body.classList.add("modal-open");

    selector.focus();
}


function closeAddToUnitModal() {
    document.getElementById("addToUnitModal")
        ?.classList.remove("active");

    document.body.classList.remove("modal-open");

    unitAssignmentId = null;
}


// ==========================================
// SAVE / CHANGE / REMOVE ASSIGNMENT UNIT
// ==========================================

async function saveAssignmentUnit(id) {
    const selector = document.getElementById("addToUnitSelect");
    const unitId = selector.value;

    if (!unitId) {
        showNotification("Please select an option.", "warning");
        return;
    }

    const assignment = assignments.find(item => item.id === id);

    if (!assignment) {
        showNotification("Could not find that assignment.", "error");
        return;
    }

    const saveButton = document.getElementById("saveAddToUnit");

    let updateData = {};
    let successMessage = "";

    if (unitId === "__no_unit__") {
        if (!assignment.coursework_id) {
            showNotification("This assignment is already unlinked.", "warning");
            return;
        }

        updateData = {
            coursework_id: null,
            subject: "Unassigned"
        };

        successMessage = "Assignment successfully removed from its unit.";
    } else {
        const unit = units.find(item => item.id === unitId);

        if (!unit) {
            showNotification("Could not find that unit.", "error");
            return;
        }

        if (assignment.coursework_id === unitId) {
            showNotification("This assignment is already in that unit.", "warning");
            return;
        }

        updateData = {
            coursework_id: unitId,
            subject: unit.subject
        };

        successMessage = "Assignment moved to " + unit.unit_name + ".";
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const { error } = await supabaseClient
        .from("assignments")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", currentUser.id);

    saveButton.disabled = false;
    saveButton.textContent = "Save Changes";

    if (error) {
        console.error(error);
        showNotification("Could not update assignment: " + error.message, "error");
        return;
    }

    closeAddToUnitModal();

    showNotification(successMessage);

    await loadAssignments();
}


// ==========================================
// CREATE NEW UNIT AND LINK ASSIGNMENT
// ==========================================

async function createUnitAndLinkAssignment(id) {
    const name = document.getElementById("modalNewUnitName").value.trim();
    const subject = document.getElementById("modalNewUnitSubject").value.trim();
    const grade = document.getElementById("modalNewUnitGrade").value;
    const status = document.getElementById("modalNewUnitStatus").value;

    if (!name || !subject || !grade || !status) {
        showNotification("Please complete all the new unit fields.", "warning");
        return;
    }

    const assignment = assignments.find(item => item.id === id);

    if (!assignment) {
        showNotification("Could not find that assignment.", "error");
        return;
    }

    const saveButton = document.getElementById("saveAddToUnit");

    saveButton.disabled = true;
    saveButton.textContent = "Creating unit...";

    const { data: newUnit, error: unitError } = await supabaseClient
        .from("coursework")
        .insert({
            user_id: currentUser.id,
            unit_name: name,
            subject,
            target_grade: grade,
            status
        })
        .select()
        .single();

    if (unitError) {
        console.error(unitError);

        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";

        showNotification("Could not create unit: " + unitError.message, "error");
        return;
    }

    saveButton.textContent = "Linking assignment...";

    const { error: assignmentError } = await supabaseClient
        .from("assignments")
        .update({
            coursework_id: newUnit.id,
            subject: newUnit.subject
        })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    saveButton.disabled = false;
    saveButton.textContent = "Save Changes";

    if (assignmentError) {
        console.error(assignmentError);

        await loadUnits();

        showNotification(
            "The unit was created, but the assignment could not be linked: " + assignmentError.message,
            "error"
        );

        return;
    }

    closeAddToUnitModal();

    showNotification("New unit created and assignment linked successfully.");

    await loadUnits();
    await loadAssignments();
}


// ==========================================
// LOAD UNITS
// ==========================================

async function loadUnits() {
    const { data, error } = await supabaseClient
        .from("coursework")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        showNotification("Could not load units: " + error.message, "error");
        return;
    }

    units = data || [];

    renderUnits();
    populateUnitSelector();

    if (currentUnitId) {
        const stillExists = units.some(unit => unit.id === currentUnitId);

        if (stillExists) {
            renderUnitDetails();
        } else {
            closeUnitDetails();
        }
    }
}


// ==========================================
// DISPLAY UNITS
// ==========================================

function renderUnits() {
    const list = document.getElementById("unitList");

    if (!list) return;

    list.innerHTML = "";

    if (units.length === 0) {
        list.innerHTML = `
            <p class="muted">
                No units added yet. Add your first unit above.
            </p>
        `;
        return;
    }

    units.forEach(unit => {
        const unitAssignments = assignments.filter(
            assignment => assignment.coursework_id === unit.id
        );

        const completed = unitAssignments.filter(
            assignment =>
                assignment.completed || assignment.status === "Completed"
        ).length;

        list.innerHTML += `
            <div class="assignment unit-card"
                data-unit-open="${escapeHTML(unit.id)}">

                <div>
                    <h3>${escapeHTML(unit.unit_name)}</h3>
                    <p>${escapeHTML(unit.subject)}</p>
                    <p>Target grade: ${escapeHTML(unit.target_grade)}</p>
                    <p>Status: ${escapeHTML(unit.status)}</p>
                    <p>Assignments: ${unitAssignments.length}</p>
                    <p>Completed: ${completed}/${unitAssignments.length}</p>

                    <button type="button"
                        class="open-unit-btn"
                        data-id="${escapeHTML(unit.id)}">
                        View Unit Details
                    </button>
                </div>

                <div>
                    <button type="button"
                        class="change-unit-status-btn"
                        data-id="${escapeHTML(unit.id)}">
                        Change Status
                    </button>

                    <button type="button"
                        class="delete-unit-btn"
                        data-id="${escapeHTML(unit.id)}">
                        Delete Unit
                    </button>
                </div>

            </div>
        `;
    });
}


// ==========================================
// UNIT DETAILS
// ==========================================

function renderUnitDetails() {
    const unit = units.find(item => item.id === currentUnitId);

    if (!unit) return;

    const unitAssignments = assignments.filter(
        assignment => assignment.coursework_id === unit.id
    );

    const completed = unitAssignments.filter(
        assignment =>
            assignment.completed || assignment.status === "Completed"
    ).length;

    const total = unitAssignments.length;

    const percentage = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    document.getElementById("detailUnitName").textContent = unit.unit_name;
    document.getElementById("detailUnitSubject").textContent = unit.subject;

    document.getElementById("unitInformation").innerHTML = `
        <p><strong>Target grade:</strong> ${escapeHTML(unit.target_grade)}</p>
        <p><strong>Status:</strong> ${escapeHTML(unit.status)}</p>
        <p><strong>Total assignments:</strong> ${total}</p>
        <p><strong>Completed assignments:</strong> ${completed}</p>
        <p><strong>Remaining assignments:</strong> ${total - completed}</p>
    `;

    document.getElementById("unitProgressFill").style.width =
        percentage + "%";

    document.getElementById("unitProgressText").textContent =
        `${percentage}% completed (${completed}/${total} assignments)`;

    const list = document.getElementById("unitAssignmentList");

    list.innerHTML = "";

    if (unitAssignments.length === 0) {
        list.innerHTML = `
            <p class="muted">
                This unit has no assignments yet.
            </p>
        `;
        return;
    }

    unitAssignments.forEach(assignment => {
        const isCompleted =
            assignment.completed || assignment.status === "Completed";

        const days = getDaysRemaining(assignment.deadline);

        let deadlineText;

        if (isCompleted) {
            deadlineText = "Completed";
        } else if (days < 0) {
            deadlineText = `${Math.abs(days)} days overdue`;
        } else if (days === 0) {
            deadlineText = "Due today";
        } else {
            deadlineText = `${days} days left`;
        }

        list.innerHTML += `
            <div class="assignment unit-assignment-card">

                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>
                    <p>Deadline: ${formatDate(assignment.deadline + "T00:00:00")}</p>
                    <p>Target grade: ${escapeHTML(assignment.target_grade || "Not set")}</p>
                    <p>Received grade: <strong>${escapeHTML(assignment.received_grade || "Pending")}</strong></p>
                    <p>Status: ${escapeHTML(assignment.status || "Not Started")}</p>
                </div>

                <div>
                    <span class="deadline-status">${escapeHTML(deadlineText)}</span>

                    <button type="button"
                        class="show-main-assignment-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Manage Assignment
                    </button>
                </div>

            </div>
        `;
    });
}


// ==========================================
// UNIT SELECTOR
// ==========================================

function populateUnitSelector() {
    const selector = document.getElementById("assignmentUnit");

    if (!selector) return;

    const selectedValue = selector.value;

    selector.innerHTML = `
        <option value="">Select a unit</option>
        <option value="__no_unit__">No Unit</option>
    `;

    units.forEach(unit => {
        selector.innerHTML += `
            <option value="${escapeHTML(unit.id)}">
                ${escapeHTML(unit.unit_name)}
            </option>
        `;
    });

    if (
        selectedValue === "__no_unit__" ||
        units.some(unit => unit.id === selectedValue)
    ) {
        selector.value = selectedValue;
    }
}


// ==========================================
// LOAD FEEDBACK
// ==========================================

async function loadFeedback() {
    const { data, error } = await supabaseClient
        .from("assignment_feedback")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        showNotification("Could not load feedback: " + error.message, "error");
        return;
    }

    feedbackEntries = data || [];
}


// ==========================================
// LOAD ASSIGNMENTS
// ==========================================

async function loadAssignments() {
    const { data, error } = await supabaseClient
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

    if (error) {
        console.error(error);
        showNotification("Could not load assignments: " + error.message, "error");
        return;
    }

    assignments = data || [];

    await loadFeedback();

    renderAssignments();
    renderUnits();

    if (currentUnitId) {
        renderUnitDetails();
    }
}


// ==========================================
// DISPLAY ASSIGNMENTS
// ==========================================


function renderAssignments() {
    const list = document.getElementById("assignmentList");

    if (!list) return;

    const search = (
        document.getElementById("searchInput")?.value || ""
    ).toLowerCase();

    list.innerHTML = "";

    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    assignments.forEach(assignment => {
        const isCompleted =
            assignment.completed || assignment.status === "Completed";

        if (isCompleted) {
            completed++;
            return;
        }

        inProgress++;

        if (getDaysRemaining(assignment.deadline) < 0) {
            overdue++;
        }

        const unit = units.find(
            item => item.id === assignment.coursework_id
        );

        const unitName = unit ? unit.unit_name : "No Unit";

        const matchesSearch =
            (assignment.title || "").toLowerCase().includes(search) ||
            (assignment.subject || "").toLowerCase().includes(search) ||
            unitName.toLowerCase().includes(search);

        if (!matchesSearch) return;

        const days = getDaysRemaining(assignment.deadline);
        const colourClass = getDeadlineClass(assignment, days);

        let deadlineStatus;

        if (days < 0) {
            deadlineStatus = Math.abs(days) + " DAYS OVERDUE";
        } else if (days === 0) {
            deadlineStatus = "DUE TODAY";
        } else {
            deadlineStatus = days + " DAYS LEFT";
        }

        const assignmentFeedback = feedbackEntries.filter(
            entry => entry.assignment_id === assignment.id
        );

        const feedbackHTML = assignmentFeedback.length
            ? assignmentFeedback.map(entry => `
                <div class="feedback-entry">

                    <div class="feedback-entry-header">
                        <p>
                            <strong>Date:</strong>
                            ${formatDate(entry.created_at)}
                        </p>

                        <button type="button"
                            class="delete-feedback-btn"
                            data-id="${escapeHTML(entry.id)}">
                            Delete
                        </button>
                    </div>

                    <p><strong>Teacher feedback:</strong></p>
                    <p>${escapeHTML(entry.feedback)}</p>

                    ${entry.improvements ? `
                        <p><strong>Future improvements:</strong></p>
                        <p>${escapeHTML(entry.improvements)}</p>
                    ` : ""}

                </div>
            `).join("")
            : `<p class="muted">No feedback recorded yet.</p>`;

        list.innerHTML += `
            <div class="assignment ${colourClass}">

                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>

                    <p>${escapeHTML(assignment.subject || "Unassigned")}</p>

                    <p>Unit: ${escapeHTML(unitName)}</p>

                    <p>
                        Deadline:
                        ${formatDate(assignment.deadline + "T00:00:00")}
                    </p>

                    <p>
                        Target grade:
                        ${escapeHTML(assignment.target_grade || "Not set")}
                    </p>

                    <p>
                        Received grade:
                        <strong>${escapeHTML(assignment.received_grade || "Pending")}</strong>
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(assignment.status || "Not Started")}
                    </p>

                    <details class="feedback-history">
                        <summary>
                            Feedback History (${assignmentFeedback.length})
                        </summary>

                        ${feedbackHTML}
                    </details>
                </div>

                <div class="assignment-tools">

                    <span class="deadline-status">
                        ${deadlineStatus}
                    </span>

                    <br>

                    <button type="button"
                        class="add-to-unit-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        ${assignment.coursework_id ? "Change Unit" : "Add to Unit"}
                    </button>

                    <button type="button"
                        class="toggle-grade-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Update Grade
                    </button>

                    <button type="button"
                        class="toggle-feedback-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Add Feedback
                    </button>

                    <button type="button"
                        class="complete-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Complete
                    </button>

                    <button type="button"
                        class="delete-assignment-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Delete
                    </button>

                    <div class="assignment-editor"
                        id="gradeEditor-${escapeHTML(assignment.id)}">

                        <h3>Update Received Grade</h3>

                        <label for="gradeValue-${escapeHTML(assignment.id)}">
                            Received grade
                        </label>

                        <select id="gradeValue-${escapeHTML(assignment.id)}">

                            <option value="Pending"
                                ${!assignment.received_grade ? "selected" : ""}>
                                Pending
                            </option>

                            <option value="Pass"
                                ${assignment.received_grade === "Pass" ? "selected" : ""}>
                                Pass
                            </option>

                            <option value="Merit"
                                ${assignment.received_grade === "Merit" ? "selected" : ""}>
                                Merit
                            </option>

                            <option value="Distinction"
                                ${assignment.received_grade === "Distinction" ? "selected" : ""}>
                                Distinction
                            </option>

                        </select>

                        <button type="button"
                            class="save-grade-btn"
                            data-id="${escapeHTML(assignment.id)}">
                            Save Grade
                        </button>

                    </div>

                </div>
            </div>
        `;
    });

    if (list.innerHTML === "") {
        list.innerHTML = `<p class="muted">No active assignments found.</p>`;
    }

    // Update the completed assignments section
    renderCompletedAssignments();

    // Update assignment statistics
    const totalCount = document.getElementById("totalCount");
    const progressCount = document.getElementById("progressCount");
    const completedCount = document.getElementById("completedCount");
    const overdueCount = document.getElementById("overdueCount");

    if (totalCount) totalCount.textContent = assignments.length;
    if (progressCount) progressCount.textContent = inProgress;
    if (completedCount) completedCount.textContent = completed;
    if (overdueCount) overdueCount.textContent = overdue;
}



// ==========================================
// COMPLETED ASSIGNMENTS
// ==========================================

function renderCompletedAssignments() {
    const list = document.getElementById("completedAssignmentList");
    const label = document.getElementById("completedAssignmentsLabel");

    if (!list) return;

    const completedAssignments = assignments.filter(
        assignment =>
            assignment.completed === true ||
            assignment.status === "Completed"
    );

    list.innerHTML = "";

    if (label) {
        label.textContent =
            `${completedAssignments.length} completed assignment${completedAssignments.length === 1 ? "" : "s"}`;
    }

    if (completedAssignments.length === 0) {
        list.innerHTML = `
            <p class="muted">
                No completed assignments yet. Completed work will appear here.
            </p>
        `;
        return;
    }

    completedAssignments.forEach(assignment => {
        const unit = units.find(
            item => item.id === assignment.coursework_id
        );

        list.innerHTML += `
            <div class="assignment completed-assignment-card">

                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>

                    <p>${escapeHTML(assignment.subject || "Unassigned")}</p>

                    <p>
                        Unit:
                        ${escapeHTML(unit?.unit_name || "No Unit")}
                    </p>

                    <p>
                        Received grade:
                        <strong>${escapeHTML(assignment.received_grade || "Pending")}</strong>
                    </p>

                    <p>
                        Deadline:
                        ${formatDate(assignment.deadline + "T00:00:00")}
                    </p>
                </div>

                <div class="assignment-tools">

                    <span class="deadline-status">
                        COMPLETED
                    </span>

                    <br>

                    <button type="button"
                        class="view-completed-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        View
                    </button>

                    <button type="button"
                        class="reopen-assignment-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Reopen
                    </button>

                    <button type="button"
                        class="delete-completed-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Delete
                    </button>

                </div>

            </div>
        `;
    });
}


// ==========================================
// COMPLETED ASSIGNMENTS COLLAPSE
// ==========================================

document.getElementById("toggleCompletedAssignments")
    ?.addEventListener("click", () => {
        const content = document.getElementById(
            "completedAssignmentsContent"
        );

        const button = document.getElementById(
            "toggleCompletedAssignments"
        );

        const icon = document.getElementById(
            "completedToggleIcon"
        );

        const isOpening = content.classList.contains("hidden");

        content.classList.toggle("hidden");

        button.setAttribute("aria-expanded", String(isOpening));

        if (icon) {
            icon.textContent = isOpening ? "▲" : "▼";
        }
    });


// ==========================================
// VIEW / REOPEN / DELETE COMPLETED
// ==========================================

document.getElementById("completedAssignmentList")
    ?.addEventListener("click", event => {

        const viewButton = event.target.closest(".view-completed-btn");
        const reopenButton = event.target.closest(".reopen-assignment-btn");
        const deleteButton = event.target.closest(".delete-completed-btn");

        if (viewButton) {
            openCompletedView(viewButton.dataset.id);
            return;
        }

        if (reopenButton) {
            reopenAssignment(reopenButton.dataset.id);
            return;
        }

        if (deleteButton) {
            deleteAssignment(deleteButton.dataset.id);
        }
    });


// ==========================================
// REOPEN ASSIGNMENT
// ==========================================

async function reopenAssignment(id) {
    const confirmed = await showConfirmModal(
        "Reopen Assignment",
        "Move this assignment back into your active assignments?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("assignments")
        .update({
            completed: false,
            status: "In Progress",
            submitted_at: null
        })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification(
            "Could not reopen assignment: " + error.message,
            "error"
        );
        return;
    }

    showNotification("Assignment successfully reopened.");

    await loadAssignments();
}


// ==========================================
// GRADE EDITOR
// ==========================================

function toggleGradeEditor(id) {
    document.getElementById(`gradeEditor-${id}`)
        ?.classList.toggle("active");
}


// ==========================================
// UPDATE GRADE
// ==========================================

async function updateGrade(id) {
    const selector = document.getElementById(`gradeValue-${id}`);

    if (!selector) return;

    const grade = selector.value;

    const validGrades = [
        "Pending",
        "Pass",
        "Merit",
        "Distinction"
    ];

    if (!validGrades.includes(grade)) {
        showNotification("Please select a valid grade.", "warning");
        return;
    }

    const { error } = await supabaseClient
        .from("assignments")
        .update({
            received_grade: grade === "Pending" ? null : grade
        })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification("Could not update grade: " + error.message, "error");
        return;
    }

    showNotification(
        grade === "Pending"
            ? "Grade successfully reset to Pending."
            : "Grade successfully updated to " + grade + "."
    );

    await loadAssignments();
}


// ==========================================
// ADD FEEDBACK
// ==========================================

async function addFeedback(id) {
    const feedback = document.getElementById("modalTeacherFeedback")
        .value.trim();

    const improvements = document.getElementById("modalFutureImprovements")
        .value.trim();

    if (!feedback) {
        showNotification("Please enter the teacher's feedback.", "warning");
        return;
    }

    const saveButton = document.getElementById("saveFeedbackModal");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const { error } = await supabaseClient
        .from("assignment_feedback")
        .insert({
            assignment_id: id,
            user_id: currentUser.id,
            feedback,
            improvements: improvements || null
        });

    saveButton.disabled = false;
    saveButton.textContent = "Save Feedback";

    if (error) {
        console.error(error);
        showNotification("Could not save feedback: " + error.message, "error");
        return;
    }

    closeFeedbackModal();

    showNotification("Teacher feedback saved successfully.");

    await loadAssignments();
}


// ==========================================
// DELETE FEEDBACK
// ==========================================

async function deleteFeedback(id) {
    const confirmed = await showConfirmModal(
        "Delete Feedback",
        "Are you sure you want to permanently delete this feedback entry?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("assignment_feedback")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification("Could not delete feedback: " + error.message, "error");
        return;
    }

    showNotification("Feedback deleted successfully.");

    await loadAssignments();
}


// ==========================================
// ADD UNIT BUTTON
// ==========================================

document.getElementById("addUnitBtn")
    ?.addEventListener("click", () => {
        document.getElementById("unitForm")?.classList.toggle("hidden");
    });


// ==========================================
// ADD ASSIGNMENT BUTTON
// ==========================================

document.getElementById("addAssignmentBtn")
    ?.addEventListener("click", () => {
        const form = document.getElementById("assignmentForm");

        if (!form) return;

        form.classList.toggle("hidden");

        if (!form.classList.contains("hidden")) {
            document.getElementById("assignmentTitle")?.focus();
        }
    });


// ==========================================
// UNIT DETAILS BUTTONS
// ==========================================

document.getElementById("backToUnitsBtn")
    ?.addEventListener("click", closeUnitDetails);

document.getElementById("addUnitAssignmentBtn")
    ?.addEventListener("click", () => {
        const unitId = currentUnitId;

        if (!unitId) return;

        document.getElementById("unitDetails").classList.add("hidden");
        document.getElementById("unitManager").classList.remove("hidden");
        document.getElementById("assignmentManager").classList.remove("hidden");

        const form = document.getElementById("assignmentForm");

        form.classList.remove("hidden");

        populateUnitSelector();

        document.getElementById("assignmentUnit").value = unitId;
        document.getElementById("assignmentTitle").focus();
    });


// ==========================================
// ADD UNIT
// ==========================================

document.getElementById("newUnit")
    ?.addEventListener("submit", async event => {
        event.preventDefault();

        const name = document.getElementById("unitName").value.trim();
        const subject = document.getElementById("unitSubject").value.trim();
        const grade = document.getElementById("targetGrade").value;
        const status = document.getElementById("unitStatus").value;

        if (!name || !subject || !grade || !status) {
            showNotification("Please complete all fields.", "warning");
            return;
        }

        const { error } = await supabaseClient
            .from("coursework")
            .insert({
                user_id: currentUser.id,
                unit_name: name,
                subject,
                target_grade: grade,
                status
            });

        if (error) {
            console.error(error);
            showNotification("Could not save unit: " + error.message, "error");
            return;
        }

        event.target.reset();

        document.getElementById("unitForm").classList.add("hidden");

        showNotification("Unit added successfully.");

        await loadUnits();
    });


// ==========================================
// ADD ASSIGNMENT
// ==========================================

document.getElementById("newAssignment")
    ?.addEventListener("submit", async event => {
        event.preventDefault();

        const title = document.getElementById("assignmentTitle").value.trim();
        const unitId = document.getElementById("assignmentUnit").value;
        const deadline = document.getElementById("assignmentDeadline").value;
        const targetGrade = document.getElementById("assignmentTarget").value;

        if (!title || !unitId || !deadline || !targetGrade) {
            showNotification("Please complete all fields.", "warning");
            return;
        }

        const isNoUnit = unitId === "__no_unit__";

        const selectedUnit = isNoUnit
            ? null
            : units.find(unit => unit.id === unitId);

        if (!isNoUnit && !selectedUnit) {
            showNotification("Please select a valid unit.", "error");
            return;
        }

        const saveButton = event.target.querySelector('button[type="submit"]');

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        const { error } = await supabaseClient
            .from("assignments")
            .insert({
                user_id: currentUser.id,
                coursework_id: isNoUnit ? null : unitId,
                title,
                subject: isNoUnit ? "Unassigned" : selectedUnit.subject,
                deadline,
                completed: false,
                target_grade: targetGrade,
                status: "Not Started"
            });

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Assignment";
        }

        if (error) {
            console.error(error);
            showNotification("Could not save assignment: " + error.message, "error");
            return;
        }

        event.target.reset();

        document.getElementById("assignmentForm").classList.add("hidden");

        showNotification(
            isNoUnit
                ? "Unassigned assignment added successfully."
                : "Assignment added successfully."
        );

        await loadAssignments();

        if (currentUnitId && currentUnitId === unitId) {
            openUnitDetails(unitId);
        }
    });


// ==========================================
// COMPLETE ASSIGNMENT
// ==========================================

async function completeAssignment(id) {
    const { error } = await supabaseClient
        .from("assignments")
        .update({
            completed: true,
            status: "Completed",
            submitted_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification(
            "Could not complete assignment: " + error.message,
            "error"
        );
        return;
    }

    showNotification("Assignment marked as completed.");

    await loadAssignments();
}


// ==========================================
// CHANGE UNIT STATUS
// ==========================================

async function changeUnitStatus(id) {
    const unit = units.find(item => item.id === id);

    if (!unit) return;

    const statuses = [
        "Not Started",
        "In Progress",
        "Completed"
    ];

    const current = statuses.indexOf(unit.status);
    const next = statuses[(current + 1) % statuses.length];

    const { error } = await supabaseClient
        .from("coursework")
        .update({ status: next })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification("Could not update unit: " + error.message, "error");
        return;
    }

    showNotification("Unit status updated to " + next + ".");

    await loadUnits();
}


// ==========================================
// DELETE ASSIGNMENT
// ==========================================

async function deleteAssignment(id) {
    const confirmed = await showConfirmModal(
        "Delete Assignment",
        "Deleting this assignment will also permanently delete its feedback history. Continue?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("assignments")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification("Could not delete assignment: " + error.message, "error");
        return;
    }

    showNotification("Assignment deleted successfully.");

    await loadAssignments();
}


// ==========================================
// DELETE UNIT
// ==========================================

async function deleteUnit(id) {
    const linkedAssignments = assignments.filter(
        assignment => assignment.coursework_id === id
    );

    if (linkedAssignments.length > 0) {
        showNotification(
            "This unit still contains assignments. Delete or move them first.",
            "warning"
        );
        return;
    }

    const confirmed = await showConfirmModal(
        "Delete Unit",
        "Are you sure you want to permanently delete this unit?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("coursework")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        showNotification("Could not delete unit: " + error.message, "error");
        return;
    }

    if (currentUnitId === id) {
        closeUnitDetails();
    }

    showNotification("Unit deleted successfully.");

    await loadUnits();
}


// ==========================================
// ASSIGNMENT BUTTON EVENTS
// ==========================================

document.getElementById("assignmentList")
    ?.addEventListener("click", event => {
        const completeButton = event.target.closest(".complete-btn");
        const deleteButton = event.target.closest(".delete-assignment-btn");
        const gradeToggle = event.target.closest(".toggle-grade-btn");
        const feedbackToggle = event.target.closest(".toggle-feedback-btn");
        const saveGrade = event.target.closest(".save-grade-btn");
        const deleteFeedbackButton = event.target.closest(".delete-feedback-btn");
        const addToUnitButton = event.target.closest(".add-to-unit-btn");

        if (addToUnitButton) {
            openAddToUnitModal(addToUnitButton.dataset.id);
            return;
        }

        if (completeButton) {
            completeAssignment(completeButton.dataset.id);
        }

        if (deleteButton) {
            deleteAssignment(deleteButton.dataset.id);
        }

        if (gradeToggle) {
            toggleGradeEditor(gradeToggle.dataset.id);
        }

        if (feedbackToggle) {
            openFeedbackModal(feedbackToggle.dataset.id);
        }

        if (saveGrade) {
            updateGrade(saveGrade.dataset.id);
        }

        if (deleteFeedbackButton) {
            deleteFeedback(deleteFeedbackButton.dataset.id);
        }
    });


// ==========================================
// UNIT BUTTON EVENTS
// ==========================================

document.getElementById("unitList")
    ?.addEventListener("click", event => {
        const statusButton = event.target.closest(".change-unit-status-btn");
        const deleteButton = event.target.closest(".delete-unit-btn");
        const openButton = event.target.closest(".open-unit-btn");

        if (statusButton) {
            changeUnitStatus(statusButton.dataset.id);
            return;
        }

        if (deleteButton) {
            deleteUnit(deleteButton.dataset.id);
            return;
        }

        if (openButton) {
            openUnitDetails(openButton.dataset.id);
        }
    });


// ==========================================
// UNIT DETAIL EVENTS
// ==========================================

document.getElementById("unitAssignmentList")
    ?.addEventListener("click", event => {
        const manageButton = event.target.closest(".show-main-assignment-btn");

        if (!manageButton) return;

        const assignmentId = manageButton.dataset.id;

        closeUnitDetails();

        const assignmentCard = [...document.querySelectorAll("#assignmentList .assignment")]
            .find(card => card.querySelector(
                `.toggle-grade-btn[data-id="${CSS.escape(assignmentId)}"]`
            ));

        if (assignmentCard) {
            assignmentCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });


// ==========================================
// SEARCH
// ==========================================

document.getElementById("searchInput")
    ?.addEventListener("input", renderAssignments);


// ==========================================
// INITIALISE
// ==========================================

async function initialiseAssignments() {
    createCompletedViewModal();
    createFeedbackModal();
    createConfirmModal();
    createAddToUnitModal();

    if (!window.supabaseClient) {
        showNotification("Supabase connection is unavailable.", "error");
        return;
    }

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = data.user;

    await loadUnits();
    await loadAssignments();
}

initialiseAssignments();


// ==========================================
// COLLEGEHUB - REMINDERS SYSTEM
// Assignment Deadlines + Personal Reminders
// All Calendar Events + Previous Archive
// ==========================================

let assignments = [];
let units = [];
let personalReminders = [];
let personalCalendarEvents = [];
let currentUser = null;

let currentCalendarDate = new Date();
let selectedCalendarDate = null;
let editingReminderId = null;
let deletingReminderId = null;
let toastTimeout = null;


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


// ==========================================
// DATE HELPERS
// ==========================================

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
    if (!dateString) return null;

    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateString) {
    if (!dateString) return "No date";

    const date = parseLocalDate(dateString);

    if (!date) return "No date";

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getToday() {
    return getLocalDateString();
}

function getDaysDifference(dateString) {
    if (!dateString) return Infinity;

    const today = parseLocalDate(getToday());
    const target = parseLocalDate(dateString);

    if (!today || !target) return Infinity;

    return Math.round((target - today) / 86400000);
}


// ==========================================
// AUTOMATIC PRIORITY SYSTEM
// ==========================================

function getAutomaticPriority(dueDate) {
    const difference = getDaysDifference(dueDate);

    if (difference < 7) return "High";
    if (difference <= 14) return "Medium";

    return "Low";
}

function getUrgencyClass(reminder) {
    if (reminder.completed) return "urgency-grey";

    const difference = getDaysDifference(reminder.due_date);

    if (difference < 7) return "urgency-red";
    if (difference <= 14) return "urgency-yellow";

    return "urgency-green";
}

function updatePriorityFromDate() {
    const dateInput = document.getElementById("reminderDate");
    const priorityInput = document.getElementById("reminderPriority");

    if (!dateInput || !priorityInput || !dateInput.value) return;

    priorityInput.value = getAutomaticPriority(dateInput.value);
}

async function synchroniseReminderPriorities() {
    const remindersToUpdate = personalReminders.filter(reminder => {
        return reminder.priority !== getAutomaticPriority(reminder.due_date);
    });

    if (!remindersToUpdate.length) return;

    const results = await Promise.all(
        remindersToUpdate.map(reminder =>
            window.supabaseClient
                .from("reminders")
                .update({
                    priority: getAutomaticPriority(reminder.due_date),
                    updated_at: new Date().toISOString()
                })
                .eq("id", reminder.id)
                .eq("user_id", currentUser.id)
        )
    );

    const failedUpdate = results.find(result => result.error);

    if (failedUpdate) throw failedUpdate.error;

    personalReminders = personalReminders.map(reminder => ({
        ...reminder,
        priority: getAutomaticPriority(reminder.due_date)
    }));
}


// ==========================================
// NOTIFICATIONS
// ==========================================

function showReminderToast(message, type = "success") {
    const toast = document.getElementById("reminderToast");

    if (!toast) return;

    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = `reminder-toast show ${type}`;

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ==========================================
// LOAD DATA
// ==========================================

async function loadAssignments() {
    const { data, error } = await window.supabaseClient
        .from("assignments")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("deadline", { ascending: true });

    if (error) throw error;

    assignments = data || [];
}

async function loadUnits() {
    const { data, error } = await window.supabaseClient
        .from("coursework")
        .select("*")
        .eq("user_id", currentUser.id);

    if (error) throw error;

    units = data || [];
}

async function loadPersonalReminders() {
    const { data, error } = await window.supabaseClient
        .from("reminders")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("due_date", { ascending: true });

    if (error) throw error;

    personalReminders = data || [];

    await synchroniseReminderPriorities();
}


// LOAD ALL EVENTS FROM MAIN CALENDAR
async function loadPersonalCalendarEvents() {
    const { data, error } = await window.supabaseClient
        .from("calendar_events")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("event_date", { ascending: true });

    if (error) throw error;

    personalCalendarEvents = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description || "",
        due_date: event.event_date,
        category: event.category || "Other",
        priority: getAutomaticPriority(event.event_date),
        assignment_id: null,
        completed: false,
        type: "calendar",
        source: "calendar_events"
    }));
}


// LOAD EVERYTHING
async function loadAllReminders() {
    await Promise.all([
        loadAssignments(),
        loadUnits(),
        loadPersonalReminders(),
        loadPersonalCalendarEvents()
    ]);

    renderStatistics();
    renderReminders();
    renderCalendar();
}


// ==========================================
// COMPLETION HELPERS
// ==========================================

function isReminderCompleted(reminder) {
    return reminder.completed === true ||
        reminder.status === "Completed";
}

function isPreviousReminder(reminder) {
    return isReminderCompleted(reminder) &&
        Boolean(reminder.due_date) &&
        reminder.due_date < getToday();
}


// ==========================================
// UNIT HELPERS
// ==========================================

function getUnitForAssignment(assignment) {
    if (!assignment || !assignment.coursework_id) return null;

    return units.find(unit =>
        String(unit.id) === String(assignment.coursework_id)
    ) || null;
}

function getUnitNameForAssignment(assignment) {
    const unit = getUnitForAssignment(assignment);

    return unit ? unit.unit_name : "No unit linked";
}


// ==========================================
// COMBINE REMINDER DATA
// ==========================================

function getAllReminders() {

    const assignmentEntries = assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.subject,
        due_date: assignment.deadline,
        completed: isReminderCompleted(assignment),
        category: "Coursework",
        priority: getAutomaticPriority(assignment.deadline),
        type: "assignment",
        assignment_id: assignment.id,
        coursework_id: assignment.coursework_id,
        unit_name: getUnitNameForAssignment(assignment)
    }));

    const personalEntries = personalReminders.map(reminder => {
        const linkedAssignment = assignments.find(assignment =>
            String(assignment.id) === String(reminder.assignment_id)
        );

        return {
            ...reminder,
            completed: isReminderCompleted(reminder),
            type: "personal",
            linked_assignment: linkedAssignment || null,
            unit_name: linkedAssignment
                ? getUnitNameForAssignment(linkedAssignment)
                : null
        };
    });

    const calendarEntries = personalCalendarEvents.map(event => ({
        ...event,
        completed: false,
        type: "calendar"
    }));

    return [
        ...assignmentEntries,
        ...personalEntries,
        ...calendarEntries
    ].sort((a, b) => {
        return String(a.due_date || "").localeCompare(
            String(b.due_date || "")
        );
    });
}


// ==========================================
// STATISTICS
// ==========================================

function renderStatistics() {
    const reminders = getAllReminders();
    const today = getToday();

    const upcoming = reminders.filter(reminder =>
        !reminder.completed && reminder.due_date > today
    );

    const dueToday = reminders.filter(reminder =>
        !reminder.completed && reminder.due_date === today
    );

    const overdue = reminders.filter(reminder =>
        !reminder.completed && reminder.due_date < today
    );

    const completed = reminders.filter(reminder =>
        reminder.completed
    );

    const elements = {
        upcomingCount: upcoming.length,
        todayCount: dueToday.length,
        overdueCount: overdue.length,
        completedCount: completed.length
    };

    Object.entries(elements).forEach(([id, count]) => {
        const element = document.getElementById(id);

        if (element) element.textContent = count;
    });
}


// ==========================================
// REMINDER STATUS
// ==========================================

function getReminderStatus(reminder) {
    const urgencyClass = getUrgencyClass(reminder);

    if (reminder.completed) {
        return {
            label: "Completed",
            className: "completed",
            urgencyClass
        };
    }

    const difference = getDaysDifference(reminder.due_date);

    if (difference < 0) {
        return {
            label: "Overdue",
            className: "overdue",
            urgencyClass
        };
    }

    if (difference === 0) {
        return {
            label: "Due Today",
            className: "today",
            urgencyClass
        };
    }

    return {
        label: `${difference} day${difference === 1 ? "" : "s"} left`,
        className: "upcoming",
        urgencyClass
    };
}


// ==========================================
// CALENDAR DEADLINE COLOURS
// ==========================================

function getCalendarUrgencyClass(reminder) {
    if (reminder.completed) return "calendar-title-completed";

    const difference = getDaysDifference(reminder.due_date);

    if (difference < 7) return "calendar-title-red";
    if (difference <= 14) return "calendar-title-yellow";

    return "calendar-title-green";
}


// ==========================================
// FILTER REMINDERS
// ==========================================

function getFilteredReminders() {
    const filter = document.getElementById("reminderFilter")?.value || "all";
    const category = document.getElementById("categoryFilter")?.value || "all";

    const search = (
        document.getElementById("reminderSearch")?.value || ""
    ).toLowerCase().trim();

    const today = getToday();

    return getAllReminders().filter(reminder => {
        const matchesSearch =
            String(reminder.title || "").toLowerCase().includes(search) ||
            String(reminder.description || "").toLowerCase().includes(search) ||
            String(reminder.unit_name || "").toLowerCase().includes(search);

        const matchesCategory =
            category === "all" || reminder.category === category;

        let matchesFilter = true;

        if (filter === "today") {
            matchesFilter =
                !reminder.completed && reminder.due_date === today;
        }

        if (filter === "upcoming") {
            matchesFilter =
                !reminder.completed && reminder.due_date > today;
        }

        if (filter === "overdue") {
            matchesFilter =
                !reminder.completed && reminder.due_date < today;
        }

        if (filter === "completed") {
            matchesFilter = reminder.completed;
        }

        return matchesSearch && matchesCategory && matchesFilter;
    });
}


// ==========================================
// REMINDER TYPE LABEL
// ==========================================

function getReminderTypeLabel(reminder) {
    if (reminder.type === "assignment") {
        return "Assignment Deadline";
    }

    if (reminder.type === "personal") {
        return "Personal Reminder";
    }

    if (reminder.type === "calendar") {
        const category = reminder.category || "Other";
        return `Calendar Event – ${category}`;
    }

    return "Reminder";
}


// ==========================================
// CREATE REMINDER CARD
// ==========================================

function createReminderCard(reminder, archived = false) {

    const status = getReminderStatus(reminder);

    const isPersonal = reminder.type === "personal";
    const isCalendarEvent = reminder.type === "calendar";
    const isAssignment = reminder.type === "assignment";

    let linkedDetails = "";

    if (isPersonal && reminder.assignment_id) {
        linkedDetails = `
            <span>Linked assignment: ${escapeHTML(
                reminder.linked_assignment?.title || "Assignment unavailable"
            )}</span>

            <span>Unit: ${escapeHTML(
                reminder.unit_name || "No unit linked"
            )}</span>
        `;
    } else if (isAssignment) {
        linkedDetails = `
            <span>Unit: ${escapeHTML(
                reminder.unit_name || "No unit linked"
            )}</span>
        `;
    }

    const priority = getAutomaticPriority(reminder.due_date);
    const typeLabel = getReminderTypeLabel(reminder);

    return `
        <article class="reminder-item ${status.className} ${status.urgencyClass}">

            <div class="reminder-item-main">

                <div class="reminder-item-top">

                    <span class="reminder-type ${
                        isPersonal || isCalendarEvent ? "personal" : "assignment"
                    }">
                        ${escapeHTML(typeLabel)}
                    </span>

                    <span class="reminder-status ${status.className} ${status.urgencyClass}">
                        ${escapeHTML(status.label)}
                    </span>

                </div>

                <h3>${escapeHTML(reminder.title)}</h3>

                <p class="reminder-description">
                    ${escapeHTML(reminder.description || "")}
                </p>

                <div class="reminder-item-details">

                    <span>◷ ${escapeHTML(formatDate(reminder.due_date))}</span>

                    ${!isCalendarEvent ? `
                        <span>${escapeHTML(reminder.category || "")}</span>
                    ` : ""}

                    <span class="priority-${priority.toLowerCase()}">
                        ${priority} Priority
                    </span>

                    ${linkedDetails}

                </div>

            </div>

            <div class="reminder-actions">

                ${archived ? `
                    <button
                        class="reminder-action-btn"
                        data-action="view"
                        data-id="${escapeHTML(reminder.id)}"
                        data-type="${reminder.type}"
                        type="button"
                    >
                        View
                    </button>
                ` : ""}

                ${isPersonal ? `
                    <button
                        class="reminder-action-btn"
                        data-action="edit"
                        data-id="${escapeHTML(reminder.id)}"
                        type="button"
                    >
                        Edit
                    </button>

                    <button
                        class="reminder-action-btn danger"
                        data-action="delete"
                        data-id="${escapeHTML(reminder.id)}"
                        type="button"
                    >
                        Delete
                    </button>
                ` : ""}

                ${!isCalendarEvent ? `
                    <button
                        class="reminder-action-btn ${
                            reminder.completed ? "undo" : "complete"
                        }"
                        data-action="toggle"
                        data-id="${escapeHTML(reminder.id)}"
                        data-type="${reminder.type}"
                        type="button"
                    >
                        ${reminder.completed ? "Reopen" : "Complete"}
                    </button>
                ` : ""}

            </div>

        </article>
    `;
}


// ==========================================
// RENDER ACTIVE + PREVIOUS REMINDERS
// ==========================================

function renderReminders() {
    const activeContainer = document.getElementById("reminderList");
    const previousContainer = document.getElementById("previousReminderList");
    const previousCount = document.getElementById("previousReminderCount");

    if (!activeContainer || !previousContainer) return;

    const reminders = getFilteredReminders();

    const activeReminders = reminders.filter(reminder =>
        !isPreviousReminder(reminder)
    );

    const previousReminders = reminders.filter(reminder =>
        isPreviousReminder(reminder)
    );

    if (activeReminders.length) {
        activeContainer.innerHTML = activeReminders
            .map(reminder => createReminderCard(reminder))
            .join("");
    } else {
        activeContainer.innerHTML = `
            <div class="reminder-empty">
                <h3>No active reminders found</h3>
                <p class="muted">
                    Try changing your filters or add a personal reminder.
                </p>
            </div>
        `;
    }

    if (previousCount) {
        previousCount.textContent = previousReminders.length;
    }

    if (previousReminders.length) {
        previousContainer.innerHTML = previousReminders
            .map(reminder => createReminderCard(reminder, true))
            .join("");
    } else {
        previousContainer.innerHTML = `
            <div class="reminder-empty">
                <h3>No previous reminders</h3>
                <p class="muted">
                    Completed reminders will appear here after their due dates have passed.
                </p>
            </div>
        `;
    }
}


// ==========================================
// VIEW PREVIOUS REMINDER
// ==========================================

function openPreviousReminderView(id, type) {
    const reminder = getAllReminders().find(item =>
        String(item.id) === String(id) &&
        item.type === type
    );

    if (!reminder) {
        showReminderToast("Reminder could not be found.", "error");
        return;
    }

    let modal = document.getElementById("previousReminderViewModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "previousReminderViewModal";
        modal.className = "reminder-view-overlay";

        document.body.appendChild(modal);
    }

    let extraDetails = "";

    if (reminder.type === "personal" && reminder.assignment_id) {
        extraDetails = `
            <div class="reminder-view-field">
                <small>LINKED ASSIGNMENT</small>
                <p>${escapeHTML(
                    reminder.linked_assignment?.title || "Assignment unavailable"
                )}</p>
            </div>

            <div class="reminder-view-field">
                <small>LINKED UNIT</small>
                <p>${escapeHTML(reminder.unit_name || "No unit linked")}</p>
            </div>
        `;
    }

    if (reminder.type === "assignment") {
        extraDetails = `
            <div class="reminder-view-field">
                <small>UNIT</small>
                <p>${escapeHTML(reminder.unit_name || "No unit linked")}</p>
            </div>
        `;
    }

    const typeLabel = getReminderTypeLabel(reminder);

    modal.innerHTML = `
        <div class="reminder-view-modal">

            <div class="reminder-view-heading">
                <h2>Previous Reminder</h2>

                <button
                    type="button"
                    class="reminder-view-close"
                    data-action="close-view"
                    aria-label="Close"
                >
                    &times;
                </button>
            </div>

            <div class="reminder-view-content">

                <div class="reminder-view-field">
                    <small>TITLE</small>
                    <h3>${escapeHTML(reminder.title)}</h3>
                </div>

                <div class="reminder-view-field">
                    <small>DESCRIPTION</small>
                    <p>${escapeHTML(
                        reminder.description || "No description provided."
                    )}</p>
                </div>

                <div class="reminder-view-field">
                    <small>DUE DATE</small>
                    <p>${escapeHTML(formatDate(reminder.due_date))}</p>
                </div>

                <div class="reminder-view-field">
                    <small>CATEGORY</small>
                    <p>${escapeHTML(reminder.category || "Other")}</p>
                </div>

                <div class="reminder-view-field">
                    <small>PRIORITY</small>
                    <p>${escapeHTML(getAutomaticPriority(reminder.due_date))}</p>
                </div>

                <div class="reminder-view-field">
                    <small>TYPE</small>
                    <p>${escapeHTML(typeLabel)}</p>
                </div>

                ${extraDetails}

                <div class="reminder-view-field">
                    <small>STATUS</small>
                    <p class="reminder-view-completed">Completed</p>
                </div>

            </div>

            <button
                type="button"
                class="reminder-view-done"
                data-action="close-view"
            >
                Close
            </button>

        </div>
    `;

    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function closePreviousReminderView() {
    const modal = document.getElementById("previousReminderViewModal");

    if (modal) modal.hidden = true;

    document.body.classList.remove("modal-open");
}


// ==========================================
// COURSEWORK ASSIGNMENT SELECTOR
// ==========================================

function populateAssignmentSelector(selectedId = "") {
    const selector = document.getElementById("reminderAssignment");

    if (!selector) return;

    selector.innerHTML = `
        <option value="">Select an assignment...</option>
    `;

    assignments.forEach(assignment => {
        const unitName = getUnitNameForAssignment(assignment);
        const option = document.createElement("option");

        option.value = assignment.id;
        option.textContent = `${assignment.title} — ${unitName}`;

        selector.appendChild(option);
    });

    selector.value = selectedId || "";

    updateLinkedUnitDisplay();
}

function updateLinkedUnitDisplay() {
    const selector = document.getElementById("reminderAssignment");
    const display = document.getElementById("linkedUnitDisplay");

    if (!selector || !display) return;

    const assignment = assignments.find(item =>
        String(item.id) === String(selector.value)
    );

    if (!assignment) {
        display.innerHTML = `
            <span class="muted">
                Select an assignment to see its linked unit.
            </span>
        `;

        return;
    }

    const unit = getUnitForAssignment(assignment);

    display.innerHTML = `
        <strong>Linked unit:</strong>
        ${escapeHTML(unit ? unit.unit_name : "No unit linked")}
    `;
}

function updateAssignmentLinkVisibility() {
    const category = document.getElementById("reminderCategory").value;
    const field = document.getElementById("assignmentLinkField");
    const selector = document.getElementById("reminderAssignment");

    if (!field || !selector) return;

    const isCoursework = category === "Coursework";

    field.hidden = !isCoursework;
    selector.required = isCoursework;

    if (!isCoursework) {
        selector.value = "";
        updateLinkedUnitDisplay();
    }
}

function handleAssignmentSelection() {
    const selector = document.getElementById("reminderAssignment");

    const assignment = assignments.find(item =>
        String(item.id) === String(selector.value)
    );

    updateLinkedUnitDisplay();

    if (assignment && assignment.deadline) {
        document.getElementById("reminderDate").value = assignment.deadline;
        updatePriorityFromDate();
    }
}


// ==========================================
// OPEN / CLOSE REMINDER MODAL
// ==========================================

function openReminderModal(reminder = null) {
    const modal = document.getElementById("reminderModal");
    const form = document.getElementById("reminderForm");

    if (!modal || !form) return;

    form.reset();

    editingReminderId = reminder ? reminder.id : null;

    document.getElementById("reminderId").value =
        reminder?.id || "";

    document.getElementById("reminderModalTitle").textContent =
        reminder ? "Edit Reminder" : "Add Reminder";

    document.getElementById("reminderTitle").value =
        reminder?.title || "";

    document.getElementById("reminderDescription").value =
        reminder?.description || "";

    document.getElementById("reminderDate").value =
        reminder?.due_date || getToday();

    document.getElementById("reminderCategory").value =
        reminder?.category || "Other";

    populateAssignmentSelector(reminder?.assignment_id || "");
    updateAssignmentLinkVisibility();
    updatePriorityFromDate();

    modal.hidden = false;
    document.body.classList.add("modal-open");

    document.getElementById("reminderTitle").focus();
}

function closeReminderModal() {
    const modal = document.getElementById("reminderModal");

    if (modal) modal.hidden = true;

    document.body.classList.remove("modal-open");

    editingReminderId = null;
}


// ==========================================
// SAVE PERSONAL REMINDER
// ==========================================

async function saveReminder(event) {
    event.preventDefault();

    const title = document.getElementById("reminderTitle").value.trim();
    const description = document.getElementById("reminderDescription").value.trim();
    const dueDate = document.getElementById("reminderDate").value;
    const category = document.getElementById("reminderCategory").value;

    const assignmentId = category === "Coursework"
        ? document.getElementById("reminderAssignment").value
        : null;

    if (!title || !dueDate) {
        showReminderToast("Please complete the required fields.", "error");
        return;
    }

    if (category === "Coursework" && !assignmentId) {
        showReminderToast(
            "Please select an assignment for this coursework reminder.",
            "error"
        );

        return;
    }

    const saveButton = document.getElementById("saveReminderBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const reminderData = {
        title,
        description,
        due_date: dueDate,
        category,
        priority: getAutomaticPriority(dueDate),
        assignment_id: assignmentId,
        user_id: currentUser.id
    };

    const wasEditing = Boolean(editingReminderId);

    try {
        let result;

        if (wasEditing) {
            result = await window.supabaseClient
                .from("reminders")
                .update({
                    ...reminderData,
                    updated_at: new Date().toISOString()
                })
                .eq("id", editingReminderId)
                .eq("user_id", currentUser.id);
        } else {
            result = await window.supabaseClient
                .from("reminders")
                .insert(reminderData);
        }

        if (result.error) throw result.error;

        closeReminderModal();

        await loadAllReminders();

        showReminderToast(
            wasEditing
                ? "Reminder updated successfully."
                : "Reminder added successfully."
        );

    } catch (error) {
        console.error("Saving reminder error:", error);

        showReminderToast(
            "Unable to save reminder. Please try again.",
            "error"
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Reminder";
    }
}


// ==========================================
// EDIT REMINDER
// ==========================================

function editReminder(id) {
    const reminder = personalReminders.find(item =>
        String(item.id) === String(id)
    );

    if (!reminder) {
        showReminderToast("Personal reminder could not be found.", "error");
        return;
    }

    openReminderModal(reminder);
}


// ==========================================
// DELETE REMINDER
// ==========================================

function openDeleteModal(id) {
    deletingReminderId = id;

    document.getElementById("deleteReminderModal").hidden = false;
    document.body.classList.add("modal-open");
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteReminderModal");

    if (modal) modal.hidden = true;

    document.body.classList.remove("modal-open");

    deletingReminderId = null;
}

async function confirmDeleteReminder() {
    if (!deletingReminderId) return;

    const button = document.getElementById("confirmDeleteBtn");

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        const { error } = await window.supabaseClient
            .from("reminders")
            .delete()
            .eq("id", deletingReminderId)
            .eq("user_id", currentUser.id);

        if (error) throw error;

        closeDeleteModal();

        await loadAllReminders();

        showReminderToast("Reminder deleted successfully.");

    } catch (error) {
        console.error("Delete reminder error:", error);

        showReminderToast("Unable to delete reminder.", "error");

    } finally {
        button.disabled = false;
        button.textContent = "Delete Reminder";
    }
}


// ==========================================
// COMPLETE / REOPEN REMINDER
// ==========================================

async function toggleReminder(id, type) {
    try {
        if (type === "assignment") {
            const assignment = assignments.find(item =>
                String(item.id) === String(id)
            );

            if (!assignment) return;

            const willComplete = !isReminderCompleted(assignment);

            const updateData = {
                completed: willComplete,
                status: willComplete ? "Completed" : "In Progress",
                submitted_at: willComplete
                    ? new Date().toISOString()
                    : null
            };

            const { error } = await window.supabaseClient
                .from("assignments")
                .update(updateData)
                .eq("id", id)
                .eq("user_id", currentUser.id);

            if (error) throw error;

        } else {
            const reminder = personalReminders.find(item =>
                String(item.id) === String(id)
            );

            if (!reminder) return;

            const { error } = await window.supabaseClient
                .from("reminders")
                .update({
                    completed: !isReminderCompleted(reminder),
                    updated_at: new Date().toISOString()
                })
                .eq("id", id)
                .eq("user_id", currentUser.id);

            if (error) throw error;
        }

        await loadAllReminders();

        showReminderToast("Reminder status updated.");

    } catch (error) {
        console.error("Reminder status error:", error);

        showReminderToast("Unable to update reminder.", "error");
    }
}


// ==========================================
// CALENDAR
// ==========================================

function renderCalendar() {
    const monthHeading = document.getElementById("calendarMonth");
    const calendarDays = document.getElementById("calendarDays");

    if (!monthHeading || !calendarDays) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    monthHeading.textContent = currentCalendarDate.toLocaleDateString(
        "en-GB",
        {
            month: "long",
            year: "numeric"
        }
    );

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const startingDay = (firstDay.getDay() + 6) % 7;

    const reminders = getAllReminders();

    let html = "";

    for (let i = 0; i < startingDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = getLocalDateString(
            new Date(year, month, day)
        );

        const dayReminders = reminders.filter(reminder =>
            reminder.due_date === date
        );

        const isToday = date === getToday();
        const isSelected = date === selectedCalendarDate;

        const titleHTML = dayReminders.slice(0, 2).map(reminder => {
            const urgencyClass = getCalendarUrgencyClass(reminder);

            let eventClass = "personal-title";

            if (reminder.type === "assignment") {
                eventClass = "assignment-title";
            } else if (reminder.type === "calendar") {
                eventClass = "calendar-personal-title";
            }

            return `
                <span
                    class="calendar-day-title ${eventClass} ${urgencyClass}"
                    title="${escapeHTML(reminder.title)}"
                >
                    ${escapeHTML(reminder.title)}
                </span>
            `;
        }).join("");

        const remainingCount = dayReminders.length - 2;

        html += `
            <button
                type="button"
                class="calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${dayReminders.length ? "has-reminders" : ""}"
                data-date="${date}"
                aria-label="${escapeHTML(formatDate(date))}, ${dayReminders.length} reminders"
                aria-pressed="${isSelected}"
            >

                <span class="calendar-day-number">${day}</span>

                <span class="calendar-day-titles">
                    ${titleHTML}
                </span>

                ${remainingCount > 0 ? `
                    <span class="calendar-day-more">
                        +${remainingCount} more
                    </span>
                ` : ""}

            </button>
        `;
    }

    const totalCells = startingDay + daysInMonth;
    const trailingDays = (7 - (totalCells % 7)) % 7;

    for (let i = 0; i < trailingDays; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    calendarDays.innerHTML = html;

    renderSelectedDate();
}

function renderSelectedDate() {
    const heading = document.getElementById("selectedDateHeading");
    const container = document.getElementById("selectedDateReminders");

    if (!heading || !container) return;

    if (!selectedCalendarDate) {
        heading.textContent = "Select a date";

        container.innerHTML = `
            <p class="muted">
                Select a day to view its reminders.
            </p>
        `;

        return;
    }

    heading.textContent = formatDate(selectedCalendarDate);

    const reminders = getAllReminders().filter(reminder =>
        reminder.due_date === selectedCalendarDate
    );

    if (!reminders.length) {
        container.innerHTML = `
            <p class="muted">
                No reminders scheduled for this date.
            </p>
        `;

        return;
    }

    container.innerHTML = reminders
        .map(reminder => createReminderCard(reminder))
        .join("");
}

function changeCalendarMonth(amount) {
    currentCalendarDate = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() + amount,
        1
    );

    renderCalendar();
}


// ==========================================
// VIEW SWITCHING
// ==========================================

function setReminderView(view) {
    const listView = document.getElementById("reminderListView");
    const calendarView = document.getElementById("reminderCalendarView");

    const listButton = document.getElementById("listViewBtn");
    const calendarButton = document.getElementById("calendarViewBtn");

    if (!listView || !calendarView || !listButton || !calendarButton) {
        console.error("Reminder view elements could not be found.");
        return;
    }

    const isList = view === "list";

    listView.hidden = !isList;
    calendarView.hidden = isList;

    listButton.classList.toggle("active", isList);
    calendarButton.classList.toggle("active", !isList);

    if (!isList) {
        renderCalendar();
    }
}


// ==========================================
// EVENT LISTENERS
// ==========================================

function initialiseReminderEvents() {

    const addReminderBtn = document.getElementById("addReminderBtn");
    const closeReminderBtn = document.getElementById("closeReminderModal");
    const cancelReminderBtn = document.getElementById("cancelReminderBtn");
    const reminderForm = document.getElementById("reminderForm");

    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    const listViewBtn = document.getElementById("listViewBtn");
    const calendarViewBtn = document.getElementById("calendarViewBtn");

    const previousMonthBtn = document.getElementById("previousMonthBtn");
    const nextMonthBtn = document.getElementById("nextMonthBtn");

    const reminderSearch = document.getElementById("reminderSearch");
    const reminderFilter = document.getElementById("reminderFilter");
    const categoryFilter = document.getElementById("categoryFilter");

    const reminderCategory = document.getElementById("reminderCategory");
    const reminderAssignment = document.getElementById("reminderAssignment");
    const reminderDate = document.getElementById("reminderDate");

    addReminderBtn?.addEventListener("click", () => openReminderModal());
    closeReminderBtn?.addEventListener("click", closeReminderModal);
    cancelReminderBtn?.addEventListener("click", closeReminderModal);

    reminderForm?.addEventListener("submit", saveReminder);

    cancelDeleteBtn?.addEventListener("click", closeDeleteModal);
    confirmDeleteBtn?.addEventListener("click", confirmDeleteReminder);

    listViewBtn?.addEventListener("click", () => setReminderView("list"));
    calendarViewBtn?.addEventListener("click", () => setReminderView("calendar"));

    previousMonthBtn?.addEventListener("click", () => changeCalendarMonth(-1));
    nextMonthBtn?.addEventListener("click", () => changeCalendarMonth(1));

    reminderSearch?.addEventListener("input", renderReminders);
    reminderFilter?.addEventListener("change", renderReminders);
    categoryFilter?.addEventListener("change", renderReminders);

    reminderCategory?.addEventListener("change", updateAssignmentLinkVisibility);
    reminderAssignment?.addEventListener("change", handleAssignmentSelection);
    reminderDate?.addEventListener("change", updatePriorityFromDate);


    document.addEventListener("click", event => {

        const target = event.target;

        if (!(target instanceof Element)) return;

        const button = target.closest("[data-action]");

        if (button) {
            const action = button.dataset.action;
            const id = button.dataset.id;
            const type = button.dataset.type;

            if (action === "edit") editReminder(id);
            if (action === "delete") openDeleteModal(id);
            if (action === "toggle") toggleReminder(id, type);
            if (action === "view") openPreviousReminderView(id, type);
            if (action === "close-view") closePreviousReminderView();

            return;
        }

        const viewModal = document.getElementById(
            "previousReminderViewModal"
        );

        if (viewModal && target === viewModal) {
            closePreviousReminderView();
            return;
        }

        const calendarDay = target.closest(
            ".calendar-day[data-date]"
        );

        if (calendarDay) {
            selectedCalendarDate = calendarDay.dataset.date;
            renderCalendar();
        }
    });


    document.getElementById("reminderModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "reminderModal") {
                closeReminderModal();
            }
        });

    document.getElementById("deleteReminderModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "deleteReminderModal") {
                closeDeleteModal();
            }
        });


    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeReminderModal();
            closeDeleteModal();
            closePreviousReminderView();
        }
    });
}


// ==========================================
// INITIALISE
// ==========================================

async function initialiseReminders() {

    try {
        const { data, error } = await window.supabaseClient.auth.getUser();

        if (error) throw error;

        currentUser = data.user;

        if (!currentUser) {
            window.location.href = "login.html";
            return;
        }

        initialiseReminderEvents();

        await loadAllReminders();

        setReminderView("list");

        console.log("CollegeHub Reminders loaded successfully.");

    } catch (error) {
        console.error("Reminders initialisation error:", error);

        const reminderList = document.getElementById("reminderList");

        if (reminderList) {
            reminderList.innerHTML = `
                <div class="reminder-empty">
                    <h3>Unable to load reminders</h3>
                    <p class="muted">
                        Please refresh the page or try again later.
                    </p>
                </div>
            `;
        }

        showReminderToast("Unable to load reminders.", "error");
    }
}


// ==========================================
// START
// ==========================================

document.addEventListener("DOMContentLoaded", initialiseReminders);

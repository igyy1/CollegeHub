
/* ============================= */
/* COLLEGEHUB CALENDAR */
/* ============================= */

let calendarDate = new Date();
let selectedDate = new Date();

let calendarAssignments = [];
let calendarReminders = [];
let calendarPersonalEvents = [];

let activeCalendarEvent = null;
let editingCalendarEvent = null;
let calendarToastTimeout = null;
let deleteConfirmationCallback = null;

/* ============================= */
/* INITIALISE */
/* ============================= */

document.addEventListener("DOMContentLoaded", initialiseCalendar);

async function initialiseCalendar() {

    if (!window.supabaseClient) {
        console.error("Supabase client not found.");
        return;
    }

    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    await loadCalendarEvents();

    document.getElementById("previousMonthBtn")
        ?.addEventListener("click", () => changeMonth(-1));

    document.getElementById("nextMonthBtn")
        ?.addEventListener("click", () => changeMonth(1));

    document.getElementById("todayBtn")
        ?.addEventListener("click", goToToday);

    document.getElementById("addCalendarEventBtn")
        ?.addEventListener("click", openAddCalendarEvent);

    document.getElementById("closeAddCalendarEvent")
        ?.addEventListener("click", closeAddCalendarEvent);

    document.getElementById("cancelAddCalendarEvent")
        ?.addEventListener("click", closeAddCalendarEvent);

    document.getElementById("addCalendarEventModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "addCalendarEventModal") {
                closeAddCalendarEvent();
            }
        });

    document.getElementById("addCalendarEventForm")
        ?.addEventListener("submit", saveCalendarEvent);

    document.getElementById("closeCalendarEvent")
        ?.addEventListener("click", closeCalendarEvent);

    document.getElementById("editCalendarEventBtn")
        ?.addEventListener("click", editCalendarEvent);

    document.getElementById("deleteCalendarEventBtn")
        ?.addEventListener("click", deleteCalendarEvent);

    document.getElementById("calendarEventModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "calendarEventModal") {
                closeCalendarEvent();
            }
        });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeCalendarEvent();
            closeAddCalendarEvent();
            closeDeleteConfirmation();
        }
    });
}

/* ============================= */
/* NOTIFICATIONS */
/* ============================= */

function showCalendarToast(message, type = "success") {

    const toast = document.getElementById("collegeHubToast");

    if (!toast) {
        console.log(message);
        return;
    }

    clearTimeout(calendarToastTimeout);

    toast.textContent = message;
    toast.hidden = false;

    toast.style.position = "fixed";
    toast.style.right = "24px";
    toast.style.bottom = "24px";
    toast.style.zIndex = "2000";
    toast.style.display = "block";
    toast.style.padding = "14px 20px";
    toast.style.borderRadius = "10px";
    toast.style.border = "1px solid var(--border)";
    toast.style.background = "var(--surface)";
    toast.style.color = "var(--text-primary)";
    toast.style.boxShadow = "0 8px 25px var(--shadow)";
    toast.style.maxWidth = "min(400px, calc(100vw - 32px))";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "600";

    toast.style.borderLeft = type === "error"
        ? "4px solid #dc5555"
        : "4px solid var(--accent)";

    toast.classList.add("show");

    calendarToastTimeout = setTimeout(() => {
        toast.classList.remove("show");
        toast.hidden = true;
    }, 3500);
}

/* ============================= */
/* LOAD EVENTS */
/* ============================= */

async function loadCalendarEvents() {

    const { data: userData, error: userError } =
        await window.supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        window.location.href = "login.html";
        return;
    }

    const userId = userData.user.id;

    const [
        assignmentResult,
        reminderResult,
        personalEventResult
    ] = await Promise.all([

        window.supabaseClient
            .from("assignments")
            .select("*")
            .eq("user_id", userId)
            .order("deadline", { ascending: true }),

        window.supabaseClient
            .from("reminders")
            .select("*")
            .eq("user_id", userId)
            .order("due_date", { ascending: true }),

        window.supabaseClient
            .from("calendar_events")
            .select("*")
            .eq("user_id", userId)
            .order("event_date", { ascending: true })

    ]);

    if (assignmentResult.error) {
        console.error("Assignments error:", assignmentResult.error);
    }

    if (reminderResult.error) {
        console.error("Reminders error:", reminderResult.error);
    }

    if (personalEventResult.error) {
        console.error("Calendar events error:", personalEventResult.error);
    }

    calendarAssignments = assignmentResult.data || [];

    calendarReminders = (reminderResult.data || [])
        .filter(reminder => !reminder.assignment_id);

    calendarPersonalEvents = personalEventResult.data || [];

    renderCalendar();
    renderSelectedDateEvents();
    renderUpcomingEvents();
}

/* ============================= */
/* DATE HELPERS */
/* ============================= */

function getLocalDateString(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatCalendarDate(dateString) {

    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        "en-GB",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}

function isEventCompleted(item) {

    return item.completed === true ||
        item.status === "Completed";
}

/* ============================= */
/* GET ALL EVENTS */
/* ============================= */

function getAllCalendarEvents() {

    const assignments = calendarAssignments.map(item => ({
        id: item.id,
        title: item.title,
        type: "assignment",
        category: "Assignment",
        completed: isEventCompleted(item),
        date: item.deadline,
        subject: item.subject || "Unassigned",
        description: ""
    }));

    const reminders = calendarReminders.map(item => ({
        id: item.id,
        title: item.title,
        type: "reminder",
        category: item.category || "Reminder",
        completed: isEventCompleted(item),
        date: item.due_date,
        subject: item.category || "Reminder",
        description: item.description || ""
    }));

    const personalEvents = calendarPersonalEvents.map(item => ({
        id: item.id,
        title: item.title,
        type: "calendar",
        category: item.category || "Other",
        completed: item.completed === true,
        date: item.event_date,
        subject: item.category || "Other",
        description: item.description || ""
    }));

    return [
        ...assignments,
        ...reminders,
        ...personalEvents
    ];
}

function getEventsForDate(dateString) {

    return getAllCalendarEvents()
        .filter(event => event.date === dateString);
}

/* ============================= */
/* HTML ESCAPING */
/* ============================= */

function escapeCalendarHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

/* ============================= */
/* SIDEPANEL EVENT ITEM */
/* ============================= */

function createCalendarSidePanelItem(event, dateLabel = "") {

    const eventElement = document.createElement("div");

    eventElement.className = "calendar-event-item";
    eventElement.style.cursor = "pointer";
    eventElement.title = "Click to view details";

    const title = document.createElement("strong");
    title.textContent = event.title;

    eventElement.appendChild(title);

    const descriptionText = event.description?.trim();

    if (descriptionText) {

        const description = document.createElement("small");

        description.textContent = descriptionText;
        description.style.display = "block";
        description.style.marginTop = "4px";
        description.style.color = "var(--text-secondary)";
        description.style.fontSize = "12px";
        description.style.lineHeight = "1.5";
        description.style.whiteSpace = "normal";
        description.style.overflowWrap = "anywhere";

        eventElement.appendChild(description);
    }

    if (dateLabel) {

        const date = document.createElement("small");

        date.textContent = dateLabel;
        date.style.display = "block";
        date.style.marginTop = "5px";
        date.style.color = "var(--text-secondary)";

        eventElement.appendChild(date);
    }

    eventElement.addEventListener("click", () => {
        openCalendarEvent(event);
    });

    return eventElement;
}

/* ============================= */
/* VIEW EVENT DETAILS */
/* ============================= */

function openCalendarEvent(event) {

    const modal = document.getElementById("calendarEventModal");
    const title = document.getElementById("calendarEventTitle");
    const details = document.getElementById("calendarEventDetails");

    const editButton = document.getElementById("editCalendarEventBtn");
    const deleteButton = document.getElementById("deleteCalendarEventBtn");

    if (!modal || !title || !details) return;

    activeCalendarEvent = event;

    title.textContent = event.title;

    const typeLabels = {
        assignment: "Assignment",
        reminder: "Reminder",
        calendar: "Calendar Event"
    };

    const fields = [
        ["Type", typeLabels[event.type] || "Event"],
        ["Date", formatCalendarDate(event.date)]
    ];

    if (event.type === "calendar") {
        fields.push(["Category", event.category || "Other"]);
    } else {
        fields.push([
            "Category / Subject",
            event.subject || "Not specified"
        ]);
    }

    fields.push([
        "Status",
        event.completed
            ? "Completed"
            : event.type === "calendar"
                ? "Scheduled"
                : "Outstanding"
    ]);

    if (event.description) {
        fields.push(["Description", event.description]);
    }

    details.innerHTML = fields.map(([label, value]) => `
        <div class="calendar-event-detail">
            <small>${escapeCalendarHTML(label)}</small>
            <p>${escapeCalendarHTML(value)}</p>
        </div>
    `).join("");

    if (editButton) {
        editButton.hidden = event.type === "reminder";
        editButton.disabled = false;
        editButton.textContent = "Edit Event";
    }

    if (deleteButton) {
        deleteButton.hidden = false;
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete Event";
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
}

/* ============================= */
/* CLOSE EVENT DETAILS */
/* ============================= */

function closeCalendarEvent() {

    const modal = document.getElementById("calendarEventModal");

    if (modal) {
        modal.hidden = true;
    }

    activeCalendarEvent = null;

    document.body.classList.remove("modal-open");
}

/* ============================= */
/* DELETE CONFIRMATION MODAL */
/* ============================= */

function createDeleteConfirmation() {

    let modal = document.getElementById("calendarDeleteConfirmation");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "calendarDeleteConfirmation";
    modal.hidden = true;

    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "3000";
    modal.style.background = "rgba(0, 0, 0, 0.55)";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.padding = "20px";

    modal.innerHTML = `
        <div style="
            width: 100%;
            max-width: 420px;
            padding: 26px;
            border-radius: 14px;
            background: var(--surface);
            color: var(--text-primary);
            border: 1px solid var(--border);
            box-shadow: 0 15px 45px var(--shadow);
        ">

            <p style="
                color: var(--accent);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1px;
                margin: 0 0 10px;
            ">DELETE EVENT</p>

            <h2 style="
                font-size: 20px;
                margin: 0 0 12px;
                color: var(--text-primary);
            ">Are you sure?</h2>

            <p id="calendarDeleteMessage" style="
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-secondary);
                margin: 0 0 24px;
            "></p>

            <div style="
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                flex-wrap: wrap;
            ">

                <button
                    type="button"
                    id="cancelCalendarDelete"
                    class="secondary-button">
                    Cancel
                </button>

                <button
                    type="button"
                    id="confirmCalendarDelete"
                    class="secondary-button danger">
                    Delete Event
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeDeleteConfirmation();
        }
    });

    document.getElementById("cancelCalendarDelete")
        .addEventListener("click", closeDeleteConfirmation);

    document.getElementById("confirmCalendarDelete")
        .addEventListener("click", confirmDeleteCalendarEvent);

    return modal;
}

function showDeleteConfirmation(event, callback) {

    const modal = createDeleteConfirmation();

    const message = document.getElementById("calendarDeleteMessage");

    message.textContent =
        `Are you sure you want to delete "${event.title}"? This action cannot be undone.`;

    deleteConfirmationCallback = callback;

    modal.hidden = false;
    modal.style.display = "flex";

    document.body.classList.add("modal-open");
}

function closeDeleteConfirmation() {

    const modal = document.getElementById("calendarDeleteConfirmation");

    if (modal) {
        modal.hidden = true;
        modal.style.display = "none";
    }

    deleteConfirmationCallback = null;

    document.body.classList.remove("modal-open");
}

function confirmDeleteCalendarEvent() {

    if (!deleteConfirmationCallback) return;

    const callback = deleteConfirmationCallback;

    closeDeleteConfirmation();

    callback();
}

/* ============================= */
/* EDIT EVENT */
/* ============================= */

function editCalendarEvent() {

    if (!activeCalendarEvent) return;

    if (activeCalendarEvent.type === "reminder") {
        showCalendarToast(
            "Please edit reminders from the Reminders page.",
            "error"
        );
        return;
    }

    editingCalendarEvent = { ...activeCalendarEvent };

    const event = editingCalendarEvent;

    const modal = document.getElementById("addCalendarEventModal");
    const form = document.getElementById("addCalendarEventForm");

    const titleInput = document.getElementById("calendarEventName");
    const dateInput = document.getElementById("calendarEventDate");
    const categoryInput = document.getElementById("calendarEventCategory");
    const descriptionInput = document.getElementById("calendarEventDescription");

    const modalHeading = modal?.querySelector(".calendar-event-header h2");
    const submitButton = form?.querySelector('button[type="submit"]');

    if (!modal || !form || !titleInput || !dateInput) return;

    form.reset();

    titleInput.value = event.title || "";
    dateInput.value = event.date || "";

    if (descriptionInput) {
        descriptionInput.value = event.description || "";
    }

    if (categoryInput) {
        categoryInput.value = event.type === "assignment"
            ? "Assignment"
            : event.category || "Other";

        categoryInput.disabled = event.type === "assignment";
    }

    if (modalHeading) {
        modalHeading.textContent = "Edit Calendar Event";
    }

    if (submitButton) {
        submitButton.textContent = "Save Changes";
    }

    closeCalendarEvent();

    modal.hidden = false;
    document.body.classList.add("modal-open");

    titleInput.focus();
}

/* ============================= */
/* ADD EVENT MODAL */
/* ============================= */

function openAddCalendarEvent() {

    editingCalendarEvent = null;

    const modal = document.getElementById("addCalendarEventModal");
    const dateInput = document.getElementById("calendarEventDate");
    const form = document.getElementById("addCalendarEventForm");

    const modalHeading = modal?.querySelector(".calendar-event-header h2");
    const submitButton = form?.querySelector('button[type="submit"]');

    const categoryInput = document.getElementById("calendarEventCategory");

    if (!modal) return;

    form?.reset();

    if (dateInput) {
        dateInput.value = getLocalDateString(selectedDate);
    }

    if (categoryInput) {
        categoryInput.hidden = false;
        categoryInput.disabled = false;
    }

    if (modalHeading) {
        modalHeading.textContent = "Add Calendar Event";
    }

    if (submitButton) {
        submitButton.textContent = "Save Event";
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeAddCalendarEvent() {

    const modal = document.getElementById("addCalendarEventModal");
    const form = document.getElementById("addCalendarEventForm");

    const modalHeading = modal?.querySelector(".calendar-event-header h2");
    const submitButton = form?.querySelector('button[type="submit"]');

    const categoryInput = document.getElementById("calendarEventCategory");

    if (modal) {
        modal.hidden = true;
    }

    form?.reset();

    editingCalendarEvent = null;

    if (categoryInput) {
        categoryInput.hidden = false;
        categoryInput.disabled = false;
    }

    if (modalHeading) {
        modalHeading.textContent = "Add Calendar Event";
    }

    if (submitButton) {
        submitButton.textContent = "Save Event";
        submitButton.disabled = false;
    }

    document.body.classList.remove("modal-open");
}

/* ============================= */
/* SAVE / UPDATE EVENT */
/* ============================= */

async function saveCalendarEvent(event) {

    event.preventDefault();

    const form = document.getElementById("addCalendarEventForm");
    const saveButton = form?.querySelector('button[type="submit"]');

    const title = document.getElementById("calendarEventName")?.value.trim();
    const date = document.getElementById("calendarEventDate")?.value;
    const category = document.getElementById("calendarEventCategory")?.value;

    const description =
        document.getElementById("calendarEventDescription")?.value.trim() || "";

    const original = editingCalendarEvent
        ? { ...editingCalendarEvent }
        : null;

    const isEditing = original !== null;

    if (!title || !date || (!isEditing && !category)) {
        showCalendarToast("Please complete the required fields.", "error");
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = isEditing ? "Saving Changes..." : "Saving...";
    }

    try {

        const { data: userData, error: userError } =
            await window.supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            throw new Error("Your session has expired. Please log in again.");
        }

        const userId = userData.user.id;

        let result;

        if (isEditing && original.type === "assignment") {

            result = await window.supabaseClient
                .from("assignments")
                .update({
                    title: title,
                    deadline: date
                })
                .eq("id", original.id)
                .eq("user_id", userId);

        } else if (isEditing && original.type === "calendar") {

            result = await window.supabaseClient
                .from("calendar_events")
                .update({
                    title: title,
                    event_date: date,
                    category: category,
                    description: description
                })
                .eq("id", original.id)
                .eq("user_id", userId);

        } else if (!isEditing && category === "Assignment") {

            result = await window.supabaseClient
                .from("assignments")
                .insert({
                    user_id: userId,
                    coursework_id: null,
                    title: title,
                    subject: "Unassigned",
                    deadline: date,
                    completed: false,
                    status: "Not Started"
                });

        } else if (!isEditing) {

            result = await window.supabaseClient
                .from("calendar_events")
                .insert({
                    user_id: userId,
                    title: title,
                    description: description,
                    event_date: date,
                    category: category
                });

        } else {

            throw new Error("This event cannot be edited here.");
        }

        if (result.error) {
            throw result.error;
        }

        const [year, month, day] = date.split("-").map(Number);

        selectedDate = new Date(year, month - 1, day);
        calendarDate = new Date(year, month - 1, 1);

        closeAddCalendarEvent();

        await loadCalendarEvents();

        showCalendarToast(
            isEditing
                ? "Event updated successfully."
                : "Event saved successfully."
        );

    } catch (error) {

        console.error("Calendar save error:", error);

        showCalendarToast(
            isEditing
                ? "Your changes could not be saved. Please try again."
                : "Your event could not be saved. Please try again.",
            "error"
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Event";
        }
    }
}

/* ============================= */
/* DELETE EVENT */
/* ============================= */

function deleteCalendarEvent() {

    if (!activeCalendarEvent) return;

    const eventToDelete = { ...activeCalendarEvent };

    showDeleteConfirmation(eventToDelete, async () => {
        await performCalendarDeletion(eventToDelete);
    });
}

async function performCalendarDeletion(eventToDelete) {

    const deleteButton = document.getElementById("deleteCalendarEventBtn");

    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";
    }

    try {

        const { data: userData, error: userError } =
            await window.supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            throw new Error("Your session has expired.");
        }

        const userId = userData.user.id;

        const table = {
            assignment: "assignments",
            reminder: "reminders",
            calendar: "calendar_events"
        }[eventToDelete.type];

        if (!table) {
            throw new Error("Unknown event type.");
        }

        const { error } = await window.supabaseClient
            .from(table)
            .delete()
            .eq("id", eventToDelete.id)
            .eq("user_id", userId);

        if (error) {
            throw error;
        }

        closeCalendarEvent();

        await loadCalendarEvents();

        showCalendarToast("Event deleted successfully.");

    } catch (error) {

        console.error("Calendar deletion error:", error);

        showCalendarToast(
            "Unable to delete this event. Please try again.",
            "error"
        );

        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete Event";
        }
    }
}

/* ============================= */
/* RENDER MONTH */
/* ============================= */

function renderCalendar() {

    const monthHeading = document.getElementById("calendarMonth");
    const calendarDays = document.getElementById("calendarDays");

    if (!monthHeading || !calendarDays) return;

    monthHeading.textContent = calendarDate.toLocaleDateString(
        "en-GB",
        {
            month: "long",
            year: "numeric"
        }
    );

    calendarDays.innerHTML = "";

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDay = firstDay.getDay();

    startingDay = startingDay === 0 ? 6 : startingDay - 1;

    const daysInMonth = lastDay.getDate();

    for (let i = 0; i < startingDay; i++) {

        const emptyDay = document.createElement("div");

        emptyDay.className = "calendar-day empty";

        calendarDays.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const date = new Date(year, month, day);
        const dateString = getLocalDateString(date);

        const dayElement = document.createElement("button");

        dayElement.type = "button";
        dayElement.className = "calendar-day";

        if (dateString === getLocalDateString(new Date())) {
            dayElement.classList.add("today");
        }

        if (dateString === getLocalDateString(selectedDate)) {
            dayElement.classList.add("selected");
        }

        const number = document.createElement("span");

        number.className = "calendar-day-number";
        number.textContent = day;

        dayElement.appendChild(number);

        const events = getEventsForDate(dateString);

        events.slice(0, 3).forEach(event => {

            const eventElement = document.createElement("span");

            eventElement.className = "calendar-event";

            if (event.completed) {
                eventElement.classList.add("completed-event");
            } else if (event.type === "assignment") {
                eventElement.classList.add("assignment-event");
            } else if (event.type === "calendar") {
                eventElement.classList.add("personal-event");
            } else {
                eventElement.classList.add("reminder-event");
            }

            eventElement.textContent = event.title;
            eventElement.title = "Click to view details";

            eventElement.addEventListener("click", clickEvent => {
                clickEvent.stopPropagation();
                openCalendarEvent(event);
            });

            dayElement.appendChild(eventElement);
        });

        if (events.length > 3) {

            const moreElement = document.createElement("span");

            moreElement.className = "calendar-event";
            moreElement.textContent = `+${events.length - 3} more`;

            dayElement.appendChild(moreElement);
        }

        dayElement.addEventListener("click", () => {

            selectedDate = date;

            renderCalendar();
            renderSelectedDateEvents();
        });

        calendarDays.appendChild(dayElement);
    }
}

/* ============================= */
/* SELECTED DATE EVENTS */
/* ============================= */

function renderSelectedDateEvents() {

    const heading = document.getElementById("selectedDateHeading");
    const container = document.getElementById("selectedDateEvents");

    if (!heading || !container) return;

    const dateString = getLocalDateString(selectedDate);
    const events = getEventsForDate(dateString);

    heading.textContent = formatCalendarDate(dateString);

    container.innerHTML = "";

    if (events.length === 0) {

        container.innerHTML = `
            <p class="muted">Nothing scheduled for this date.</p>
        `;

        return;
    }

    events.forEach(event => {

        container.appendChild(
            createCalendarSidePanelItem(event)
        );
    });
}

/* ============================= */
/* UPCOMING EVENTS */
/* ============================= */

function renderUpcomingEvents() {

    const container = document.getElementById("upcomingEvents");

    if (!container) return;

    container.innerHTML = "";

    const today = getLocalDateString(new Date());

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const endDate = getLocalDateString(sevenDaysLater);

    const upcoming = getAllCalendarEvents()
        .filter(event =>
            event.date &&
            event.date >= today &&
            event.date <= endDate &&
            !event.completed
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8);

    if (upcoming.length === 0) {

        container.innerHTML = `
            <p class="muted">No outstanding events in the next 7 days.</p>
        `;

        return;
    }

    upcoming.forEach(event => {

        container.appendChild(
            createCalendarSidePanelItem(
                event,
                formatCalendarDate(event.date)
            )
        );
    });
}

/* ============================= */
/* MONTH CONTROLS */
/* ============================= */

function changeMonth(amount) {

    calendarDate.setMonth(calendarDate.getMonth() + amount);

    selectedDate = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth(),
        1
    );

    renderCalendar();
    renderSelectedDateEvents();
}

function goToToday() {

    calendarDate = new Date();
    selectedDate = new Date();

    renderCalendar();
    renderSelectedDateEvents();
}

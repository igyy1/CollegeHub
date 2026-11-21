
// COLLEGEHUB - SECURE ASSIGNMENT MANAGER

let assignments = [];
let currentUser = null;


// CALCULATE DAYS REMAINING
function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round(
        (due - today) / (1000 * 60 * 60 * 24)
    );
}


// PROTECT USER-ENTERED TEXT
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// LOAD ASSIGNMENTS FROM SUPABASE
async function loadAssignments() {

    const { data, error } = await supabaseClient
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

    if (error) {
        console.error(error);
        alert("Could not load assignments: " + error.message);
        return;
    }

    assignments = data || [];

    renderAssignments();
}


// DISPLAY ASSIGNMENTS
function renderAssignments() {

    const list = document.getElementById("assignmentList");
    const search = document.getElementById("searchInput").value.toLowerCase();

    list.innerHTML = "";

    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    assignments.forEach(assignment => {

        if (assignment.completed) {
            completed++;
        } else {
            inProgress++;

            if (getDaysRemaining(assignment.deadline) < 0) {
                overdue++;
            }
        }

        const matchesSearch =
            assignment.title.toLowerCase().includes(search) ||
            assignment.subject.toLowerCase().includes(search);

        if (!matchesSearch) return;

        const days = getDaysRemaining(assignment.deadline);

        let status;

        if (assignment.completed) {
            status = "COMPLETED";
        } else if (days < 0) {
            status = "OVERDUE";
        } else if (days === 0) {
            status = "DUE TODAY";
        } else {
            status = days + " DAYS LEFT";
        }

        list.innerHTML += `
            <div class="assignment">

                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>
                    <p>${escapeHTML(assignment.subject)}</p>
                    <p>Deadline: ${new Date(
                        assignment.deadline + "T00:00:00"
                    ).toLocaleDateString("en-GB")}</p>
                </div>

                <div>
                    <span class="deadline-status">${status}</span>
                    <br><br>

                    ${!assignment.completed ? `
                        <button class="complete-btn"
                            data-id="${escapeHTML(assignment.id)}">
                            Complete
                        </button>
                    ` : ""}

                    <button class="delete-btn"
                        data-id="${escapeHTML(assignment.id)}">
                        Delete
                    </button>
                </div>

            </div>
        `;
    });

    if (list.innerHTML === "") {
        list.innerHTML = "<p class='muted'>No assignments found.</p>";
    }

    document.getElementById("totalCount").textContent = assignments.length;
    document.getElementById("progressCount").textContent = inProgress;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("overdueCount").textContent = overdue;
}


// COMPLETE ASSIGNMENT
async function completeAssignment(id) {

    const { error } = await supabaseClient
        .from("assignments")
        .update({ completed: true })
        .eq("id", id);

    if (error) {
        alert("Could not complete assignment: " + error.message);
        return;
    }

    await loadAssignments();
}


// DELETE ASSIGNMENT
async function deleteAssignment(id) {

    if (!confirm("Are you sure you want to delete this assignment?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("assignments")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Could not delete assignment: " + error.message);
        return;
    }

    await loadAssignments();
}


// HANDLE ASSIGNMENT BUTTONS
document.getElementById("assignmentList").addEventListener("click", event => {

    const completeButton = event.target.closest(".complete-btn");
    const deleteButton = event.target.closest(".delete-btn");

    if (completeButton) {
        completeAssignment(completeButton.dataset.id);
    }

    if (deleteButton) {
        deleteAssignment(deleteButton.dataset.id);
    }

});


// SHOW AND HIDE FORM
document.getElementById("addAssignmentBtn").addEventListener("click", () => {

    document.getElementById("assignment-form").classList.toggle("hidden");

});


// ADD ASSIGNMENT
document.getElementById("new-assignment").addEventListener("submit", async event => {

    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const deadline = document.getElementById("deadline").value;

    if (!title || !subject || !deadline) {
        alert("Please complete all fields.");
        return;
    }

    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    if (deadline < localToday) {
        alert("Please choose a deadline that isn't in the past.");
        return;
    }

    const { error } = await supabaseClient
        .from("assignments")
        .insert({
            user_id: currentUser.id,
            title: title,
            subject: subject,
            deadline: deadline,
            completed: false
        });

    if (error) {
        alert("Could not save assignment: " + error.message);
        return;
    }

    event.target.reset();

    document.getElementById("assignment-form").classList.add("hidden");

    await loadAssignments();

});


// CHECK LOGIN AND START ASSIGNMENT MANAGER
async function initialiseAssignments() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = data.user;

    await loadAssignments();
}

initialiseAssignments();


// COLLEGEHUB - SECURE COURSEWORK SYSTEM

let units = [];
let currentUser = null;

// LOAD COURSEWORK FROM SUPABASE
async function loadUnits() {
    const { data, error } = await supabaseClient
        .from("coursework")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Coursework loading error:", error);
        alert("Could not load coursework: " + error.message);
        return;
    }

    units = data || [];
    renderCoursework();
}

// DISPLAY COURSEWORK
function renderCoursework() {
    const list = document.getElementById("courseworkList");

    list.innerHTML = "";

    let active = 0;
    let completed = 0;

    units.forEach(unit => {
        if (unit.status === "Completed") {
            completed++;
        } else {
            active++;
        }

        list.innerHTML += `
            <div class="assignment">
                <div>
                    <h3>${escapeHTML(unit.unit_name)}</h3>
                    <p>${escapeHTML(unit.subject)}</p>
                    <p>Target grade: ${escapeHTML(unit.target_grade)}</p>
                    <p>Status: ${escapeHTML(unit.status)}</p>
                </div>

                <div>
                    <button class="change-status-btn" data-id="${escapeHTML(unit.id)}">
                        Change Status
                    </button>

                    <button class="delete-unit-btn" data-id="${escapeHTML(unit.id)}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });

    if (units.length === 0) {
        list.innerHTML =
            "<p class='muted'>No coursework units added yet.</p>";
    }

    document.getElementById("totalUnits").textContent = units.length;
    document.getElementById("activeUnits").textContent = active;
    document.getElementById("completedUnits").textContent = completed;
}

// ADD COURSEWORK
document.getElementById("addUnitBtn").addEventListener("click", () => {
    document.getElementById("unitForm").classList.toggle("hidden");
});

// SUBMIT COURSEWORK FORM
document.getElementById("newUnit").addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("unitName").value.trim();
    const subject = document.getElementById("unitSubject").value.trim();
    const grade = document.getElementById("targetGrade").value;
    const status = document.getElementById("unitStatus").value;

    if (!name || !subject || !grade || !status) {
        alert("Please complete all fields.");
        return;
    }

    const { error } = await supabaseClient
        .from("coursework")
        .insert({
            user_id: currentUser.id,
            unit_name: name,
            subject: subject,
            target_grade: grade,
            status: status
        });

    if (error) {
        console.error(error);
        alert("Could not save coursework: " + error.message);
        return;
    }

    event.target.reset();
    document.getElementById("unitForm").classList.add("hidden");

    await loadUnits();
});

// HANDLE COURSEWORK BUTTONS
document.getElementById("courseworkList").addEventListener("click", event => {
    const changeButton = event.target.closest(".change-status-btn");
    const deleteButton = event.target.closest(".delete-unit-btn");

    if (changeButton) {
        changeStatus(changeButton.dataset.id);
    }

    if (deleteButton) {
        deleteUnit(deleteButton.dataset.id);
    }
});

// CHANGE COURSEWORK STATUS
async function changeStatus(id) {
    const unit = units.find(item => item.id === id);
    if (!unit) return;

    const statuses = [
        "Not Started",
        "In Progress",
        "Completed"
    ];

    const current = statuses.indexOf(unit.status);
    const nextStatus = statuses[(current + 1) % statuses.length];

    const { error } = await supabaseClient
        .from("coursework")
        .update({ status: nextStatus })
        .eq("id", id);

    if (error) {
        alert("Could not update status: " + error.message);
        return;
    }

    await loadUnits();
}

// DELETE COURSEWORK
async function deleteUnit(id) {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    const { error } = await supabaseClient
        .from("coursework")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Could not delete coursework: " + error.message);
        return;
    }

    await loadUnits();
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

// CHECK LOGIN AND START COURSEWORK MANAGER
async function initialiseCoursework() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = data.user;
    await loadUnits();
}

initialiseCoursework();

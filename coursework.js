
// COLLEGEHUB - COURSEWORK SYSTEM

let units = JSON.parse(
    localStorage.getItem("collegeCoursework")
) || [];

// Save coursework
function saveUnits() {
    localStorage.setItem(
        "collegeCoursework",
        JSON.stringify(units)
    );

    renderCoursework();
}

// Display coursework
function renderCoursework() {

    const list = document.getElementById("courseworkList");

    list.innerHTML = "";

    let active = 0;
    let completed = 0;

    units.forEach((unit, index) => {

        if (unit.status === "Completed") {
            completed++;
        } else {
            active++;
        }

        list.innerHTML += `
            <div class="assignment">

                <div>
                    <h3>${escapeHTML(unit.name)}</h3>
                    <p>${escapeHTML(unit.subject)}</p>
                    <p>Target grade: ${escapeHTML(unit.grade)}</p>
                    <p>Status: ${escapeHTML(unit.status)}</p>
                </div>

                <div>
                    <button onclick="changeStatus(${index})">
                        Change Status
                    </button>

                    <button onclick="deleteUnit(${index})">
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

// Add coursework
document.getElementById("addUnitBtn").addEventListener("click", () => {

    document.getElementById("unitForm").classList.toggle("hidden");

});

// Submit coursework form
document.getElementById("newUnit").addEventListener("submit", event => {

    event.preventDefault();

    const name = document.getElementById("unitName").value;
    const subject = document.getElementById("unitSubject").value;
    const grade = document.getElementById("targetGrade").value;
    const status = document.getElementById("unitStatus").value;

    units.push({
        name,
        subject,
        grade,
        status
    });

    saveUnits();

    event.target.reset();

    document.getElementById("unitForm").classList.add("hidden");

});

// Change coursework status
function changeStatus(index) {

    const statuses = [
        "Not Started",
        "In Progress",
        "Completed"
    ];

    const current = statuses.indexOf(units[index].status);

    units[index].status =
        statuses[(current + 1) % statuses.length];

    saveUnits();
}

// Delete coursework
function deleteUnit(index) {

    if (confirm("Are you sure you want to delete this unit?")) {
        units.splice(index, 1);
        saveUnits();
    }

}

// Protect user-entered text
function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}

// Initial load
renderCoursework();

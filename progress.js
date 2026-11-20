
// COLLEGEHUB - PROGRESS TRACKER

// Load saved data
const assignments = JSON.parse(
    localStorage.getItem("collegeAssignments")
) || [];

const units = JSON.parse(
    localStorage.getItem("collegeCoursework")
) || [];

// Calculate assignment progress
function updateAssignmentProgress() {

    const total = assignments.length;

    const completed = assignments.filter(
        assignment => assignment.completed
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalAssignments").textContent = total;

    document.getElementById("completedAssignments").textContent = completed;

    document.getElementById("assignmentPercentage").textContent =
        percentage + "%";

    document.getElementById("assignmentProgressBar").style.width =
        percentage + "%";
}

// Calculate coursework progress
function updateCourseworkProgress() {

    const total = units.length;

    const completed = units.filter(
        unit => unit.status === "Completed"
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalCoursework").textContent = total;

    document.getElementById("completedCoursework").textContent = completed;

    document.getElementById("courseworkPercentage").textContent =
        percentage + "%";

    document.getElementById("courseworkProgressBar").style.width =
        percentage + "%";
}

// Display target grade breakdown
function updateGradeBreakdown() {

    const container = document.getElementById("gradeBreakdown");

    container.innerHTML = "";

    const grades = {
        Pass: 0,
        Merit: 0,
        Distinction: 0
    };

    units.forEach(unit => {

        if (Object.prototype.hasOwnProperty.call(grades, unit.grade)) {
            grades[unit.grade]++;
        }

    });

    if (units.length === 0) {
        container.innerHTML =
            "<p class='muted'>No coursework targets added yet.</p>";
        return;
    }

    Object.entries(grades).forEach(([grade, count]) => {

        container.innerHTML += `
            <div class="assignment">
                <div>
                    <h3>${grade}</h3>
                </div>

                <div>
                    <span class="deadline-status">${count} units</span>
                </div>
            </div>
        `;

    });
}

// Load everything
updateAssignmentProgress();
updateCourseworkProgress();
updateGradeBreakdown();

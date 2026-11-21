
// COLLEGEHUB - SECURE PROGRESS TRACKER

let assignments = [];
let units = [];
let currentUser = null;

// LOAD DATA FROM SUPABASE
async function loadProgressData() {

    const [assignmentResult, courseworkResult] = await Promise.all([
        supabaseClient
            .from("assignments")
            .select("*"),

        supabaseClient
            .from("coursework")
            .select("*")
    ]);

    if (assignmentResult.error || courseworkResult.error) {
        console.error(
            "Progress loading error:",
            assignmentResult.error || courseworkResult.error
        );

        alert("Could not load your progress. Please refresh the page.");
        return;
    }

    assignments = assignmentResult.data || [];
    units = courseworkResult.data || [];

    updateAssignmentProgress();
    updateCourseworkProgress();
    updateGradeBreakdown();
}

// CALCULATE ASSIGNMENT PROGRESS
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

// CALCULATE COURSEWORK PROGRESS
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

// DISPLAY TARGET GRADE BREAKDOWN
function updateGradeBreakdown() {

    const container = document.getElementById("gradeBreakdown");

    container.innerHTML = "";

    const grades = {
        Pass: 0,
        Merit: 0,
        Distinction: 0
    };

    units.forEach(unit => {

        if (
            Object.prototype.hasOwnProperty.call(
                grades,
                unit.target_grade
            )
        ) {
            grades[unit.target_grade]++;
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

// CHECK LOGIN AND START PROGRESS TRACKER
async function initialiseProgress() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = data.user;

    await loadProgressData();
}

initialiseProgress();

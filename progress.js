
// ==========================================
// COLLEGEHUB - STUDENT PERFORMANCE DASHBOARD
// ==========================================

let assignments = [];
let units = [];
let currentUser = null;

// ==========================================
// GENERAL HELPERS
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function setHTML(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerHTML = value;
    }
}

function parseDate(value) {
    if (!value) return null;

    // Handle date-only values without UTC timezone shifting.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = parseDate(value);

    if (!date) return "Date unavailable";

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getToday() {
    const today = new Date();

    return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
}

function isCompleted(assignment) {
    return assignment.completed === true ||
        assignment.status === "Completed";
}

function getGradePoints(grade) {
    const grades = {
        Pass: 1,
        Merit: 2,
        Distinction: 3
    };

    return grades[grade] ?? null;
}

function getGradeLabel(points) {
    if (points === null || points === undefined) {
        return "Not available";
    }

    if (points < 1.5) return "Pass";
    if (points < 2.5) return "Merit";

    return "Distinction";
}

function getAverageGrade(items) {
    const graded = items
        .map(item => getGradePoints(item.received_grade))
        .filter(points => points !== null);

    if (graded.length === 0) return null;

    const average = graded.reduce(
        (total, points) => total + points,
        0
    ) / graded.length;

    return {
        points: average,
        label: getGradeLabel(average),
        count: graded.length
    };
}

function getDeadlineStatus(assignment) {
    const deadline = parseDate(assignment.deadline);

    if (!deadline) return "No deadline";

    const today = getToday();

    if (deadline < today) return "Overdue";

    if (deadline.getTime() === today.getTime()) {
        return "Due today";
    }

    return "Upcoming";
}

// ==========================================
// LOAD DATA FROM SUPABASE
// ==========================================

async function loadProgressData() {
    const [assignmentResult, courseworkResult] = await Promise.all([
        supabaseClient
            .from("assignments")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: true }),

        supabaseClient
            .from("coursework")
            .select("*")
            .eq("user_id", currentUser.id)
    ]);

    if (assignmentResult.error || courseworkResult.error) {
        console.error(
            "Progress loading error:",
            assignmentResult.error || courseworkResult.error
        );

        setHTML(
            "progressInsights",
            `<p class="muted">Your performance data could not be loaded. Please refresh the page.</p>`
        );

        return;
    }

    assignments = assignmentResult.data || [];
    units = courseworkResult.data || [];

    updateDashboard();
}

// ==========================================
// UPDATE ALL DASHBOARD SECTIONS
// ==========================================

function updateDashboard() {
    updateMainStatistics();
    updateGradeDistribution();
    updateGradeHistory();
    updateSubjectPerformance();
    updateCompletionTrends();
    updateUpcomingDeadlines();
    updateStrengthsAndImprovements();
    updateProgressInsights();
}

// ==========================================
// MAIN STATISTICS
// ==========================================

function updateMainStatistics() {
    const total = assignments.length;

    const completed = assignments.filter(
        isCompleted
    );

    const completedCount = completed.length;

    const completionRate = total === 0
        ? 0
        : Math.round((completedCount / total) * 100);

    const average = getAverageGrade(assignments);

    const datedSubmissions = completed.filter(assignment =>
        assignment.submitted_at && assignment.deadline &&
        parseDate(assignment.submitted_at) &&
        parseDate(assignment.deadline)
    );

    const onTime = datedSubmissions.filter(assignment => {
        const submitted = parseDate(assignment.submitted_at);
        const deadline = parseDate(assignment.deadline);

        // A date-only deadline is treated as the end of that day.
        deadline.setHours(23, 59, 59, 999);

        return submitted <= deadline;
    });

    const overdue = assignments.filter(assignment =>
        !isCompleted(assignment) &&
        getDeadlineStatus(assignment) === "Overdue"
    );

    setText("assignmentsCompleted", completedCount);
    setText("completionRate", completionRate + "%");

    setText(
        "averageGrade",
        average ? average.label : "—"
    );

    setText(
        "onTimeSubmissions",
        datedSubmissions.length > 0
            ? `${onTime.length} / ${datedSubmissions.length}`
            : "—"
    );

    setText("overdueAssignments", overdue.length);

    const onTimeElement = document.getElementById(
        "onTimeSubmissions"
    );

    if (onTimeElement) {
        onTimeElement.title = datedSubmissions.length > 0
            ? "Based on completed assignments with recorded submission dates and deadlines."
            : "Submission dates are not available yet.";
    }
}

// ==========================================
// GRADE DISTRIBUTION
// ==========================================

function updateGradeDistribution() {
    const container = document.getElementById(
        "gradeDistribution"
    );

    if (!container) return;

    const grades = {
        Pass: 0,
        Merit: 0,
        Distinction: 0
    };

    assignments.forEach(assignment => {
        if (
            Object.prototype.hasOwnProperty.call(
                grades,
                assignment.received_grade
            )
        ) {
            grades[assignment.received_grade]++;
        }
    });

    const total = Object.values(grades).reduce(
        (sum, count) => sum + count,
        0
    );

    if (total === 0) {
        container.innerHTML =
            `<p class="muted">No received grades have been recorded yet.</p>`;
        return;
    }

    container.innerHTML = Object.entries(grades).map(
        ([grade, count]) => {
            const percentage = Math.round((count / total) * 100);

            return `
                <div class="progress-grade-row">
                    <div class="progress-grade-heading">
                        <strong>${grade}</strong>
                        <span>${count} assignments (${percentage}%)</span>
                    </div>

                    <div class="progress-bar">
                        <div class="progress-bar-fill"
                             style="width: ${percentage}%">
                        </div>
                    </div>
                </div>
            `;
        }
    ).join("");
}

// ==========================================
// GRADE HISTORY
// ==========================================

function updateGradeHistory() {
    const container = document.getElementById("gradeHistory");

    if (!container) return;

    const graded = assignments
        .filter(assignment =>
            getGradePoints(assignment.received_grade) !== null
        )
        .sort((a, b) => {
            const dateA = parseDate(a.submitted_at);
            const dateB = parseDate(b.submitted_at);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return dateB - dateA;
        });

    if (graded.length === 0) {
        container.innerHTML =
            `<p class="muted">Your grade history will appear here when you receive assignment grades.</p>`;
        return;
    }

    container.innerHTML = graded.map(assignment => `
        <div class="progress-history-item">
            <div>
                <strong>${escapeHTML(assignment.title)}</strong>
                <p class="muted">
                    ${escapeHTML(assignment.subject || "No subject")}
                </p>
            </div>

            <div class="progress-history-grade">
                <strong>${escapeHTML(assignment.received_grade)}</strong>
                <p class="muted">
                    ${assignment.submitted_at
                        ? formatDate(assignment.submitted_at)
                        : "Submission date unavailable"}
                </p>
            </div>
        </div>
    `).join("");
}

// ==========================================
// PERFORMANCE BY SUBJECT
// ==========================================

function updateSubjectPerformance() {
    const container = document.getElementById(
        "subjectPerformance"
    );

    if (!container) return;

    const subjects = {};

    assignments.forEach(assignment => {
        const points = getGradePoints(
            assignment.received_grade
        );

        if (points === null) return;

        const subject = assignment.subject?.trim() ||
            "Uncategorised";

        if (!subjects[subject]) {
            subjects[subject] = [];
        }

        subjects[subject].push(points);
    });

    const entries = Object.entries(subjects);

    if (entries.length === 0) {
        container.innerHTML =
            `<p class="muted">Subject performance will appear once you have received grades.</p>`;
        return;
    }

    container.innerHTML = entries
        .map(([subject, scores]) => {
            const average = scores.reduce(
                (sum, score) => sum + score,
                0
            ) / scores.length;

            return {
                subject,
                average,
                label: getGradeLabel(average),
                count: scores.length
            };
        })
        .sort((a, b) => b.average - a.average)
        .map(item => `
            <div class="progress-subject-item">
                <div>
                    <strong>${escapeHTML(item.subject)}</strong>
                    <p class="muted">
                        ${item.count} graded assignment${item.count === 1 ? "" : "s"}
                    </p>
                </div>

                <div>
                    <strong>${item.label}</strong>
                    <p class="muted">
                        Average: ${item.average.toFixed(2)} / 3
                    </p>
                </div>
            </div>
        `).join("");
}

// ==========================================
// COMPLETION TRENDS
// ==========================================

function updateCompletionTrends() {
    const container = document.getElementById(
        "completionTrends"
    );

    if (!container) return;

    const monthlyTotals = {};

    assignments
        .filter(assignment =>
            isCompleted(assignment) &&
            assignment.submitted_at &&
            parseDate(assignment.submitted_at)
        )
        .forEach(assignment => {
            const date = parseDate(assignment.submitted_at);

            const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;

            monthlyTotals[key] =
                (monthlyTotals[key] || 0) + 1;
        });

    const months = Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6);

    if (months.length === 0) {
        container.innerHTML =
            `<p class="muted">Completion trends will appear as new assignments are completed and their submission dates are recorded.</p>`;
        return;
    }

    const maximum = Math.max(
        ...months.map(([, count]) => count)
    );

    container.innerHTML = months.map(([month, count]) => {
        const [year, monthNumber] = month.split("-");

        const label = new Date(
            Number(year),
            Number(monthNumber) - 1,
            1
        ).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric"
        });

        const percentage = Math.round(
            (count / maximum) * 100
        );

        return `
            <div class="progress-trend-item">
                <div class="progress-trend-heading">
                    <strong>${label}</strong>
                    <span>${count} completed</span>
                </div>

                <div class="progress-bar">
                    <div class="progress-bar-fill"
                         style="width: ${percentage}%">
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// UPCOMING DEADLINES
// ==========================================

function updateUpcomingDeadlines() {
    const container = document.getElementById(
        "upcomingDeadlines"
    );

    if (!container) return;

    const upcoming = assignments
        .filter(assignment => {
            if (isCompleted(assignment)) return false;

            const deadline = parseDate(assignment.deadline);

            return deadline && deadline >= getToday();
        })
        .sort((a, b) =>
            parseDate(a.deadline) - parseDate(b.deadline)
        )
        .slice(0, 5);

    if (upcoming.length === 0) {
        container.innerHTML =
            `<p class="muted">You have no upcoming assignment deadlines.</p>`;
        return;
    }

    container.innerHTML = upcoming.map(assignment => {
        const status = getDeadlineStatus(assignment);

        return `
            <div class="progress-deadline-item">
                <div>
                    <strong>${escapeHTML(assignment.title)}</strong>
                    <p class="muted">
                        ${escapeHTML(assignment.subject || "No subject")}
                    </p>
                </div>

                <div>
                    <strong>${formatDate(assignment.deadline)}</strong>
                    <p class="muted">${status}</p>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// STRENGTHS AND IMPROVEMENTS
// ==========================================

function updateStrengthsAndImprovements() {
    const container = document.getElementById(
        "strengthsAndImprovements"
    );

    if (!container) return;

    const subjects = {};

    assignments.forEach(assignment => {
        const points = getGradePoints(
            assignment.received_grade
        );

        if (points === null) return;

        const subject = assignment.subject?.trim() ||
            "Uncategorised";

        if (!subjects[subject]) {
            subjects[subject] = [];
        }

        subjects[subject].push(points);
    });

    const entries = Object.entries(subjects)
        .filter(([, scores]) => scores.length >= 2)
        .map(([subject, scores]) => ({
            subject,
            average: scores.reduce(
                (sum, score) => sum + score,
                0
            ) / scores.length
        }))
        .sort((a, b) => b.average - a.average);

    if (entries.length === 0) {
        container.innerHTML =
            `<p class="muted">More recorded grades are needed before strengths and areas for improvement can be identified reliably.</p>`;
        return;
    }

    const strongest = entries[0];
    const weakest = entries[entries.length - 1];

    let output = `
        <div class="progress-insight-item">
            <strong>Strongest recorded subject</strong>
            <p>
                ${escapeHTML(strongest.subject)}
                — ${getGradeLabel(strongest.average)} average
            </p>
        </div>
    `;

    if (
        entries.length > 1 &&
        strongest.subject !== weakest.subject
    ) {
        output += `
            <div class="progress-insight-item">
                <strong>Potential area for improvement</strong>
                <p>
                    ${escapeHTML(weakest.subject)}
                    — ${getGradeLabel(weakest.average)} average
                </p>
            </div>
        `;
    } else {
        output += `
            <p class="muted">
                More subject results are needed to compare performance.
            </p>
        `;
    }

    output += `
        <p class="muted">
            Based on subjects with at least two recorded grades.
        </p>
    `;

    container.innerHTML = output;
}

// ==========================================
// PERSONAL PROGRESS INSIGHTS
// ==========================================

function updateProgressInsights() {
    const container = document.getElementById(
        "progressInsights"
    );

    if (!container) return;

    const total = assignments.length;

    const completed = assignments.filter(
        isCompleted
    ).length;

    const overdue = assignments.filter(assignment =>
        !isCompleted(assignment) &&
        getDeadlineStatus(assignment) === "Overdue"
    ).length;

    const graded = assignments.filter(assignment =>
        getGradePoints(assignment.received_grade) !== null
    );

    const average = getAverageGrade(assignments);

    const insights = [];

    if (total === 0) {
        insights.push(
            "Add your assignments to start tracking your academic progress."
        );
    } else {
        const rate = Math.round((completed / total) * 100);

        insights.push(
            `You have completed ${completed} out of ${total} assignments (${rate}%).`
        );
    }

    if (average) {
        insights.push(
            `Your current average received grade is ${average.label}, based on ${average.count} graded assignment${average.count === 1 ? "" : "s"}.`
        );
    } else {
        insights.push(
            "Your average grade will appear once you record your first received grade."
        );
    }

    if (overdue > 0) {
        insights.push(
            `You currently have ${overdue} overdue assignment${overdue === 1 ? "" : "s"}. Consider prioritising these.`
        );
    } else if (total > 0) {
        insights.push(
            "You currently have no overdue active assignments."
        );
    }

    const submissionDates = assignments.filter(
        assignment =>
            isCompleted(assignment) &&
            assignment.submitted_at &&
            assignment.deadline
    );

    if (submissionDates.length === 0) {
        insights.push(
            "On-time submission statistics will become more useful as new submission dates are recorded."
        );
    }

    container.innerHTML = insights.map(insight => `
        <div class="progress-insight-item">
            <p>${escapeHTML(insight)}</p>
        </div>
    `).join("");
}

// ==========================================
// CHECK LOGIN AND INITIALISE
// ==========================================

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

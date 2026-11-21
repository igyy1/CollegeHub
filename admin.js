
// COLLEGEHUB - ADMIN MANAGEMENT SYSTEM

let adminAccounts = [];
let selectedAccount = null;
let currentAdminId = null;

// HTML SAFETY
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// CHECK ADMIN ACCESS
async function checkAdminAccess() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return null;
    }

    const { data: roleData, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (roleError || !roleData || roleData.role !== "admin") {
        alert("Access denied. Admin permissions required.");
        window.location.href = "index.html";
        return null;
    }

    console.log("Admin access granted.");
    return user;
}

// LOAD ADMIN DASHBOARD
async function initialiseAdmin() {
    const currentUser = await checkAdminAccess();

    if (!currentUser) return;
    currentAdminId = currentUser.id;

    document.getElementById("today").textContent =
        new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    await loadAccounts();

    document.getElementById("studentSearch").addEventListener(
        "input", renderAccounts
    );

    document.getElementById("roleFilter").addEventListener(
        "change", renderAccounts
    );

    document.getElementById("closeAccountModal").addEventListener(
        "click", closeAccountModal
    );

    document.getElementById("accountModal").addEventListener(
        "click", event => {
            if (event.target.id === "accountModal") {
                closeAccountModal();
            }
        }
    );

    document.getElementById("saveAccountRole").addEventListener(
        "click", updateAccountRole
    );
}

// LOAD ACCOUNTS
async function loadAccounts() {
    const studentList = document.getElementById("studentList");

    studentList.innerHTML =
        "<p class='muted'>Loading accounts...</p>";

    const { data: profiles, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false });

    if (profileError) {
        studentList.textContent =
            "Could not load accounts: " + profileError.message;
        return;
    }

    const { data: roles, error: rolesError } = await supabaseClient
        .from("user_roles")
        .select("user_id, role");

    if (rolesError) {
        studentList.textContent =
            "Could not load roles: " + rolesError.message;
        return;
    }

    adminAccounts = profiles.map(profile => {
        const matchingRole = roles.find(
            item => item.user_id === profile.id
        );

        return {
            ...profile,
            role: matchingRole ? matchingRole.role : "student"
        };
    });

    updateStatistics();
    renderAccounts();
}

// UPDATE STATISTICS
function updateStatistics() {
    const students = adminAccounts.filter(
        account => account.role === "student"
    );

    const admins = adminAccounts.filter(
        account => account.role === "admin"
    );

    document.getElementById("totalStudents").textContent =
        students.length;

    document.getElementById("totalAdmins").textContent =
        admins.length;
}

// SEARCH AND FILTER ACCOUNTS
function renderAccounts() {
    const search = document.getElementById("studentSearch")
        .value.trim().toLowerCase();

    const filter = document.getElementById("roleFilter").value;

    const filteredAccounts = adminAccounts.filter(account => {
        const matchesName = (account.display_name || "")
            .toLowerCase()
            .includes(search);

        const matchesRole =
            filter === "all" || account.role === filter;

        return matchesName && matchesRole;
    });

    const studentList = document.getElementById("studentList");

    if (filteredAccounts.length === 0) {
        studentList.innerHTML =
            "<p class='muted'>No matching accounts found.</p>";
        return;
    }

    studentList.innerHTML = filteredAccounts.map(account => `
        <div class="student-row">
            <div>
                <h3>${escapeHTML(account.display_name || "Unnamed Student")}</h3>
                <p class="muted">
                    Joined: ${new Date(account.created_at).toLocaleDateString("en-GB")}
                </p>
            </div>

            <div class="student-row-actions">
                <span class="student-role">
                    ${escapeHTML(account.role)}
                </span>

                <button
                    class="view-account-button"
                    data-account-id="${escapeHTML(account.id)}"
                >
                    View
                </button>
            </div>
        </div>
    `).join("");

    studentList.querySelectorAll(".view-account-button").forEach(button => {
        button.addEventListener("click", () => {
            openAccountModal(button.dataset.accountId);
        });
    });
}

// OPEN ACCOUNT DETAILS
function openAccountModal(accountId) {
    selectedAccount = adminAccounts.find(
        account => account.id === accountId
    );

    if (!selectedAccount) return;

    document.getElementById("accountDetails").innerHTML = `
        <div class="account-detail">
            <p class="muted">Display name</p>
            <h3>${escapeHTML(selectedAccount.display_name || "Unnamed Student")}</h3>
        </div>

        <div class="account-detail">
            <p class="muted">Account ID</p>
            <p>${escapeHTML(selectedAccount.id)}</p>
        </div>

        <div class="account-detail">
            <p class="muted">Registration date</p>
            <p>${new Date(selectedAccount.created_at).toLocaleDateString("en-GB")}</p>
        </div>

        <div class="account-detail">
            <p class="muted">Current role</p>
            <p>${escapeHTML(selectedAccount.role)}</p>
        </div>
    `;

    document.getElementById("newAccountRole").value =
        selectedAccount.role;

    document.getElementById("adminActionMessage").textContent = "";

    document.getElementById("saveAccountRole").disabled =
    selectedAccount.id === currentAdminId;

    document.getElementById("accountModal").classList.remove("hidden");
}

// CLOSE ACCOUNT DETAILS
function closeAccountModal() {
    document.getElementById("accountModal").classList.add("hidden");
    selectedAccount = null;
}

// UPDATE ACCOUNT ROLE
async function updateAccountRole() {
    if (!selectedAccount) return;

    const newRole = document.getElementById("newAccountRole").value;
    const message = document.getElementById("adminActionMessage");
    const button = document.getElementById("saveAccountRole");

    if (newRole === selectedAccount.role) {
        message.textContent = "This account already has that role.";
        return;
    }

    if (!confirm(
        `Are you sure you want to change this account to ${newRole}?`
    )) return;

    button.disabled = true;
    message.textContent = "Updating role...";

    const { error } = await supabaseClient.rpc(
        "admin_set_user_role",
        {
            target_user_id: selectedAccount.id,
            new_role: newRole
        }
    );

    button.disabled = false;

    if (error) {
        message.textContent = "Update failed: " + error.message;
        return;
    }

    message.textContent = "Role updated successfully!";

    await loadAccounts();

    selectedAccount = adminAccounts.find(
        account => account.id === selectedAccount.id
    );

    if (selectedAccount) {
        document.getElementById("newAccountRole").value =
            selectedAccount.role;
    }

    alert("Account role updated successfully!");
}

// START SYSTEM
initialiseAdmin();


// COLLEGEHUB - STUDENT PROFILE SYSTEM

let currentUser = null;

// LOAD PROFILE
async function loadProfile() {

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = userData.user;

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("display_name, college, course, created_at")
            .eq("id", currentUser.id)
            .single();

    if (profileError) {
        console.error("Profile loading error:", profileError);
        document.getElementById("profileMessage").textContent =
            "Unable to load profile.";
        return;
    }

    const displayName = profile.display_name || "Student";

    document.getElementById("profileName").textContent = displayName;
    document.getElementById("profileEmail").textContent = currentUser.email;
    document.getElementById("profileAvatar").textContent =
        displayName.charAt(0).toUpperCase();

    document.getElementById("displayName").value = displayName;
    document.getElementById("college").value = profile.college || "";
    document.getElementById("course").value = profile.course || "";

    document.getElementById("accountEmail").textContent =
        currentUser.email;

    document.getElementById("accountCreated").textContent =
        profile.created_at
            ? new Date(profile.created_at).toLocaleDateString("en-GB")
            : "Unavailable";

    const { data: roleData, error: roleError } =
        await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", currentUser.id)
            .maybeSingle();

    document.getElementById("accountRole").textContent =
        roleError ? "Unavailable" : (roleData?.role || "Student");
}

// SAVE PROFILE
const profileForm = document.getElementById("profileForm");

profileForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const displayName =
        document.getElementById("displayName").value.trim();

    const college =
        document.getElementById("college").value.trim();

    const course =
        document.getElementById("course").value.trim();

    const message = document.getElementById("profileMessage");

    if (!displayName) {
        message.textContent = "Please enter a display name.";
        return;
    }

    const { error } = await supabaseClient
        .from("profiles")
        .update({
            display_name: displayName,
            college: college,
            course: course
        })
        .eq("id", currentUser.id);

    if (error) {
        console.error("Profile update error:", error);
        message.textContent = "Unable to save changes.";
        return;
    }

    document.getElementById("profileName").textContent = displayName;

    document.getElementById("profileAvatar").textContent =
        displayName.charAt(0).toUpperCase();

    message.textContent = "Profile updated successfully!";
});

// START PROFILE
loadProfile();

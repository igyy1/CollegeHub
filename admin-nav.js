
// COLLEGEHUB - SHARED ADMIN NAVIGATION

(async function () {

    const nav = document.querySelector(".sidebar nav");

    if (!nav) return;

    // Find the Admin Panel link
    let adminLink = nav.querySelector('a[href="admin.html"]');

    // Create the link if it doesn't already exist
    if (!adminLink) {

        adminLink = document.createElement("a");
        adminLink.href = "admin.html";
        adminLink.textContent = "⚙ Admin Panel";

       const profileLink = nav.querySelector('a[href="profile.html"]');

if (profileLink) {
    profileLink.insertAdjacentElement("afterend", adminLink);
} else {
    const progressLink = nav.querySelector('a[href="progress.html"]');

    if (progressLink) {
        progressLink.insertAdjacentElement("afterend", adminLink);
    } else {
        nav.appendChild(adminLink);
    }
}
    }

    // Hide the link until the role is verified
    adminLink.style.display = "none";

    // Check logged-in user
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) return;

    // Check their actual Supabase role
    const { data: roleData, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (roleError) {
        console.error("Admin navigation error:", roleError);
        return;
    }

    // Only administrators see the link
    if (roleData?.role === "admin") {
        adminLink.style.display = "";
    }

})();

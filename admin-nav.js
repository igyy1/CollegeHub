
// COLLEGEHUB - SHARED ADMIN NAVIGATION

(async function () {

    const nav = document.querySelector(".sidebar nav");

    if (!nav || typeof supabaseClient === "undefined") return;
    // Find or create the Admin Panel link
    let adminLink = nav.querySelector('a[href="admin.html"]');

    if (!adminLink) {
        adminLink = document.createElement("a");
        adminLink.href = "admin.html";
        adminLink.textContent = "⚙ Admin Panel";
    }

    // Always place Admin Panel after My Profile
    const profileLink = nav.querySelector('a[href="profile.html"]');

    if (profileLink) {
        profileLink.insertAdjacentElement("afterend", adminLink);
    } else {
        nav.appendChild(adminLink);
    }

    // Hide until Supabase verifies the role
    adminLink.hidden = true;

    try {

        const { data, error } = await supabaseClient.auth.getUser();

        if (error || !data.user) return;

        const { data: roleData, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (roleError) {
            console.error("Admin navigation error:", roleError);
            return;
        }

        if (roleData?.role === "admin") {
            adminLink.hidden = false;
        }

    } catch (error) {
        console.error("Admin navigation error:", error);
    }

})();

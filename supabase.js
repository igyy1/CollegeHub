
const SUPABASE_URL = "https://qddbyqutdmcdnzfsputm.supabase.co";
const SUPABASE_KEY = "sb_publishable_eTYMfzVPlnd9ResZwRUCXg_hfi-vRWz";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Make the client available to all CollegeHub scripts
window.supabaseClient = supabaseClient;

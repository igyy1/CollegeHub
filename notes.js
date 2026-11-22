
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // COLLEGEHUB - NOTES SYSTEM V4
    // ==========================================

    const notesList = document.getElementById("notesList");
    const createButton = document.getElementById("createNoteButton");
    const formSection = document.getElementById("noteFormSection");
    const noteForm = document.getElementById("noteForm");

    const titleInput = document.getElementById("noteTitle");
    const subjectInput = document.getElementById("noteSubject");
    const contentInput = document.getElementById("noteContent");

    const searchInput = document.getElementById("noteSearch");
    const subjectFilter = document.getElementById("subjectFilter");
    const sortSelect = document.getElementById("noteSort");

    const cancelButton = document.getElementById("cancelNoteButton");
    const cancelBottomButton = document.getElementById("cancelNoteButtonBottom");

    const formHeading = document.getElementById("noteFormHeading");
    const saveButton = document.getElementById("saveNoteButton");

    const allNotesButton = document.getElementById("showAllNotes");
    const favouriteButton = document.getElementById("showFavouriteNotes");

    const gridButton = document.getElementById("gridViewButton");
    const listButton = document.getElementById("listViewButton");

    const resultCount = document.getElementById("notesResultCount");
    const saveStatus = document.getElementById("notesSaveStatus");
    const wordCount = document.getElementById("noteWordCount");
    const toast = document.getElementById("notesToast");

    // ==========================================
    // STATE
    // ==========================================

    let notes = [];
    let editingNoteId = null;

    let currentView = "grid";
    let currentFilter = "all";

    let autosaveTimer = null;
    let toastTimer = null;

    let isDirty = false;
    let isSaving = false;
    let savePromise = null;

    let editorOpen = false;

    // ==========================================
    // UTILITIES
    // ==========================================

    function escapeHTML(value) {

        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);

    }

    function getNoteId(note) {
        return String(note.id);
    }

    function getEditorValues() {

        return {
            title: titleInput.value.trim(),
            subject: subjectInput.value.trim(),
            content: contentInput.value.trim()
        };

    }

    function showToast(message) {

        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);

    }

    function updateSaveStatus(message, saved = false) {

        if (!saveStatus) return;

        saveStatus.innerHTML = `
            <span style="background:${saved ? "#54bd8a" : "#e5ad55"}"></span>
            ${escapeHTML(message)}
        `;

    }

    function updateWordCount() {

        const content = contentInput.value.trim();

        const words = content
            ? content.split(/\s+/).length
            : 0;

        wordCount.textContent =
            `${words} ${words === 1 ? "word" : "words"}`;

    }

    function updateStatistics() {

        document.getElementById("totalNotes").textContent = notes.length;

        document.getElementById("totalSubjects").textContent =
            new Set(
                notes.map(note => note.subject).filter(Boolean)
            ).size;

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);

        document.getElementById("recentNotes").textContent =
            notes.filter(note =>
                new Date(note.updated_at) >= recentDate
            ).length;

        document.getElementById("favouriteNotes").textContent =
            notes.filter(note => note.is_favorite).length;

    }

    // ==========================================
    // NOTE FORMATTING RENDERER
    // ==========================================

    function formatInlineText(text) {

        // Escape HTML first to prevent saved note content
        // from being interpreted as actual HTML.

        let formatted = escapeHTML(text);

        // Bold: **text**
        formatted = formatted.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

        // Underline: __text__
        formatted = formatted.replace(
            /__(.+?)__/g,
            "<u>$1</u>"
        );

        // Italic: *text*
        formatted = formatted.replace(
            /\*([^*\n]+)\*/g,
            "<em>$1</em>"
        );

        return formatted;

    }

    function formatNoteContent(content) {

        if (!content || !content.trim()) {
            return '<p class="notes-empty-content">This note is empty.</p>';
        }

        const lines = content.replace(/\r\n/g, "\n").split("\n");

        const output = [];

        let paragraphLines = [];
        let bulletItems = [];
        let numberedItems = [];
        let currentListType = null;

        function flushParagraph() {

            if (paragraphLines.length === 0) return;

            output.push(`
                <p>${paragraphLines
                    .map(line => formatInlineText(line))
                    .join("<br>")}</p>
            `);

            paragraphLines = [];

        }

        function flushList() {

            if (currentListType === "bullet" && bulletItems.length) {

                output.push(`
                    <ul>
                        ${bulletItems.map(item =>
                            `<li>${formatInlineText(item)}</li>`
                        ).join("")}
                    </ul>
                `);

            }

            if (currentListType === "number" && numberedItems.length) {

                output.push(`
                    <ol>
                        ${numberedItems.map(item =>
                            `<li>${formatInlineText(item)}</li>`
                        ).join("")}
                    </ol>
                `);

            }

            bulletItems = [];
            numberedItems = [];
            currentListType = null;

        }

        function flushAll() {
            flushParagraph();
            flushList();
        }

        lines.forEach(line => {

            const trimmedLine = line.trim();

            // Empty line: separate paragraphs and lists.

            if (!trimmedLine) {
                flushAll();
                return;
            }

            // Heading: ## Heading

            const headingMatch = trimmedLine.match(/^##\s+(.+)$/);

            if (headingMatch) {

                flushAll();

                output.push(`
                    <h3>${formatInlineText(headingMatch[1])}</h3>
                `);

                return;

            }

            // Bullet list: • Item

            const bulletMatch = trimmedLine.match(/^•\s*(.*)$/);

            if (bulletMatch) {

                flushParagraph();

                if (currentListType !== "bullet") {
                    flushList();
                    currentListType = "bullet";
                }

                bulletItems.push(bulletMatch[1]);

                return;

            }

            // Numbered list: 1. Item

            const numberMatch = trimmedLine.match(/^\d+\.\s*(.*)$/);

            if (numberMatch) {

                flushParagraph();

                if (currentListType !== "number") {
                    flushList();
                    currentListType = "number";
                }

                numberedItems.push(numberMatch[1]);

                return;

            }

            // Normal paragraph.

            flushList();
            paragraphLines.push(trimmedLine);

        });

        flushAll();

        return output.join("");

    }

    // ==========================================
    // NOTES MODAL SYSTEM
    // ==========================================

    function createNotesModal() {

        if (document.getElementById("notesModal")) return;

        const modal = document.createElement("div");

        modal.id = "notesModal";
        modal.className = "notes-modal";

        modal.innerHTML = `
            <div class="notes-modal-content">

                <button
                    type="button"
                    class="notes-modal-close"
                    aria-label="Close"
                >
                    &times;
                </button>

                <div id="notesModalBody"></div>

                <div
                    id="notesModalActions"
                    class="notes-modal-actions"
                ></div>

            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                closeNotesModal();
            }

        });

        modal.querySelector(".notes-modal-close")
            .addEventListener("click", closeNotesModal);

    }

    function closeNotesModal() {

        const modal = document.getElementById("notesModal");

        if (modal) {
            modal.classList.remove("show");
        }

    }

    // ==========================================
    // VIEW NOTE
    // ==========================================

    function showViewNote(note) {

        createNotesModal();

        const modal = document.getElementById("notesModal");
        const body = document.getElementById("notesModalBody");
        const actions = document.getElementById("notesModalActions");

        const updatedDate = note.updated_at
            ? new Date(note.updated_at).toLocaleDateString("en-GB")
            : "Recently";

        body.innerHTML = `
            <p class="note-subject">
                ${escapeHTML(note.subject)}
            </p>

            <h2>${escapeHTML(note.title)}</h2>

            <p class="note-date">
                Updated ${escapeHTML(updatedDate)}
            </p>

            <div class="notes-view-content">
                ${formatNoteContent(note.content || "")}
            </div>
        `;

        actions.innerHTML = `
            <button
                type="button"
                class="secondary-button"
                id="viewNoteClose"
            >
                Close
            </button>

            <button
                type="button"
                id="viewNoteEdit"
            >
                Edit Note
            </button>
        `;

        document.getElementById("viewNoteClose")
            .addEventListener("click", closeNotesModal);

        document.getElementById("viewNoteEdit")
            .addEventListener("click", () => {

                closeNotesModal();
                openEditor(note);

            });

        modal.classList.add("show");

    }

    // ==========================================
    // DELETE CONFIRMATION
    // ==========================================

    function showDeleteConfirmation(note, onConfirm) {

        createNotesModal();

        const modal = document.getElementById("notesModal");
        const body = document.getElementById("notesModalBody");
        const actions = document.getElementById("notesModalActions");

        body.innerHTML = `
            <h2>Delete note?</h2>

            <p>
                Are you sure you want to delete
                <strong>${escapeHTML(note.title)}</strong>?
            </p>

            <p class="note-date">
                This action cannot be undone.
            </p>
        `;

        actions.innerHTML = `
            <button
                type="button"
                class="secondary-button"
                id="cancelDeleteNote"
            >
                Cancel
            </button>

            <button
                type="button"
                class="delete-confirm-button"
                id="confirmDeleteNote"
            >
                Delete Note
            </button>
        `;

        document.getElementById("cancelDeleteNote")
            .addEventListener("click", closeNotesModal);

        document.getElementById("confirmDeleteNote")
            .addEventListener("click", async () => {

                const confirmButton =
                    document.getElementById("confirmDeleteNote");

                confirmButton.disabled = true;
                confirmButton.textContent = "Deleting...";

                await onConfirm();

                closeNotesModal();

            });

        modal.classList.add("show");

    }

    // ==========================================
    // LOAD NOTES
    // ==========================================

    async function loadNotes() {

        try {

            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                window.location.href = "login.html";
                return;
            }

            const { data, error } = await supabaseClient
                .from("notes")
                .select("*")
                .order("updated_at", { ascending: false });

            if (error) throw error;

            notes = data || [];

            updateStatistics();
            updateSubjectFilter();
            renderNotes();

        } catch (error) {

            console.error("Notes loading error:", error);

            notesList.innerHTML = `
                <div class="notes-empty">
                    <h3>Unable to load notes</h3>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;

        }

    }

    // ==========================================
    // SUBJECT FILTER
    // ==========================================

    function updateSubjectFilter() {

        const currentValue = subjectFilter.value;

        const subjects = [
            ...new Set(
                notes.map(note => note.subject).filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

        subjectFilter.innerHTML =
            '<option value="all">All subjects</option>';

        subjects.forEach(subject => {

            const option = document.createElement("option");

            option.value = subject;
            option.textContent = subject;

            subjectFilter.appendChild(option);

        });

        subjectFilter.value = subjects.includes(currentValue)
            ? currentValue
            : "all";

    }

    // ==========================================
    // RENDER NOTES
    // ==========================================

    function renderNotes() {

        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedSubject = subjectFilter.value;

        let filteredNotes = notes.filter(note => {

            const title = String(note.title || "").toLowerCase();
            const subject = String(note.subject || "").toLowerCase();
            const content = String(note.content || "").toLowerCase();

            const matchesSearch =
                title.includes(searchTerm) ||
                subject.includes(searchTerm) ||
                content.includes(searchTerm);

            const matchesSubject =
                selectedSubject === "all" ||
                note.subject === selectedSubject;

            const matchesFavourite =
                currentFilter === "all" ||
                note.is_favorite === true;

            return matchesSearch &&
                matchesSubject &&
                matchesFavourite;

        });

        // SORTING

        if (sortSelect.value === "updated") {

            filteredNotes.sort((a, b) =>
                new Date(b.updated_at) - new Date(a.updated_at)
            );

        } else if (sortSelect.value === "oldest") {

            filteredNotes.sort((a, b) =>
                new Date(a.updated_at) - new Date(b.updated_at)
            );

        } else if (sortSelect.value === "alphabetical") {

            filteredNotes.sort((a, b) =>
                String(a.title).localeCompare(String(b.title))
            );

        }

        resultCount.textContent =
            `Showing ${filteredNotes.length} ${filteredNotes.length === 1 ? "note" : "notes"}`;

        if (filteredNotes.length === 0) {

            notesList.innerHTML = `
                <div class="notes-empty">
                    <h3>${notes.length === 0 ? "No notes yet" : "No notes found"}</h3>
                    <p>
                        ${notes.length === 0
                            ? "Create your first note to get started."
                            : "Try changing your search or filters."}
                    </p>
                </div>
            `;

            return;

        }

        const cards = filteredNotes.map(note => {

            const content = String(note.content || "");
            const preview = content.substring(0, 160);

            const updatedDate = note.updated_at
                ? new Date(note.updated_at).toLocaleDateString("en-GB")
                : "Recently";

            return `
                <article
                    class="note-card"
                    data-note-id="${escapeHTML(getNoteId(note))}"
                >

                    ${note.is_favorite
                        ? '<span class="note-favourite" title="Favourite">★</span>'
                        : ""}

                    <p class="note-subject">
                        ${escapeHTML(note.subject)}
                    </p>

                    <h3>${escapeHTML(note.title)}</h3>

                    <p>
                        ${escapeHTML(preview)}
                        ${content.length > 160 ? "..." : ""}
                    </p>

                    <p class="note-date">
                        Updated ${escapeHTML(updatedDate)}
                    </p>

                    <div class="note-actions">

                        <button
                            type="button"
                            data-action="view"
                            data-id="${escapeHTML(getNoteId(note))}"
                        >
                            View
                        </button>

                        <button
                            type="button"
                            data-action="edit"
                            data-id="${escapeHTML(getNoteId(note))}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="secondary-button"
                            data-action="favorite"
                            data-id="${escapeHTML(getNoteId(note))}"
                        >
                            ${note.is_favorite ? "★ Unfavourite" : "☆ Favourite"}
                        </button>

                        <button
                            type="button"
                            class="secondary-button"
                            data-action="delete"
                            data-id="${escapeHTML(getNoteId(note))}"
                        >
                            Delete
                        </button>

                    </div>

                </article>
            `;

        }).join("");

        notesList.innerHTML = `
            <div class="${currentView === "grid" ? "notes-grid" : "notes-list-view"}">
                ${cards}
            </div>
        `;

    }

    // ==========================================
    // OPEN EDITOR
    // ==========================================

    function openEditor(note = null) {

        clearTimeout(autosaveTimer);

        editingNoteId = note ? note.id : null;

        noteForm.reset();

        if (note) {

            titleInput.value = note.title || "";
            subjectInput.value = note.subject || "";
            contentInput.value = note.content || "";

            formHeading.textContent = "Edit note";
            saveButton.textContent = "Save Changes";

        } else {

            formHeading.textContent = "Create a new note";
            saveButton.textContent = "Save Note";

        }

        isDirty = false;
        editorOpen = true;

        updateWordCount();

        updateSaveStatus(
            note ? "All changes saved" : "Ready to write",
            true
        );

        formSection.classList.remove("hidden");

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        titleInput.focus();

    }

    // ==========================================
    // CLOSE EDITOR
    // ==========================================

    async function closeEditor() {

        clearTimeout(autosaveTimer);

        if (isDirty) {
            await saveNote(false);
        }

        if (isDirty) {
            return;
        }

        editorOpen = false;
        formSection.classList.add("hidden");

        noteForm.reset();

        editingNoteId = null;
        isDirty = false;

        updateWordCount();

    }

    createButton.addEventListener("click", () => {
        openEditor();
    });

    cancelButton.addEventListener("click", closeEditor);
    cancelBottomButton.addEventListener("click", closeEditor);

    // ==========================================
    // AUTOSAVE
    // ==========================================

    function scheduleAutosave() {

        if (!editorOpen) return;

        isDirty = true;

        updateSaveStatus("Unsaved changes");

        clearTimeout(autosaveTimer);

        autosaveTimer = setTimeout(() => {

            const values = getEditorValues();

            if (!values.title || !values.subject || !values.content) {
                updateSaveStatus("Complete all fields to autosave");
                return;
            }

            saveNote(false);

        }, 1200);

    }

    // ==========================================
    // SAVE NOTE
    // ==========================================

    async function saveNote(closeAfterSave = false) {

        clearTimeout(autosaveTimer);

        if (isSaving) {

            await savePromise;

            if (isDirty) {
                return saveNote(closeAfterSave);
            }

            if (closeAfterSave && editorOpen) {
                editorOpen = false;
                formSection.classList.add("hidden");
                noteForm.reset();
                editingNoteId = null;
                updateWordCount();
            }

            return;

        }

        const values = getEditorValues();

        if (!values.title || !values.subject || !values.content) {

            if (closeAfterSave) {
                showToast("Please complete all fields before saving.");
            }

            updateSaveStatus("Complete all fields to save");

            return;

        }

        isSaving = true;
        isDirty = false;

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        updateSaveStatus("Saving changes...");

        savePromise = (async () => {

            try {

                let result;

                if (editingNoteId !== null) {

                    result = await supabaseClient
                        .from("notes")
                        .update({
                            title: values.title,
                            subject: values.subject,
                            content: values.content,
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", editingNoteId);

                } else {

                    const {
                        data: { user },
                        error: authError
                    } = await supabaseClient.auth.getUser();

                    if (authError || !user) {
                        throw new Error("Your session has expired. Please log in again.");
                    }

                    result = await supabaseClient
                        .from("notes")
                        .insert({
                            user_id: user.id,
                            title: values.title,
                            subject: values.subject,
                            content: values.content
                        })
                        .select()
                        .single();

                    if (!result.error && result.data) {
                        editingNoteId = result.data.id;
                    }

                }

                if (result.error) throw result.error;

                const existingIndex = notes.findIndex(
                    note => String(note.id) === String(editingNoteId)
                );

                const updatedNote = {
                    id: editingNoteId,
                    title: values.title,
                    subject: values.subject,
                    content: values.content,
                    updated_at: new Date().toISOString(),
                    is_favorite: existingIndex >= 0
                        ? notes[existingIndex].is_favorite
                        : false
                };

                if (existingIndex >= 0) {
                    notes[existingIndex] = updatedNote;
                } else {
                    notes.unshift(updatedNote);
                }

                updateStatistics();
                updateSubjectFilter();
                renderNotes();

                updateSaveStatus("All changes saved", true);

                if (closeAfterSave) {

                    editorOpen = false;
                    formSection.classList.add("hidden");

                    noteForm.reset();

                    editingNoteId = null;
                    isDirty = false;

                    updateWordCount();

                    showToast("Note saved successfully.");

                }

            } catch (error) {

                console.error("Notes save error:", error);

                isDirty = true;

                updateSaveStatus("Save failed - try again");

                showToast(error.message || "Unable to save note.");

            }

        })();

        await savePromise;

        isSaving = false;
        savePromise = null;

        saveButton.disabled = false;

        saveButton.textContent = editingNoteId !== null
            ? "Save Changes"
            : "Save Note";

        if (isDirty && editorOpen) {
            scheduleAutosave();
        }

    }

    // ==========================================
    // FORM SUBMISSION
    // ==========================================

    noteForm.addEventListener("submit", async event => {

        event.preventDefault();

        await saveNote(true);

    });

    // ==========================================
    // EDITOR INPUT EVENTS
    // ==========================================

    titleInput.addEventListener("input", scheduleAutosave);
    subjectInput.addEventListener("input", scheduleAutosave);

    contentInput.addEventListener("input", () => {

        updateWordCount();
        scheduleAutosave();

    });

    // ==========================================
    // TEXT FORMATTING
    // ==========================================

    function applyFormatting(format) {

        const start = contentInput.selectionStart;
        const end = contentInput.selectionEnd;

        const selectedText = contentInput.value.substring(start, end);

        const before = contentInput.value.substring(0, start);
        const after = contentInput.value.substring(end);

        let replacement = "";
        let cursorPosition = start;

        if (format === "bold") {

            replacement = `**${selectedText || "bold text"}**`;
            cursorPosition = start + replacement.length;

        } else if (format === "italic") {

            replacement = `*${selectedText || "italic text"}*`;
            cursorPosition = start + replacement.length;

        } else if (format === "underline") {

            replacement = `__${selectedText || "underlined text"}__`;
            cursorPosition = start + replacement.length;

        } else if (format === "heading") {

            replacement = `## ${selectedText || "Heading"}`;
            cursorPosition = start + replacement.length;

        } else if (format === "bullet") {

            replacement = selectedText
                ? selectedText.split("\n").map(line => `• ${line}`).join("\n")
                : "• ";

            cursorPosition = start + replacement.length;

        } else if (format === "number") {

            replacement = selectedText
                ? selectedText.split("\n").map((line, index) => `${index + 1}. ${line}`).join("\n")
                : "1. ";

            cursorPosition = start + replacement.length;

        }

        contentInput.value = before + replacement + after;

        contentInput.focus();

        contentInput.setSelectionRange(
            cursorPosition,
            cursorPosition
        );

        updateWordCount();
        scheduleAutosave();

    }

    document.querySelectorAll(".notes-format-toolbar button").forEach(button => {

        button.addEventListener("click", () => {
            applyFormatting(button.dataset.format);
        });

    });

    // ==========================================
    // NOTE ACTIONS
    // ==========================================

    notesList.addEventListener("click", async event => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const noteId = button.dataset.id;

        const note = notes.find(
            item => String(item.id) === String(noteId)
        );

        if (!note) return;

        const action = button.dataset.action;

        // VIEW

        if (action === "view") {

            showViewNote(note);

        }

        // EDIT

        if (action === "edit") {

            openEditor(note);

        }

        // DELETE

        if (action === "delete") {

            showDeleteConfirmation(note, async () => {

                try {

                    const { error } = await supabaseClient
                        .from("notes")
                        .delete()
                        .eq("id", note.id);

                    if (error) throw error;

                    notes = notes.filter(
                        item => String(item.id) !== String(note.id)
                    );

                    updateStatistics();
                    updateSubjectFilter();
                    renderNotes();

                    showToast("Note deleted successfully.");

                } catch (error) {

                    console.error("Note deletion error:", error);

                    showToast("Unable to delete this note.");

                }

            });

        }

        // FAVOURITES

        if (action === "favorite") {

            button.disabled = true;

            const newStatus = !note.is_favorite;

            try {

                const { error } = await supabaseClient
                    .from("notes")
                    .update({
                        is_favorite: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", note.id);

                if (error) throw error;

                note.is_favorite = newStatus;
                note.updated_at = new Date().toISOString();

                updateStatistics();
                renderNotes();

                showToast(
                    newStatus
                        ? "Added to favourites."
                        : "Removed from favourites."
                );

            } catch (error) {

                console.error("Favourite update error:", error);

                showToast("Unable to update favourite status.");

                button.disabled = false;

            }

        }

    });

    // ==========================================
    // SEARCH AND FILTERS
    // ==========================================

    searchInput.addEventListener("input", renderNotes);

    subjectFilter.addEventListener("change", renderNotes);

    sortSelect.addEventListener("change", renderNotes);

    allNotesButton.addEventListener("click", () => {

        currentFilter = "all";

        allNotesButton.classList.add("active");
        favouriteButton.classList.remove("active");

        renderNotes();

    });

    favouriteButton.addEventListener("click", () => {

        currentFilter = "favourites";

        favouriteButton.classList.add("active");
        allNotesButton.classList.remove("active");

        renderNotes();

    });

    // ==========================================
    // GRID / LIST VIEW
    // ==========================================

    gridButton.addEventListener("click", () => {

        currentView = "grid";

        gridButton.classList.add("active");
        listButton.classList.remove("active");

        renderNotes();

    });

    listButton.addEventListener("click", () => {

        currentView = "list";

        listButton.classList.add("active");
        gridButton.classList.remove("active");

        renderNotes();

    });

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    createNotesModal();

    updateWordCount();
    loadNotes();

});

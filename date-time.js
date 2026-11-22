// COLLEGEHUB - GLOBAL DATE & TIME

(function () {

    const header =
        document.querySelector(".main-content header") ||
        document.querySelector("header");

    if (!header) return;

    let display = document.getElementById("today");

    if (!display) {
        display = document.createElement("div");
        display.id = "today";
        display.className = "date-display";
        header.appendChild(display);
    }

    // Create the elements only once
    display.innerHTML = `
        <span class="date-line"></span>
        <span class="time-line"></span>
    `;

    const dateLine = display.querySelector(".date-line");
    const timeLine = display.querySelector(".time-line");

    function updateDateTime() {

        const now = new Date();

        dateLine.textContent = now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        timeLine.textContent = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });
    }

    updateDateTime();

    setInterval(updateDateTime, 1000);

})();
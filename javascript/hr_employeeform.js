function highlightProbationDate(executionContext) {
    var formContext = executionContext.getFormContext();
    var probDateAttr = formContext.getAttribute("new_probationenddate");
    if (!probDateAttr) return;

    var probDate = probDateAttr.getValue();
    if (!probDate) return;

    var today = new Date();
    var daysLeft = (probDate - today) / (1000 * 60 * 60 * 24);

    var control = formContext.getControl("new_probationenddate");
    if (daysLeft <= 7 && daysLeft >= 0) {
        control.setNotification(
            "⚠️ Probation ending in " + Math.ceil(daysLeft) + " day(s)! Take action.",
            "PROB_WARNING"
        );
    } else {
        control.clearNotification("PROB_WARNING");
    }
}

// ----------------------------------------------------------
// FUNCTION 2: Block confirmation if tasks are incomplete
// Attach to: Employment Status OnChange
// ----------------------------------------------------------
function checkTasksBeforeConfirm(executionContext) {
    var formContext = executionContext.getFormContext();
    var statusAttr = formContext.getAttribute("new_employmentstatus");
    if (!statusAttr) return;

    var statusVal = statusAttr.getValue();
    // Check if status is being changed TO Confirmed
    if (!statusVal || statusVal !== 4) return; // change 4 to your Confirmed option value

    var employeeId = formContext.data.entity.getId();
    if (!employeeId) return;

    employeeId = employeeId.replace("{", "").replace("}", "");

    Xrm.WebApi.retrieveMultipleRecords(
        "new_onboardingtask",
        "?$filter=_new_employee_value eq " + employeeId +
        " and new_status ne 3" // 3 = Completed, change if different
    ).then(function (result) {
        if (result.entities.length > 0) {
            formContext.ui.setFormNotification(
                "❌ Cannot confirm: " + result.entities.length +
                " onboarding task(s) are still not completed.",
                "ERROR",
                "TASK_BLOCK"
            );
            // Revert status back
            statusAttr.setValue(null);
        } else {
            formContext.ui.clearFormNotification("TASK_BLOCK");
        }
    }).catch(function (error) {
        console.log("Task check error: " + error.message);
    });
}

// ----------------------------------------------------------
// FUNCTION 3: Block confirmation if documents not verified
// Attach to: Employment Status OnChange (same event as above)
// ----------------------------------------------------------
function checkDocsBeforeConfirm(executionContext) {
    var formContext = executionContext.getFormContext();
    var statusAttr = formContext.getAttribute("new_employmentstatus");
    if (!statusAttr) return;

    var statusVal = statusAttr.getValue();
    if (!statusVal || statusVal !== 4) return; // 4 = Confirmed

    var employeeId = formContext.data.entity.getId();
    if (!employeeId) return;

    employeeId = employeeId.replace("{", "").replace("}", "");

    Xrm.WebApi.retrieveMultipleRecords(
        "new_documentverification",
        "?$filter=_new_employee_value eq " + employeeId +
        " and new_verified eq false"
    ).then(function (result) {
        if (result.entities.length > 0) {
            formContext.ui.setFormNotification(
                "❌ Cannot confirm: " + result.entities.length +
                " document(s) are still not verified.",
                "ERROR",
                "DOC_BLOCK"
            );
            statusAttr.setValue(null);
        } else {
            formContext.ui.clearFormNotification("DOC_BLOCK");
        }
    }).catch(function (error) {
        console.log("Doc check error: " + error.message);
    });
}

// ----------------------------------------------------------
// FUNCTION 4: Disable Confirmed status if no Probation Review exists
// Attach to: Form OnLoad
// ----------------------------------------------------------
function disableConfirmedWithoutReview(executionContext) {
    var formContext = executionContext.getFormContext();
    var employeeId = formContext.data.entity.getId();
    if (!employeeId) return;

    employeeId = employeeId.replace("{", "").replace("}", "");

    Xrm.WebApi.retrieveMultipleRecords(
        "new_probationreview",
        "?$filter=_new_employee_value eq " + employeeId
    ).then(function (result) {
        if (result.entities.length === 0) {
            // No review exists — get all options and remove Confirmed
            var statusControl = formContext.getControl("new_employmentstatus");
            var statusAttr = formContext.getAttribute("new_employmentstatus");
            if (statusAttr) {
                var options = statusAttr.getOptions();
                options.forEach(function (opt) {
                    if (opt.text === "Confirmed") {
                        statusControl.removeOption(opt.value);
                    }
                });
            }
        }
    }).catch(function (error) {
        console.log("Review check error: " + error.message);
    });
}

// ----------------------------------------------------------
// FUNCTION 5: Auto-create default tasks when Department changes
// Attach to: Department OnChange
// ----------------------------------------------------------
function onDepartmentChange(executionContext) {
    var formContext = executionContext.getFormContext();
    var deptAttr = formContext.getAttribute("new_department");
    if (!deptAttr) return;

    var dept = deptAttr.getValue();
    var employeeId = formContext.data.entity.getId();
    if (!dept || !employeeId) return;

    employeeId = employeeId.replace("{", "").replace("}", "");

    // Default tasks per department
    var taskMap = {
        "IT":       ["Set up laptop", "Create email account", "Grant system access", "VPN setup"],
        "HR":       ["Issue ID card", "Submit Aadhaar copy", "Sign offer letter", "Collect PAN card"],
        "Finance":  ["Setup payroll account", "Submit bank details", "Tax declaration form"],
        "Admin":    ["Office tour", "Assign desk", "Issue access card"],
        "Operations": ["Tool access setup", "Team introduction", "Process training"],
        "Marketing": ["Brand guidelines review", "Tool access", "Meet the team"]
    };

    var tasks = taskMap[dept] || ["Complete onboarding checklist", "Meet your manager"];

    tasks.forEach(function (taskName) {
        var today = new Date();
        var dueDate = new Date(today.setDate(today.getDate() + 7)); // due in 7 days

        Xrm.WebApi.createRecord("new_onboardingtask", {
            "new_taskname": taskName,
            "new_employee@odata.bind": "/new_employees(" + employeeId + ")",
            "new_status": 1,       // 1 = Pending (check your option value)
            "new_duedate": dueDate,
            "new_taskcategory": dept === "IT" ? 1 : 2  // 1=IT Setup, 2=HR Doc etc
        }).then(function () {
            formContext.ui.setFormNotification(
                "✅ Default tasks created for " + dept + " department.",
                "INFO",
                "TASK_CREATED"
            );
            setTimeout(function () {
                formContext.ui.clearFormNotification("TASK_CREATED");
            }, 4000);
        });
    });
}
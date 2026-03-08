CREATE DATABASE ConstructHub_25;
USE ConstructHub_25;

CREATE TABLE Role (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role_id INT NOT NULL,
    company VARCHAR(50),
    address VARCHAR(50),
    FOREIGN KEY (role_id) REFERENCES Role(role_id)
);

CREATE TABLE Project_Status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Project (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    progress_percentage INT,
    status_id INT,
    client_id INT,
    FOREIGN KEY (status_id) REFERENCES Project_Status(status_id),
    FOREIGN KEY (client_id) REFERENCES User(user_id)
);

CREATE TABLE Project_Member (
    project_member_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    user_id INT,
    role_in_project VARCHAR(100),
    joined_date DATE,
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

CREATE TABLE Task_Priority (
    priority_id INT AUTO_INCREMENT PRIMARY KEY,
    priority_name VARCHAR(30) UNIQUE
);

-- TASK STATUS
CREATE TABLE Task_Status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE
);

CREATE TABLE Task (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    task_name VARCHAR(150),
    description TEXT,
    project_id INT NOT NULL,
    priority_id INT,
    status_id INT,
    start_date DATE,
    deadline DATE,
    created_by INT,
    assigned_to INT,
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (priority_id) REFERENCES Task_Priority(priority_id),
    FOREIGN KEY (status_id) REFERENCES Task_Status(status_id),
    FOREIGN KEY (created_by) REFERENCES User(user_id),
    FOREIGN KEY (assigned_to) REFERENCES User(user_id)
);

CREATE TABLE Task_Status_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    completion_percentage INT,
    remarks TEXT,
    updated_by INT,
    update_date DATETIME,
    FOREIGN KEY (task_id) REFERENCES Task(task_id),
    FOREIGN KEY (updated_by) REFERENCES User(user_id)
);

CREATE TABLE Project_Schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    milestone_name VARCHAR(150),
    dependency VARCHAR(150),
    start_date DATE,
    end_date DATE,
    created_by INT,
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (created_by) REFERENCES User(user_id)
);

CREATE TABLE Site_Report (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    submitted_by INT,
    overall_progress_percentage INT,
    work_done TEXT,
    issues TEXT,
    remarks TEXT,
    submission_date DATETIME,
    FOREIGN KEY (task_id) REFERENCES Task(task_id),
    FOREIGN KEY (submitted_by) REFERENCES User(user_id)
);

CREATE TABLE Site_Photo (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    photo_url VARCHAR(255),
    upload_date DATETIME,
    FOREIGN KEY (report_id) REFERENCES Site_Report(report_id)
);

CREATE TABLE Material_Usage (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT,
    material_name VARCHAR(100),
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    FOREIGN KEY (report_id) REFERENCES Site_Report(report_id)
);

CREATE TABLE Budget (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT UNIQUE,
    total_budget DECIMAL(12,2),
    allocated_date DATE,
    created_by INT,
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (created_by) REFERENCES User(user_id)
);

CREATE TABLE Expense (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(12,2),
    expense_date DATE,
    recorded_by INT,
    FOREIGN KEY (budget_id) REFERENCES Budget(budget_id),
    FOREIGN KEY (recorded_by) REFERENCES User(user_id)
);

CREATE TABLE Bill_Status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE
);


CREATE TABLE Bill (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    milestone VARCHAR(100),
    description TEXT,
    total_amount DECIMAL(12,2),
    tax DECIMAL(10,2),
    status_id INT,
    generated_by INT,
    approved_by INT,
    approval_date DATE,
    remarks TEXT,
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (status_id) REFERENCES Bill_Status(status_id),
    FOREIGN KEY (generated_by) REFERENCES User(user_id),
    FOREIGN KEY (approved_by) REFERENCES User(user_id)
);

CREATE TABLE Feedback_Priority (
    fpriority_id INT AUTO_INCREMENT PRIMARY KEY,
    fpriority_name VARCHAR(30) UNIQUE
);


CREATE TABLE Feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    submitted_by INT,
    messages TEXT,
    feedback_category varchar(50),
    fpriority_id INT,
    feedback_date DATE,
    FOREIGN KEY (fpriority_id) REFERENCES Feedback_Priority(fpriority_id),
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (submitted_by) REFERENCES User(user_id)
);

CREATE TABLE Message (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message_text TEXT,
    sent_at DATETIME,
    status VARCHAR(20),
    FOREIGN KEY (sender_id) REFERENCES User(user_id),
    FOREIGN KEY (receiver_id) REFERENCES User(user_id)
);

CREATE TABLE User_Notification_Setting (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    email_notifications BOOLEAN,
    task_reminders BOOLEAN,
    budget_alerts BOOLEAN,
    team_updates BOOLEAN,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

CREATE TABLE Notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(150),
    message TEXT,
    type VARCHAR(50),
    setting_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    FOREIGN KEY (setting_id) REFERENCES User_Notification_Setting(setting_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

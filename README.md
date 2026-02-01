Team Name : 25_ConstructHub

Domain :
  Construction Management – Enterprise Resource Planning (ERP).

Problem Statement :
    To develop a Unified Construction Management ERP system that integrates task management, project scheduling, site reporting, budgeting, billing, and payment approval into a single platform, enabling efficient coordination, real-time monitoring, and streamlined decision making among all system users.

Problem Description :
    Construction projects involve multiple roles and activities such as task execution, site reporting, project scheduling, budgeting, billing, and payment approval. Managing these activities using separate tools or manual processes leads to poor coordination, inconsistent data, delays in execution, and difficulty in tracking project progress and financial status.

Identified Actors :
  The system supports the following five primary actors:
   
      1.	Admin
      2.	Project Manager
      3.	Site Engineer
      4.	Finance Manager
      5.	Client

Planned Features for Each Actor:
 
 Admin
 
    Use Case: Manage Users and System Configuration
    Responsible for controlling system access and maintaining core configurations.
  
    1.	User Management -
        Create, update, and deactivate user accounts.
    2.	Role & Permission Control -
        Assign roles and define access levels for different users.
    3.	System Configuration -
        Maintain master data and global system settings.

 Project Manager

    Use Case: Assign and Manage Tasks
    Plans and controls project execution through task management.

      1.	Create Tasks -
          Define tasks with priorities, start dates, and deadlines.
      2.	Assign Tasks -
          Allocate tasks to site engineers for execution.
      3.	Monitor Progress -
          Track task status and completion updates.
      4.	Close Tasks -
          Mark tasks as completed after verification.

    Use Case: Manage Project Schedule
 
    Controls overall project timelines and milestones.
      
      1.	Create Project Schedule -
          Define timelines, milestones, and dependencies.
      2.	Monitor Schedule Progress -
          Track adherence to planned schedules.
      3.	Update Schedule -
          Revise timelines when delays or changes occur.

 Site Engineer
 
    Use Case: Submit Site Reports
    Reports daily on-site activities and execution details.
  
      1.	Daily Progress Reporting - 
          Submit work progress for assigned tasks.
      2.	Material Usage Entry -
          Record materials consumed during execution.
      3.	Upload Evidence -
          Add site photos and remarks.

    Use Case: Update Task Status
    Keeps task execution status current.
 
      1.	Update Completion Percentage -
          Reflect actual progress accurately.
      2.	Add Status Remarks -
          Explain delays or issues.
      3.	Mark Task as Completed -
          Confirm task completion.

 Finance Manager
 
    Use Case: Manage Budget and Billing
    Handles financial planning, expense tracking, and billing.

      1.	Budget Management -
          Allocate and control project budgets.
      2.	Expense Tracking -
          Record and monitor project expenses.
      3.	Bill Generation -
          Generate bills based on completed work.
      4.	Payment Workflow -
          Send bills for client approval.

Client

    Use Case: Approve Payments
    Verifies work completion and authorizes payments.
  
      1.	Review Bills
          Check billed amounts and work details.
      2.	Approve or Reject Payments
          Take payment decisions with remarks.

    Use Case: View Progress and Provide Feedback
    Monitors project progress and shares feedback.
  
      1.	View Dashboards
          Track task, schedule, and budget status.
      2.	Provide Feedback
          Share comments on project execution.

 Use Case Diagram
  
  The system functionality and interactions between actors are represented using a Use Case Diagram.
 View Use Case Diagram: Use Case Diagram link

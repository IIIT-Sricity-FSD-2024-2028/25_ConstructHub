# Team Name : 25_ConstructHub



## Domain : Construction Management – Enterprise Resource Planning (ERP)



## Problem Statement :
To develop a Unified Construction Management ERP system that integrates task management, project scheduling, site reporting, budgeting, billing, and payment approval into a single platform, enabling efficient coordination, real-time monitoring, and streamlined decision-making among all system users.



## Problem Description :

Construction projects involve multiple roles and activities such as task execution, site reporting, project scheduling, budgeting, billing, and payment approval across different stakeholders.

Currently, these activities are handled using multiple tools or manual processes, which results in:

- Poor coordination between teams  
- Inconsistent and fragmented data  
- Delays in task execution and approvals  
- Difficulty in tracking real-time project progress  
- Lack of financial visibility and control  

This project aims to develop a **single integrated ERP platform** that centralizes project execution, monitoring, and financial management to improve efficiency, transparency, and decision-making.



## Identified Actors :

The system supports the following primary actors:

- Admin
  - Responsible for configuring, controlling, and maintaining the ERP platform, including user management, system configuration, and master data governance.
- Project Manager
  - Responsible for planning, executing, and monitoring construction activities, including task allocation and project schedule control.
- Site Engineer
  - An operational user responsible for executing assigned tasks, reporting daily site progress, and updating work status.  
- Finance Manager
  - Responsible for managing project budgets, tracking expenses, generating bills, and coordinating the payment workflow.
- Client
  - An external stakeholder responsible for reviewing project progress and approving payments based on completed work.



## Planned Features and Use Cases



### Admin

**Use Case : Manage Users and System Configuration**

The Admin is responsible for controlling system access and maintaining global configurations.

- User Management  
  - Create, update, and deactivate user accounts  
- Role and Permission Control  
  - Assign roles and define access levels  
- System Configuration  
  - Maintain master data and system-wide settings  

---

### Project Manager

**Use Case : Assign and Manage Tasks**

Responsible for planning and controlling project execution.

- Create Tasks  
  - Define tasks with priorities, start dates, and deadlines  
- Assign Tasks  
  - Allocate tasks to site engineers  
- Monitor Progress  
  - Track task status and completion updates  
- Close Tasks  
  - Verify and mark tasks as completed  

**Use Case : Manage Project Schedule**

Controls overall project timelines and milestones.

- Create Project Schedule  
  - Define timelines, milestones, and dependencies  
- Monitor Schedule Progress  
  - Track adherence to planned schedules  
- Update Schedule  
  - Revise timelines due to delays or changes  

---

### Site Engineer

**Use Case : Submit Site Reports**

Responsible for reporting daily on-site activities.

- Daily Progress Reporting  
  - Submit work progress for assigned tasks  
- Material Usage Entry  
  - Record materials consumed during execution  
- Upload Evidence  
  - Add site photos and remarks  

**Use Case : Update Task Status**

Keeps execution status up to date.

- Update Completion Percentage  
- Add Status Remarks  
- Mark Task as Completed  

---

### Finance Manager

**Use Case : Manage Budget and Billing**

Handles project financial operations.

- Budget Management  
  - Allocate and control project budgets  
- Expense Tracking  
  - Record and monitor project expenses  
- Bill Generation  
  - Generate bills based on completed work  
- Payment Workflow  
  - Send bills to clients for approval  

---

### Client

**Use Case : Approve Payments**

Verifies work completion and authorizes payments.

- Review Bills  
- Approve or Reject Payments with remarks  

**Use Case : View Progress and Provide Feedback**

Monitors project execution.

- View Dashboards  
  - Track task, schedule, and budget status  
- Provide Feedback  
  - Share comments on project execution  

---

## Use Case Diagram :

The interactions between actors and system functionalities are represented using a Use Case Diagram.

Use Case Diagram Link :  
[Use Case Diagram](https://drive.google.com/file/d/1O5_mUEDVVt8n-u7oDRzt-REV0mSc_7rg/view?usp=sharing)

---

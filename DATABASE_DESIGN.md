# MongoDB Database Design

## Database Name

`sales-crm-db`

## Collections

The CRM application uses the following MongoDB collections.

### 1. Users (`users`)

Stores user account details.

Fields include:

- `_id`
- `name`
- `email`
- `phone`
- `password`
- `role`
- `isActive`
- `refreshToken`
- `createdAt`
- `updatedAt`

The password is stored as a hash. The refresh token is used for authentication management.

### 2. Leads (`leads`)

Stores information about potential customers.

Fields include:

- Name, email, phone and company
- Source
- Status
- Priority
- Assigned user
- Description
- Created and updated dates

### 3. Customers (`customers`)

Stores customer information.

Fields include:

- Name, email, phone and company
- Address
- Original lead reference
- Assigned user
- Status
- Created and updated dates

### 4. Deals (`deals`)

Stores sales opportunities and their progress.

Fields include:

- Deal name
- Lead reference
- Customer reference
- Assigned user
- Deal value
- Probability
- Expected revenue
- Expected closing date
- Stage
- Description
- Created and updated dates

### 5. Activities (`activities`)

Stores sales activities and follow-ups.

Fields include:

- Activity type
- Title and description
- Assigned user
- Due date
- Status
- Related lead, customer or deal
- Created by
- Completion date

### 6. Timelines (`timelines`)

Stores the history of important CRM actions.

Fields include:

- Action
- Entity type
- Entity ID
- User who performed the action
- Previous value
- New value
- Description
- Created date

## Relationships

- A user can be assigned multiple leads.
- A user can be assigned customers, deals and activities.
- A customer can reference its original lead.
- A deal references both a lead and a customer.
- An activity can be associated with a lead, customer or deal.
- A timeline entry references the record for which an event was recorded and the user who performed the action.

## Indexing

The application defines indexes on selected fields to support common queries, filtering and timeline retrieval. Unique and other index constraints depend on the Mongoose model definitions.

## Notes

The database uses Mongoose models to define document fields, validation, references and timestamps.

The exact schema and index definitions are available in the model files under `src/models/`.

# Staff account onboarding

Staff accounts are created by an authenticated administrator through:

```text
POST /api/v1/admin/staff
```

The request contains staff business details only. The backend owns credential generation so that
temporary passwords are never selected or returned by the admin interface.

## Creation request

```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com",
  "mobile": "9876543210",
  "designation": "Sales Manager",
  "joinedAt": "2026-06-19",
  "actorType": "STAFF",
  "roleId": 2
}
```

On successful creation, the backend:

1. Generates a unique employee code.
2. Generates a temporary password from the staff member's first name and random digits.
3. Creates the user, profile, role assignment, and audit log in one database transaction.
4. Marks the account as requiring a password change.
5. Sends the welcome email after the database transaction commits.
6. Records email delivery in the `notifications` table.

Plain-text passwords are used only to construct the outgoing email. They are not returned by the API
or stored in notifications, logs, or database columns.

## First login

The login response includes `user.mustChangePassword`.

While that value is `true`, protected admin APIs return:

```json
{
  "success": false,
  "error": {
    "code": "PASSWORD_CHANGE_REQUIRED",
    "message": "You must change your temporary password before continuing"
  }
}
```

The admin toolbox redirects the staff member to `/change-password`. It submits:

```text
POST /api/v1/admin/auth/change-password
```

```json
{
  "currentPassword": "temporary-password-from-email",
  "newPassword": "a-new-strong-password"
}
```

After the change, all refresh sessions are revoked and the staff member signs in again using the new
password.

## Regenerating credentials

An administrator can use:

```text
POST /api/v1/admin/staff/:id/reset-password
```

This endpoint generates a new temporary password, restores the mandatory password-change flag,
revokes existing sessions, writes an audit entry, and emails the replacement credentials. The API
does not accept or return a password.

## Email ownership

Email code is intentionally separate from the staff module:

```text
src/emails/
├── staff-email.service.js
└── templates/
    └── staff-welcome.template.js
```

Add future transactional templates under `src/emails/templates` and keep transport concerns inside
`src/integrations/mail`.

Required environment values:

```dotenv
ADMIN_APP_URL=http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mailer@example.com
SMTP_PASS=provider-app-password
SMTP_FROM="OrnaCore Admin Toolbox <mailer@example.com>"
```

Use a provider app password or SMTP credential, never the mailbox's normal account password. In
production, use a verified sending address and keep SMTP secrets outside source control.

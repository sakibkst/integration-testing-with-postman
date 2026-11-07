# DMoney Transaction API — Test Flow Documentation

Generated from [`postman/DMoney-E2E.postman_collection.json`](../postman/DMoney-E2E.postman_collection.json) by `npm run docs`. It documents every endpoint exercised by the collection, with the request that is sent and a real response captured from a Newman run (JWTs and password hashes are redacted).

Full interactive API reference (Swagger UI, served by the API itself):

- User API: `http://localhost:5000/api-docs/user`
- Transaction API: `http://localhost:5000/api-docs/transaction`

## Conventions

| Item | Value |
|---|---|
| Base URL | `{{base_url}}` (default `http://localhost:5000`) |
| Auth header | `Authorization: Bearer <jwt>` |
| Partner key | `X-AUTH-SECRET-KEY: {{partner_key}}` — must equal the API's `PARTNER_KEY`; required on every endpoint except register, login, verify-otp and the `/user/search/*` lookups |
| Identifiers | Accounts are identified by **phone number** (the SYSTEM account is the literal string `SYSTEM`) |
| Login | Admin/SYSTEM get a JWT from `/user/login`. Customer/Agent/Merchant get `otpRequired: true`, then exchange the OTP at `/user/verify-otp` |
| `208 Already Reported` | Business-rule soft failure (duplicate user, insufficient balance, limit exceeded) — not a transport error |

## Test cases at a glance

| ID | Folder | Test case | Type | Expected status |
|---|---|---|---|---|
| [TC01](#tc01---register-customer-1) | 1. Register users | Register Customer 1 | Positive | 201 |
| [TC02](#tc02---register-customer-2) | 1. Register users | Register Customer 2 | Positive | 201 |
| [TC03](#tc03---register-agent) | 1. Register users | Register Agent | Positive | 201 |
| [TC04](#tc04---register-merchant) | 1. Register users | Register Merchant | Positive | 201 |
| [TC05](#tc05---register-with-a-non-gmail-address-is-rejected-negative) | 1. Register users | Register with a non-Gmail address is rejected | Negative | 400 |
| [TC06](#tc06---register-with-an-already-used-email-returns-208-negative) | 1. Register users | Register with an already used email returns 208 | Negative | 208 |
| [TC07](#tc07---admin-login-returns-a-jwt) | 2. Admin activates users | Admin login returns a JWT | Positive | 200 |
| [TC08](#tc08---admin-activates-customer-1) | 2. Admin activates users | Admin activates Customer 1 | Positive | 200 |
| [TC09](#tc09---admin-activates-customer-2) | 2. Admin activates users | Admin activates Customer 2 | Positive | 200 |
| [TC10](#tc10---admin-activates-agent) | 2. Admin activates users | Admin activates Agent | Positive | 200 |
| [TC11](#tc11---admin-activates-merchant) | 2. Admin activates users | Admin activates Merchant | Positive | 200 |
| [TC12](#tc12---admin-activating-a-non-existent-user-returns-404-negative) | 2. Admin activates users | Admin activating a non-existent user returns 404 | Negative | 404 |
| [TC13](#tc13---system-account-login-returns-a-jwt) | 3. Login | SYSTEM account login returns a JWT | Positive | 200 |
| [TC14](#tc14---agent-login-password--otp-returns-a-jwt) | 3. Login | Agent login (password + OTP) returns a JWT | Positive | 200 |
| [TC15](#tc15---customer-1-login-password--otp-returns-a-jwt) | 3. Login | Customer 1 login (password + OTP) returns a JWT | Positive | 200 |
| [TC16](#tc16---customer-2-login-password--otp-returns-a-jwt) | 3. Login | Customer 2 login (password + OTP) returns a JWT | Positive | 200 |
| [TC17](#tc17---system-deposits-5000-tk-to-the-agent) | 4. SYSTEM deposits to Agent | SYSTEM deposits 5000 Tk to the Agent | Positive | 201 |
| [TC18](#tc18---system-deposit-to-a-customer-is-rejected-negative) | 4. SYSTEM deposits to Agent | SYSTEM deposit to a Customer is rejected | Negative | 400 |
| [TC19](#tc19---agent-deposits-2000-tk-to-customer-1--assert-commission) | 5. Agent deposits to Customer | Agent deposits 2000 Tk to Customer 1 — assert commission | Positive | 201 |
| [TC20](#tc20---deposit-below-the-10-tk-minimum-is-rejected-negative) | 5. Agent deposits to Customer | Deposit below the 10 Tk minimum is rejected | Negative | 400 |
| [TC21](#tc21---deposit-larger-than-the-agent-balance-returns-208-negative) | 5. Agent deposits to Customer | Deposit larger than the Agent balance returns 208 | Negative | 208 |
| [TC22](#tc22---customer-1-sends-1000-tk-to-customer-2--assert-service-fee) | 6. Send money | Customer 1 sends 1000 Tk to Customer 2 — assert service fee | Positive | 201 |
| [TC23](#tc23---send-money-to-a-merchant-is-rejected-negative) | 6. Send money | Send money to a Merchant is rejected | Negative | 400 |
| [TC24](#tc24---send-money-above-the-sender-balance-returns-208-negative) | 6. Send money | Send money above the sender balance returns 208 | Negative | 208 |
| [TC25](#tc25---customer-2-cashes-out-500-tk-via-the-agent--assert-service-fee) | 7. Cash-out | Customer 2 cashes out 500 Tk via the Agent — assert service fee | Positive | 201 |
| [TC26](#tc26---cash-out-to-a-non-agent-account-is-rejected-negative) | 7. Cash-out | Cash-out to a non-Agent account is rejected | Negative | 400 |
| [TC27](#tc27---cash-out-below-the-10-tk-minimum-is-rejected-negative) | 7. Cash-out | Cash-out below the 10 Tk minimum is rejected | Negative | 400 |
| [TC28](#tc28---customer-2-pays-400-tk-to-the-merchant) | 8. Payment | Customer 2 pays 400 Tk to the Merchant | Positive | 201 |
| [TC29](#tc29---payment-to-a-non-merchant-account-is-rejected-negative) | 8. Payment | Payment to a non-Merchant account is rejected | Negative | 400 |
| [TC30](#tc30---payment-above-the-payer-balance-returns-208-negative) | 8. Payment | Payment above the payer balance returns 208 | Negative | 208 |

## Collection variables

| Variable | Source | Purpose |
|---|---|---|
| `base_url`, `partner_key`, `default_otp`, `admin_*`, `system_*`, `user_password` | Environment (`postman/DMoney-Local.postman_environment.json`, overridable via `.env`) | Where the API runs and which seeded accounts to use |
| `*_email`, `*_phone`, `*_nid` | Generated in TC01's pre-request script | Unique users per run, so the flow can be repeated |
| `*_id`, `*_token` | Set by test scripts | Passed from one request to the next |
| `deposit_commission_rate`, `sendmoney_fee`, `withdraw_fee_rate`, `withdraw_min_fee`, `payment_fee_rate`, `payment_min_fee` | Collection | Expected fee/commission rules from the BRD (§9) |

## 1. Register users

Creates 2 customers, 1 agent and 1 merchant through the public registration API (positive), plus two negative registration cases.

### TC01 - Register Customer 1

Public self-registration (no token). Creates a **Customer** with status `pending` — it cannot transact until an Admin activates it (folder 2).

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Customer 1",
  "email": "{{c1_email}}",
  "password": "{{user_password}}",
  "phone_number": "{{c1_phone}}",
  "nid": "{{c1_nid}}",
  "role": "Customer"
}
```

**Example response — 201 Created**

```json
{
  "message": "Registration successful. Your account is pending approval by an admin.",
  "user": {
    "id": 77,
    "name": "SDET Customer 1",
    "email": "sdet.c1.3615900971@gmail.com",
    "phone_number": "01373247707",
    "role": "Customer",
    "status": "pending"
  }
}
```

### TC02 - Register Customer 2

Public self-registration (no token). Creates a **Customer** with status `pending` — it cannot transact until an Admin activates it (folder 2).

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Customer 2",
  "email": "{{c2_email}}",
  "password": "{{user_password}}",
  "phone_number": "{{c2_phone}}",
  "nid": "{{c2_nid}}",
  "role": "Customer"
}
```

**Example response — 201 Created**

```json
{
  "message": "Registration successful. Your account is pending approval by an admin.",
  "user": {
    "id": 78,
    "name": "SDET Customer 2",
    "email": "sdet.c2.3615900933@gmail.com",
    "phone_number": "01114997698",
    "role": "Customer",
    "status": "pending"
  }
}
```

### TC03 - Register Agent

Public self-registration (no token). Creates a **Agent** with status `pending` — it cannot transact until an Admin activates it (folder 2).

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Agent",
  "email": "{{agent_email}}",
  "password": "{{user_password}}",
  "phone_number": "{{agent_phone}}",
  "nid": "{{agent_nid}}",
  "role": "Agent"
}
```

**Example response — 201 Created**

```json
{
  "message": "Registration successful. Your account is pending approval by an admin.",
  "user": {
    "id": 79,
    "name": "SDET Agent",
    "email": "sdet.agent.3615900965@gmail.com",
    "phone_number": "01800291177",
    "role": "Agent",
    "status": "pending"
  }
}
```

### TC04 - Register Merchant

Public self-registration (no token). Creates a **Merchant** with status `pending` — it cannot transact until an Admin activates it (folder 2).

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Merchant",
  "email": "{{merchant_email}}",
  "password": "{{user_password}}",
  "phone_number": "{{merchant_phone}}",
  "nid": "{{merchant_nid}}",
  "role": "Merchant"
}
```

**Example response — 201 Created**

```json
{
  "message": "Registration successful. Your account is pending approval by an admin.",
  "user": {
    "id": 80,
    "name": "SDET Merchant",
    "email": "sdet.merchant.3615900946@gmail.com",
    "phone_number": "01733718020",
    "role": "Merchant",
    "status": "pending"
  }
}
```

### TC05 - Register with a non-Gmail address is rejected (negative)

Only `@gmail.com` addresses are accepted. Expected: **400** with a Gmail-specific message and no user created.

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Invalid Mail",
  "email": "sdet.invalid.{{run_id}}@yahoo.com",
  "password": "{{user_password}}",
  "phone_number": "{{neg_phone}}",
  "nid": "{{neg_nid}}",
  "role": "Customer"
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "Only Gmail addresses (@gmail.com) are accepted for registration."
}
```

### TC06 - Register with an already used email returns 208 (negative)

Duplicate email is a business-rule soft failure: **208** `An account with this email already exists`.

**Request** — `POST {{base_url}}/user/register`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "name": "SDET Duplicate",
  "email": "{{c1_email}}",
  "password": "{{user_password}}",
  "phone_number": "{{neg_phone}}",
  "nid": "{{neg_nid}}",
  "role": "Customer"
}
```

**Example response — 208 Already Reported**

```json
{
  "message": "An account with this email already exists"
}
```

## 2. Admin activates users

Logs in as Admin (no OTP for Admin/SYSTEM) and activates the four new accounts (positive), plus activation of an unknown user (negative).

### TC07 - Admin login returns a JWT

Admin and SYSTEM accounts skip OTP — the token is returned immediately. Stored as `admin_token`.

**Request** — `POST {{base_url}}/user/login`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "{{admin_email}}",
  "password": "{{admin_password}}"
}
```

**Example response — 200 OK**

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "role": "Admin",
  "expiresIn": "1h"
}
```

### TC08 - Admin activates Customer 1

Admin-only `PATCH /user/update/:id` with `{ "status": "active" }` for the Customer 1 registered in folder 1.

**Request** — `PATCH {{base_url}}/user/update/{{c1_id}}`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{admin_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "status": "active"
}
```

**Example response — 200 OK**

```json
{
  "message": "User updated successfully",
  "user": {
    "status": "active"
  }
}
```

### TC09 - Admin activates Customer 2

Admin-only `PATCH /user/update/:id` with `{ "status": "active" }` for the Customer 2 registered in folder 1.

**Request** — `PATCH {{base_url}}/user/update/{{c2_id}}`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{admin_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "status": "active"
}
```

**Example response — 200 OK**

```json
{
  "message": "User updated successfully",
  "user": {
    "status": "active"
  }
}
```

### TC10 - Admin activates Agent

Admin-only `PATCH /user/update/:id` with `{ "status": "active" }` for the Agent registered in folder 1.

**Request** — `PATCH {{base_url}}/user/update/{{agent_id}}`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{admin_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "status": "active"
}
```

**Example response — 200 OK**

```json
{
  "message": "User updated successfully",
  "user": {
    "status": "active"
  }
}
```

### TC11 - Admin activates Merchant

Admin-only `PATCH /user/update/:id` with `{ "status": "active" }` for the Merchant registered in folder 1.

**Request** — `PATCH {{base_url}}/user/update/{{merchant_id}}`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{admin_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "status": "active"
}
```

**Example response — 200 OK**

```json
{
  "message": "User updated successfully",
  "user": {
    "status": "active"
  }
}
```

### TC12 - Admin activating a non-existent user returns 404 (negative)

Activation of a user id that does not exist. Expected **404** `User not found`.

**Request** — `PATCH {{base_url}}/user/update/999999999`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{admin_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "status": "active"
}
```

**Example response — 404 Not Found**

```json
{
  "message": "User not found"
}
```

## 3. Login

SYSTEM login (no OTP) and the two-step OTP login for Agent, Customer 1 and Customer 2 (all positive; the negative cases live next to the transaction they protect).

### TC13 - SYSTEM account login returns a JWT

SYSTEM (`system@dmoney.com`) skips OTP. Stored as `system_token`.

**Request** — `POST {{base_url}}/user/login`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "{{system_email}}",
  "password": "{{system_password}}"
}
```

**Example response — 200 OK**

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "role": "Agent",
  "expiresIn": "1h"
}
```

### TC14 - Agent login (password + OTP) returns a JWT

Two-step login in one test case. **Step 1** `POST /user/login` must answer `otpRequired: true` with no token. **Step 2** the script calls `POST /user/verify-otp?env=dev` with `default_otp` (the API's dev-only bypass; the real OTP is only emailed/logged) and must receive a JWT. Stored as `agent_token`.

**Request** — `POST {{base_url}}/user/login`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "{{agent_email}}",
  "password": "{{user_password}}"
}
```

**Example response — 200 OK**

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "role": "Agent",
  "expiresIn": "1h"
}
```

### TC15 - Customer 1 login (password + OTP) returns a JWT

Two-step login in one test case. **Step 1** `POST /user/login` must answer `otpRequired: true` with no token. **Step 2** the script calls `POST /user/verify-otp?env=dev` with `default_otp` (the API's dev-only bypass; the real OTP is only emailed/logged) and must receive a JWT. Stored as `c1_token`.

**Request** — `POST {{base_url}}/user/login`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "{{c1_email}}",
  "password": "{{user_password}}"
}
```

**Example response — 200 OK**

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "role": "Customer",
  "expiresIn": "1h"
}
```

### TC16 - Customer 2 login (password + OTP) returns a JWT

Two-step login in one test case. **Step 1** `POST /user/login` must answer `otpRequired: true` with no token. **Step 2** the script calls `POST /user/verify-otp?env=dev` with `default_otp` (the API's dev-only bypass; the real OTP is only emailed/logged) and must receive a JWT. Stored as `c2_token`.

**Request** — `POST {{base_url}}/user/login`

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

```json
{
  "email": "{{c2_email}}",
  "password": "{{user_password}}"
}
```

**Example response — 200 OK**

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "role": "Customer",
  "expiresIn": "1h"
}
```

## 4. SYSTEM deposits to Agent

SYSTEM funds the agent with 5000 Tk. The funding flow has no commission and no min/max, and may only target a regular Agent.

### TC17 - SYSTEM deposits 5000 Tk to the Agent

SYSTEM → regular Agent funding flow. The agent starts at 0, so the new balance must be exactly 5000.

**Request** — `POST {{base_url}}/transaction/deposit`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{system_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "SYSTEM",
  "to_account": "{{agent_phone}}",
  "amount": 5000
}
```

**Example response — 201 Created**

```json
{
  "message": "SYSTEM deposit to Agent successful",
  "trnxId": "TXN51AUAWRBZ6",
  "amount": 5000,
  "agentBalance": 5000
}
```

### TC18 - SYSTEM deposit to a Customer is rejected (negative)

The SYSTEM account may only fund a regular Agent. Targeting a Customer must return **400**; nothing is booked.

**Request** — `POST {{base_url}}/transaction/deposit`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{system_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "SYSTEM",
  "to_account": "{{c1_phone}}",
  "amount": 5000
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."
}
```

## 5. Agent deposits to Customer

Agent cash-in of 2000 Tk to Customer 1 with the 2.5% agent commission asserted, plus below-minimum and insufficient-balance negatives.

### TC19 - Agent deposits 2000 Tk to Customer 1 — assert commission

Agent commission = amount × 2.5% = **50 Tk**. Agent net balance = 5000 − 2000 + 50 = **3050**.

**Request** — `POST {{base_url}}/transaction/deposit`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{agent_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{agent_phone}}",
  "to_account": "{{c1_phone}}",
  "amount": 2000
}
```

**Example response — 201 Created**

```json
{
  "message": "Deposit successful",
  "trnxId": "TXNTM9JPD7MWD",
  "commission": 50,
  "currentBalance": 3050
}
```

### TC20 - Deposit below the 10 Tk minimum is rejected (negative)

Deposits must be between 10 and 10,000 Tk. 5 Tk must return **400** with the min/max message; nothing is booked.

**Request** — `POST {{base_url}}/transaction/deposit`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{agent_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{agent_phone}}",
  "to_account": "{{c1_phone}}",
  "amount": 5
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"
}
```

### TC21 - Deposit larger than the Agent balance returns 208 (negative)

Agent holds 3050 Tk, tries 9000 Tk (inside the 10–10,000 range). Expected **208** `Insufficient balance` reporting the unchanged balance.

**Request** — `POST {{base_url}}/transaction/deposit`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{agent_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{agent_phone}}",
  "to_account": "{{c1_phone}}",
  "amount": 9000
}
```

**Example response — 208 Already Reported**

```json
{
  "message": "Insufficient balance",
  "currentBalance": 3050
}
```

## 6. Send money

Customer 1 sends 1000 Tk to Customer 2 with the flat service fee asserted, plus wrong-recipient and insufficient-balance negatives.

### TC22 - Customer 1 sends 1000 Tk to Customer 2 — assert service fee

Send Money carries a flat **5 Tk** service fee (credited to SYSTEM). Sender balance = 2000 − 1000 − 5 = **995**.

**Request** — `POST {{base_url}}/transaction/sendmoney`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c1_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c1_phone}}",
  "to_account": "{{c2_phone}}",
  "amount": 1000
}
```

**Example response — 201 Created**

```json
{
  "message": "Send money successful",
  "trnxId": "TXN3B6ENDPKKC",
  "fee": 5,
  "currentBalance": 995
}
```

### TC23 - Send money to a Merchant is rejected (negative)

Send Money is Customer → Customer only. Expected **400**; no money moves.

**Request** — `POST {{base_url}}/transaction/sendmoney`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c1_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c1_phone}}",
  "to_account": "{{merchant_phone}}",
  "amount": 100
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "Send money is only allowed between two Customer accounts"
}
```

### TC24 - Send money above the sender balance returns 208 (negative)

Customer 1 holds 995 Tk and tries to send 2000 Tk (within the daily limit, so the balance rule is what rejects it). Expected **208** `Insufficient balance`; balance unchanged.

**Request** — `POST {{base_url}}/transaction/sendmoney`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c1_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c1_phone}}",
  "to_account": "{{c2_phone}}",
  "amount": 2000
}
```

**Example response — 208 Already Reported**

```json
{
  "message": "Insufficient balance",
  "currentBalance": 995
}
```

## 7. Cash-out

Customer 2 cashes out 500 Tk via the Agent with the service fee asserted, plus wrong-recipient and below-minimum negatives.

### TC25 - Customer 2 cashes out 500 Tk via the Agent — assert service fee

Withdraw fee = max(1% of amount, 5 Tk) = **5 Tk** for 500 Tk. Customer 2 balance = 1000 − 500 − 5 = **495**. A follow-up balance lookup confirms the Agent earned its 2.5% commission: 3050 + 500 + 12.5 = **3562.5**.

**Request** — `POST {{base_url}}/transaction/withdraw`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{agent_phone}}",
  "amount": 500
}
```

**Example response — 200 OK**

```json
{
  "message": "User balance",
  "balance": 3562.5
}
```

### TC26 - Cash-out to a non-Agent account is rejected (negative)

Cash-out must go through an Agent. Pointing `to_account` at Customer 1 must return **400** `To Account is not agent account`.

**Request** — `POST {{base_url}}/transaction/withdraw`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{c1_phone}}",
  "amount": 100
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "To Account is not agent account"
}
```

### TC27 - Cash-out below the 10 Tk minimum is rejected (negative)

Minimum withdraw amount is 10 Tk. 5 Tk must return **400**; Customer 2's balance (495) is reported unchanged.

**Request** — `POST {{base_url}}/transaction/withdraw`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{agent_phone}}",
  "amount": 5
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "Minimum withdraw amount is 10 tk",
  "currentBalance": 495
}
```

## 8. Payment

Customer 2 pays 400 Tk to the Merchant, plus wrong-recipient and insufficient-balance negatives.

### TC28 - Customer 2 pays 400 Tk to the Merchant

Payment fee = max(1% of 400, 5 Tk) = **5 Tk**. Customer 2 balance = 495 − 400 − 5 = **90**. A follow-up lookup confirms the Merchant received the money (at least 400 Tk).

**Request** — `POST {{base_url}}/transaction/payment`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{merchant_phone}}",
  "amount": 400
}
```

**Example response — 200 OK**

```json
{
  "message": "User found",
  "user": {
    "id": 80,
    "name": "SDET Merchant",
    "email": "sdet.merchant.3615900946@gmail.com",
    "password": "<password-hash-redacted>",
    "phone_number": "01733718020",
    "nid": "9014635625",
    "role": "Merchant",
    "status": "active",
    "otp": null,
    "otp_expire": null,
    "reset_token": null,
    "reset_token_expires": null,
    "photo": null,
    "createdAt": "2026-11-02T16:15:59.000Z",
    "updatedAt": "2026-11-02T16:15:59.000Z",
    "balance": 400
  }
}
```

### TC29 - Payment to a non-Merchant account is rejected (negative)

Payments must go to a Merchant. Paying Customer 1 must return **400**; no money moves.

**Request** — `POST {{base_url}}/transaction/payment`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{c1_phone}}",
  "amount": 100
}
```

**Example response — 400 Bad Request**

```json
{
  "message": "From A/C should be customer or agent and To A/C should be merchant type"
}
```

### TC30 - Payment above the payer balance returns 208 (negative)

Customer 2 holds 90 Tk and tries to pay 500 Tk (within the daily limit, so the balance rule rejects it). Expected **208** `Insufficient balance`; balance unchanged.

**Request** — `POST {{base_url}}/transaction/payment`

| Header | Value |
|---|---|
| `Authorization` | `Bearer {{c2_token}}` |
| `X-AUTH-SECRET-KEY` | `{{partner_key}}` |
| `Content-Type` | `application/json` |

```json
{
  "from_account": "{{c2_phone}}",
  "to_account": "{{merchant_phone}}",
  "amount": 500
}
```

**Example response — 208 Already Reported**

```json
{
  "message": "Insufficient balance",
  "currentBalance": 90
}
```


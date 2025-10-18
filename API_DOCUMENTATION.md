# PeerPay User-Centric APIs Documentation

## Overview
This document provides complete API details for the user-centric endpoints in PeerPay. All endpoints require JWT authentication.

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-api-domain.com`

## Authentication
All endpoints require JWT Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 1. GET /users/me/groups
**Get user groups with financial balances**

### Description
Returns all groups the user belongs to with their net financial position in each group. Shows total amounts owed, due, and net balance per group.

### Request
```http
GET /users/me/groups
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Response
```json
{
  "groups": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Trip to Goa",
      "currency": "INR",
      "profile_emoji": "🏖️",
      "role": "admin",
      "net_amount_minor": "-1500",
      "total_owed_minor": "0",
      "total_due_minor": "1500"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Office Lunch",
      "currency": "INR",
      "profile_emoji": "🍕",
      "role": "member",
      "net_amount_minor": "500",
      "total_owed_minor": "500",
      "total_due_minor": "0"
    }
  ]
}
```

### Response Fields
- `id`: Group ID (UUID)
- `name`: Group name
- `currency`: Currency code (ISO 4217)
- `profile_emoji`: Group emoji (optional)
- `role`: User role in group ("admin" or "member")
- `net_amount_minor`: Net amount user owes (negative = user is owed money)
- `total_owed_minor`: Total amount user owes others
- `total_due_minor`: Total amount others owe user

### Error Responses
- `401 Unauthorized`: Invalid or missing JWT token
- `400 Bad Request`: Invalid request parameters

---

## 2. GET /users/me/expenses
**Get user expenses with filtering and pagination**

### Description
Returns expenses where the user is either the payer or a participant. Supports filtering by settlement status and pagination. Amounts are in minor units.

### Request
```http
GET /users/me/expenses?status=unpaid&page=1&size=20
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Query Parameters
- `status` (optional): Filter by settlement status
  - `"paid"`: Settled expenses
  - `"unpaid"`: Unsettled expenses
  - `"all"`: All expenses (default)
- `page` (optional): Page number starting from 1 (default: 1)
- `size` (optional): Items per page, max 100 (default: 20)

### Response
```json
{
  "items": [
    {
      "id": "expense-123",
      "description": "Dinner at restaurant",
      "amount_minor": "3000",
      "currency": "INR",
      "spent_at": "2024-01-15T19:30:00Z",
      "group": {
        "id": "group-123",
        "name": "Trip to Goa",
        "currency": "INR"
      },
      "payer": {
        "id": "user-123",
        "display_name": "John Doe"
      },
      "user_share_minor": "1500",
      "is_payer": true,
      "is_settled": false,
      "note": "Great food!"
    },
    {
      "id": "expense-456",
      "description": "Taxi fare",
      "amount_minor": "800",
      "currency": "INR",
      "spent_at": "2024-01-16T10:15:00Z",
      "group": {
        "id": "group-123",
        "name": "Trip to Goa",
        "currency": "INR"
      },
      "payer": {
        "id": "user-456",
        "display_name": "Jane Smith"
      },
      "user_share_minor": "400",
      "is_payer": false,
      "is_settled": true,
      "note": "Airport to hotel"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 2
}
```

### Response Fields
- `items`: Array of expense objects
  - `id`: Expense ID (UUID)
  - `description`: Expense description
  - `amount_minor`: Total expense amount in minor units
  - `currency`: Currency code
  - `spent_at`: When expense was incurred (ISO 8601)
  - `group`: Group information
    - `id`: Group ID
    - `name`: Group name
    - `currency`: Group currency
  - `payer`: Payer information
    - `id`: User ID
    - `display_name`: User display name
  - `user_share_minor`: User's share amount in minor units
  - `is_payer`: Whether user paid this expense
  - `is_settled`: Whether user has settled their share
  - `note`: Additional note (optional)
- `page`: Current page number
- `size`: Items per page
- `total`: Total number of expenses

### Error Responses
- `401 Unauthorized`: Invalid or missing JWT token
- `400 Bad Request`: Invalid query parameters

---

## 3. GET /users/me/summary
**Get user financial summary**

### Description
Returns overall financial summary across all groups including total amounts owed, due, net position, group count, and unsettled expense count.

### Request
```http
GET /users/me/summary
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Response
```json
{
  "total_owed_minor": "5000",
  "total_due_minor": "3000",
  "net_amount_minor": "2000",
  "currency": "INR",
  "group_count": 3,
  "unsettled_expense_count": 5
}
```

### Response Fields
- `total_owed_minor`: Total amount user owes across all groups
- `total_due_minor`: Total amount others owe user across all groups
- `net_amount_minor`: Net amount (owed - due, negative = user is owed money)
- `currency`: Currency code for all amounts
- `group_count`: Number of groups user belongs to
- `unsettled_expense_count`: Number of unsettled expenses user is involved in

### Error Responses
- `401 Unauthorized`: Invalid or missing JWT token
- `400 Bad Request`: Invalid request

---

## 4. GET /users/me/dues
**Get detailed dues breakdown per group**

### Description
Returns per-group breakdown showing who the user owes money to and who owes money to the user. Provides detailed counterparty information for settlement planning.

### Request
```http
GET /users/me/dues
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Response
```json
{
  "groups": [
    {
      "group_id": "group-123",
      "group_name": "Trip to Goa",
      "currency": "INR",
      "owes_to": [
        {
          "user_id": "user-456",
          "display_name": "Jane Smith",
          "amount_minor": "1500"
        }
      ],
      "owed_by": [
        {
          "user_id": "user-789",
          "display_name": "Bob Wilson",
          "amount_minor": "2000"
        }
      ],
      "net_amount_minor": "500"
    },
    {
      "group_id": "group-456",
      "group_name": "Office Lunch",
      "currency": "INR",
      "owes_to": [],
      "owed_by": [
        {
          "user_id": "user-101",
          "display_name": "Alice Johnson",
          "amount_minor": "800"
        }
      ],
      "net_amount_minor": "-800"
    }
  ]
}
```

### Response Fields
- `groups`: Array of group objects
  - `group_id`: Group ID (UUID)
  - `group_name`: Group name
  - `currency`: Group currency code
  - `owes_to`: Array of people user owes money to
    - `user_id`: User ID
    - `display_name`: User display name
    - `amount_minor`: Amount owed in minor units
  - `owed_by`: Array of people who owe money to user
    - `user_id`: User ID
    - `display_name`: User display name
    - `amount_minor`: Amount owed in minor units
  - `net_amount_minor`: Net amount user owes in this group

### Error Responses
- `401 Unauthorized`: Invalid or missing JWT token
- `400 Bad Request`: Invalid request

---

## Money Handling

### Minor Units Conversion
All amounts are stored in minor units (smallest currency unit):
- **INR**: 1 rupee = 100 minor units (paise)
- **USD**: 1 dollar = 100 minor units (cents)
- **EUR**: 1 euro = 100 minor units (cents)

### Conversion Examples
- ₹15.00 = `1500` minor units
- $25.50 = `2550` minor units
- €10.75 = `1075` minor units

### Utility Functions
```javascript
// Convert minor units to display amount
const toDisplayAmount = (minorUnits) => (Number(minorUnits) / 100).toFixed(2);

// Convert display amount to minor units
const toMinorUnits = (displayAmount) => Math.round(Number(displayAmount) * 100);

// Format currency display
const formatCurrency = (minorUnits, currency = 'INR') => {
  const amount = toDisplayAmount(minorUnits);
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${amount}`;
};
```

---

## Error Handling

### Common Error Responses
- `400 Bad Request`: Invalid request data or parameters
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Not authorized to access resource
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate UPI VPA)
- `500 Internal Server Error`: Server error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Bad Request"
}
```

---

## Rate Limiting
- No specific rate limits implemented
- Consider implementing client-side throttling for better UX

---

## CORS
- CORS is enabled for development
- Configure appropriate CORS settings for production

---

## Notes
- All timestamps are in ISO 8601 format with UTC timezone
- All UUIDs are version 4 UUIDs
- All monetary amounts are returned as strings to avoid precision issues
- Pagination is 1-indexed (page 1 is the first page)
- Settlement status filtering is simplified in current implementation

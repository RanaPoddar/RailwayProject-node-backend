Packages :
 express 
 cors 
 helmet 
 dotenv 
 bcryptjs 
 jsonwebtoken 
 express-rate-limit 
 express-validator 
 morgan 
 winston 
 ioredis (For Redis)
 socket.io 
 compression 
 prom-client


Test  Credentials:

Email	                  Password	                Role
admin@railway.com	      Admin@123                SUPERADMIN
admin2@railway.com	    C	                       ADMIN
user@railway.com	      Admin@123	               USER


API Endpoints:
Authentication:

POST /api/v1/auth/login - Login
POST /api/v1/auth/refresh - Refresh token
GET /api/v1/auth/me - Get current user
POST /api/v1/auth/logout - Logout

Shifts:
POST /api/v1/shifts - Create shift (Admin/SuperAdmin)
GET /api/v1/shifts - List shifts (All users)
GET /api/v1/shifts/active/summary - Active shifts (All users)
GET /api/v1/shifts/:id - Get shift details (All users)
PATCH /api/v1/shifts/:id - Update shift (Admin/SuperAdmin)
DELETE /api/v1/shifts/:id - Delete shift (SuperAdmin only)

### Pending Works 
Authentication system (90%)
Shift Creation (almost)
(Counter )
Notification System - Background job to monitor duty hours
Relief Management - Advanced relief workflow
Reports & Analytics - Duty hour reports, statistics
Staff Management - CRUD for staff
Locomotive Management - CRUD for locomotives



Post request 
POST http://localhost:8080/api/v1/shifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt token" \   {only super admin and admin can request, user has view only permission}
  -d '{
    "trainNumber": "12345",
    "trainName": "Goods Express",
    "locomotiveNo": "WAG12345",
    "locoPilot": {
      "employeeId": "LP001",
      "name": "Hello world"
    },
    "trainManager": {
      "employeeId": "TM001",
      "name": "Hey World"
    },
    "trainArrivalDate": "2025-11-18",
    "trainArrivalTime": "2025-11-18T10:00:00Z",
    "signOnTime": "2025-11-18T09:30:00Z",
    "timeOfTO": "2025-11-18T10:15:00Z",
    "departureTime": "2025-11-18T11:00:00Z"
  }'




  {
  "trainNumber": "12345",
  "locomotiveNo": "WAP-7 30356",
  "dutyType": "SP",
  "signOnStation": "New Delhi",
  "section": "New Delhi - Mumbai Central",
  "trainArrivalDate": "2025-11-23T00:00:00Z",
  "trainArrivalTime": "2025-11-23T05:30:00Z",
  "timeOfTO": "14:00",
  "signOnTime": "2025-11-23T14:00:00.000Z",
  "departureTime": "2025-11-23T16:00:00.000Z",
  "locoPilot": {
    "name": "Rajesh Kumar",
    "employeeId": "LP12345",
    "phone": "+91 9876543210"
  },
  "trainManager": {
    "name": "Amit Singh",
    "employeeId": "TM67890",
    "phone": "+91 9876543211"
  },
  "createdBy": "Admin User",
  "createdById": "admin-uuid"
}

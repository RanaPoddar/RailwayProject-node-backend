# Railway Shift Management - Flutter Developer Guide

A comprehensive guide for Flutter developers integrating with the Railway Shift Management API.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [API Base URLs](#api-base-urls)
3. [Authentication](#authentication)
4. [HTTP Client Setup](#http-client-setup)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Shift Management Endpoints](#shift-management-endpoints)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Code Examples](#code-examples)

---

## 🚀 Getting Started

### Prerequisites

- Flutter SDK 3.0+
- Dart 3.0+
- HTTP package (`http: ^1.1.0`) or `dio` package
- Shared Preferences for token storage
- JWT decoding package (optional, for debugging)

### Installation

Add dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  dio: ^5.3.0
  shared_preferences: ^2.1.0
  jwt_decoder: ^2.0.1

dev_dependencies:
  flutter_test:
    sdk: flutter
```

---

## 🌐 API Base URLs

```dart
const String DEV_API_BASE_URL = 'http://localhost:8000/api/v1';
const String PROD_API_BASE_URL = 'https://your-domain.com/api/v1';

// Use environment variables for dynamic selection
String getBaseURL() {
  return const String.fromEnvironment('API_URL', defaultValue: DEV_API_BASE_URL);
}
```

---

## 🔐 Authentication

### Token Management

All endpoints (except login and register) require a Bearer token in the Authorization header.

```dart
Authorization: Bearer <your_jwt_token>
```

### Token Storage

Store tokens securely using SharedPreferences:

```dart
import 'package:shared_preferences/shared_preferences.dart';

class TokenService {
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }

  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
  }
}
```

---

## 🔧 HTTP Client Setup

### Using Dio (Recommended)

```dart
import 'package:dio/dio.dart';

class ApiClient {
  late Dio _dio;
  final String baseUrl;

  ApiClient({required this.baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: Duration(seconds: 10),
      receiveTimeout: Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add interceptor for token handling
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Handle token refresh
            final refreshed = await _refreshToken();
            if (refreshed) {
              return handler.resolve(await _retry(error.requestOptions));
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await TokenService.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(contentType: Headers.jsonContentType),
      );

      if (response.statusCode == 200) {
        final newAccessToken = response.data['data']['accessToken'];
        final newRefreshToken = response.data['data']['refreshToken'];
        await TokenService.saveTokens(newAccessToken, newRefreshToken);
        return true;
      }
    } catch (e) {
      await TokenService.clearTokens();
    }
    return false;
  }

  Future<Response> _retry(RequestOptions requestOptions) async {
    final options = Options(
      method: requestOptions.method,
      headers: requestOptions.headers,
    );
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  Dio getDio() => _dio;
}
```

---

## 🔑 Authentication Endpoints

### 1. Register User

**POST** `/auth/register`

Registers a new user account (requires SUPERADMIN approval before login).

```dart
Future<Map<String, dynamic>> registerUser({
  required String employeeId,
  required String name,
  required String email,
  required String phone,
  required String password,
  String? division,
  String? designation,
  String role = 'USER',
}) async {
  try {
    final response = await _dio.post(
      '/auth/register',
      data: {
        'employeeId': employeeId,
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'division': division,
        'designation': designation,
        'role': role,
      },
    );
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Request Body:**

```json
{
  "employeeId": "EMP001",
  "name": "John Doe",
  "email": "john.doe@railway.com",
  "phone": "+91-9876543210",
  "password": "SecurePass123!",
  "division": "Operations",
  "designation": "Shift Coordinator",
  "role": "ADMIN"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Registration successful. Your account is pending approval by administrator.",
  "data": {
    "user": {
      "id": "uuid-string",
      "employeeId": "EMP001",
      "name": "John Doe",
      "email": "john.doe@railway.com",
      "role": "ADMIN",
      "status": "INACTIVE",
      "isVerified": false
    }
  }
}
```

---

### 2. Login

**POST** `/auth/login`

Authenticates user and returns access and refresh tokens.

```dart
Future<Map<String, dynamic>> login({
  required String email,
  required String password,
}) async {
  try {
    final response = await _dio.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
      options: Options(
        headers: {'Authorization': null}, // Don't require token for login
      ),
    );

    if (response.statusCode == 200) {
      final tokens = response.data['data']['tokens'];
      await TokenService.saveTokens(
        tokens['accessToken'],
        tokens['refreshToken'],
      );
    }

    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Request Body:**

```json
{
  "email": "admin@railway.com",
  "password": "Admin@123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-string",
      "employeeId": "EMP001",
      "name": "John Doe",
      "email": "john.doe@railway.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 3. Get Current User

**GET** `/auth/me`

Returns details of the currently authenticated user.

```dart
Future<Map<String, dynamic>> getCurrentUser() async {
  try {
    final response = await _dio.get('/auth/me');
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "employeeId": "EMP001",
    "name": "John Doe",
    "email": "john.doe@railway.com",
    "phone": "+91-9876543210",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2025-11-24T13:30:00.000Z"
  }
}
```

---

### 4. Refresh Token

**POST** `/auth/refresh`

Generates a new access token using the refresh token.

```dart
Future<Map<String, dynamic>> refreshToken() async {
  try {
    final refreshToken = await TokenService.getRefreshToken();
    if (refreshToken == null) throw Exception('No refresh token found');

    final response = await _dio.post(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
      options: Options(
        headers: {'Authorization': null}, // Don't require token
      ),
    );

    if (response.statusCode == 200) {
      final tokens = response.data['data'];
      await TokenService.saveTokens(tokens['accessToken'], tokens['refreshToken']);
    }

    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

---

### 5. Logout

**POST** `/auth/logout`

Logs out the current user (client should delete tokens).

```dart
Future<Map<String, dynamic>> logout() async {
  try {
    final response = await _dio.post('/auth/logout');
    await TokenService.clearTokens();
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

---

## 🚂 Shift Management Endpoints

### 1. Create Shift

**POST** `/shifts`

Creates a new shift entry. Requires ADMIN or SUPERADMIN permission.

```dart
Future<Map<String, dynamic>> createShift({
  required String trainNumber,
  required String locomotiveNo,
  required String signOnStation,
  required String section,
  required DateTime trainArrivalDateTime,
  required DateTime signOnDateTime,
  required String locoPilotName,
  required String locoPilotId,
  required String trainManagerName,
  required String trainManagerId,
  String? trainName,
  DateTime? timeOfTO,
  DateTime? departureDateTime,
  String? locoPilotPhone,
  String? trainManagerPhone,
  String dutyType = 'SP',
}) async {
  try {
    final response = await _dio.post(
      '/shifts',
      data: {
        'trainNumber': trainNumber,
        'trainName': trainName,
        'locomotiveNo': locomotiveNo,
        'signOnStation': signOnStation,
        'section': section,
        'trainArrivalDateTime': trainArrivalDateTime.toIso8601String(),
        'signOnDateTime': signOnDateTime.toIso8601String(),
        'timeOfTO': timeOfTO?.toIso8601String(),
        'departureDateTime': departureDateTime?.toIso8601String(),
        'dutyType': dutyType,
        'locoPilot': {
          'employeeId': locoPilotId,
          'name': locoPilotName,
          'phone': locoPilotPhone,
        },
        'trainManager': {
          'employeeId': trainManagerId,
          'name': trainManagerName,
          'phone': trainManagerPhone,
        },
      },
    );
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Request Body:**

```json
{
  "trainNumber": "12345",
  "trainName": "Express Train",
  "locomotiveNo": "WAP-7-30456",
  "locoPilot": {
    "employeeId": "LP001",
    "name": "Rajesh Kumar",
    "phone": "+91-9876543210"
  },
  "trainManager": {
    "employeeId": "TM001",
    "name": "Suresh Singh",
    "phone": "+91-9876543211"
  },
  "trainArrivalDateTime": "2025-11-24T08:30:00.000Z",
  "signOnDateTime": "2025-11-24T08:00:00.000Z",
  "timeOfTO": "2025-11-24T08:45:00.000Z",
  "departureDateTime": "2025-11-24T09:00:00.000Z",
  "signOnStation": "NDLS",
  "section": "Delhi-Mumbai",
  "dutyType": "SP"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Shift created successfully",
  "data": {
    "id": "shift-uuid",
    "trainNumber": "12345",
    "status": "IN_PROGRESS",
    "dutyHours": null,
    "locoPilot": {
      "id": "pilot-uuid",
      "employeeId": "LP001",
      "name": "Rajesh Kumar"
    },
    "trainManager": {
      "id": "manager-uuid",
      "employeeId": "TM001",
      "name": "Suresh Singh"
    }
  }
}
```

---

### 2. Get All Shifts

**GET** `/shifts`

Retrieves all shifts with optional filtering.

```dart
Future<Map<String, dynamic>> getShifts({
  String? status,
  String? trainNumber,
  String? section,
  String? dutyType,
  DateTime? fromDate,
  DateTime? toDate,
  int page = 1,
  int limit = 10,
}) async {
  try {
    final queryParameters = {
      'page': page,
      'limit': limit,
      if (status != null) 'status': status,
      if (trainNumber != null) 'trainNumber': trainNumber,
      if (section != null) 'section': section,
      if (dutyType != null) 'dutyType': dutyType,
      if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
      if (toDate != null) 'toDate': toDate.toIso8601String(),
    };

    final response = await _dio.get(
      '/shifts',
      queryParameters: queryParameters,
    );
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Query Parameters:**

- `status`: Optional - `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `RELIEF_PLANNED`, `CANCELLED`
- `trainNumber`: Optional - Filter by train number
- `section`: Optional - Filter by section
- `dutyType`: Optional - `SP`, `WR`, `LR`
- `fromDate`: Optional - ISO 8601 date format
- `toDate`: Optional - ISO 8601 date format
- `page`: Optional, default 1
- `limit`: Optional, default 10, max 100

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "shifts": [
      {
        "id": "uuid",
        "trainNumber": "12345",
        "status": "IN_PROGRESS",
        "section": "Delhi-Mumbai",
        "dutyType": "SP",
        "currentDutyHours": 5.25,
        "locoPilot": {
          "id": "uuid",
          "name": "Rajesh Kumar",
          "employeeId": "LP001"
        },
        "trainManager": {
          "id": "uuid",
          "name": "Suresh Sharma",
          "employeeId": "TM001"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### 3. Get Shift by ID

**GET** `/shifts/:id`

Retrieves a specific shift by ID.

```dart
Future<Map<String, dynamic>> getShiftById(String shiftId) async {
  try {
    final response = await _dio.get('/shifts/$shiftId');
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "trainNumber": "12345",
    "trainName": "Express Train",
    "locomotiveNo": "WAP-7-30456",
    "status": "IN_PROGRESS",
    "section": "Delhi-Mumbai",
    "dutyType": "SP",
    "trainArrivalDateTime": "2025-11-24T08:30:00.000Z",
    "signOnDateTime": "2025-11-24T08:00:00.000Z",
    "dutyHours": null,
    "reliefRequired": false,
    "reliefPlanned": false,
    "locoPilot": {
      "id": "pilot-uuid",
      "employeeId": "LP001",
      "name": "Rajesh Kumar",
      "phone": "+91-9876543210"
    },
    "trainManager": {
      "id": "manager-uuid",
      "employeeId": "TM001",
      "name": "Suresh Singh",
      "phone": "+91-9876543211"
    }
  }
}
```

---

### 4. Update Shift

**PATCH** `/shifts/:id`

Updates a shift (Admin/SuperAdmin only).

```dart
Future<Map<String, dynamic>> updateShift({
  required String shiftId,
  DateTime? timeOfTO,
  DateTime? departureDateTime,
  DateTime? signOffDateTime,
  String? signOffStation,
  String? section,
  String? dutyType,
  String? status,
  bool? reliefPlanned,
  String? reliefReason,
}) async {
  try {
    final data = <String, dynamic>{};
    
    if (timeOfTO != null) data['timeOfTO'] = timeOfTO.toIso8601String();
    if (departureDateTime != null) data['departureDateTime'] = departureDateTime.toIso8601String();
    if (signOffDateTime != null) data['signOffDateTime'] = signOffDateTime.toIso8601String();
    if (signOffStation != null) data['signOffStation'] = signOffStation;
    if (section != null) data['section'] = section;
    if (dutyType != null) data['dutyType'] = dutyType;
    if (status != null) data['status'] = status;
    if (reliefPlanned != null) data['reliefPlanned'] = reliefPlanned;
    if (reliefReason != null) data['reliefReason'] = reliefReason;

    final response = await _dio.patch('/shifts/$shiftId', data: data);
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

---

### 5. Complete Shift

**POST** `/shifts/:id/complete`

Marks a shift as completed (Admin/SuperAdmin only).

```dart
Future<Map<String, dynamic>> completeShift({
  required String shiftId,
  required DateTime signOffDateTime,
  required String signOffStation,
}) async {
  try {
    final response = await _dio.post(
      '/shifts/$shiftId/complete',
      data: {
        'signOffDateTime': signOffDateTime.toIso8601String(),
        'signOffStation': signOffStation,
      },
    );
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

---

### 6. Delete Shift

**DELETE** `/shifts/:id`

Deletes a shift (SuperAdmin only).

```dart
Future<Map<String, dynamic>> deleteShift(String shiftId) async {
  try {
    final response = await _dio.delete('/shifts/$shiftId');
    return response.data;
  } on DioException catch (e) {
    throw _handleError(e);
  }
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

### Error Handling Implementation

```dart
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? errors;

  ApiException({
    required this.message,
    this.statusCode,
    this.errors,
  });

  @override
  String toString() => message;
}

String _handleError(DioException e) {
  if (e.response != null) {
    final statusCode = e.response!.statusCode;
    final responseData = e.response!.data as Map<String, dynamic>?;

    switch (statusCode) {
      case 400:
        return responseData?['message'] ?? 'Bad Request';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return responseData?['message'] ?? 'Conflict. Resource already exists.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return responseData?['message'] ?? 'An error occurred.';
    }
  }

  if (e.type == DioExceptionType.connectionTimeout) {
    return 'Connection timeout. Please check your internet connection.';
  }
  if (e.type == DioExceptionType.receiveTimeout) {
    return 'Request timeout. Please try again.';
  }

  return 'An unexpected error occurred.';
}
```

---

## 💡 Best Practices

### 1. Token Management

- Store tokens securely using `shared_preferences` or `flutter_secure_storage`
- Implement automatic token refresh on 401 responses
- Clear tokens on logout

### 2. Request Timeouts

Set appropriate timeouts for network requests:

```dart
final dio = Dio(BaseOptions(
  connectTimeout: Duration(seconds: 10),
  receiveTimeout: Duration(seconds: 10),
));
```

### 3. Validation

Validate user input before sending requests:

```dart
bool isValidEmail(String email) {
  final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  return emailRegex.hasMatch(email);
}

bool isValidPhone(String phone) {
  final phoneRegex = RegExp(r'^(\+91[\s]?)?[6-9]\d{9}$');
  return phoneRegex.test(phone.replaceAll(RegExp(r'[\s-]'), ''));
}
```

### 4. Loading States

Always show loading indicators during API calls:

```dart
Future<void> _loadShifts() async {
  setState(() => _isLoading = true);
  try {
    final response = await apiClient.getShifts();
    setState(() => _shifts = response['data']['shifts']);
  } catch (e) {
    _showError(e.toString());
  } finally {
    setState(() => _isLoading = false);
  }
}
```

### 5. Pagination

Handle pagination for large datasets:

```dart
int _currentPage = 1;
final int _itemsPerPage = 10;

Future<void> _loadMoreShifts() async {
  try {
    final response = await apiClient.getShifts(
      page: _currentPage + 1,
      limit: _itemsPerPage,
    );
    setState(() {
      _shifts.addAll(response['data']['shifts']);
      _currentPage++;
    });
  } catch (e) {
    _showError(e.toString());
  }
}
```

---

## 📚 Code Examples

### Example 1: Complete Authentication Flow

```dart
class AuthService {
  final ApiClient apiClient;

  AuthService({required this.apiClient});

  Future<bool> login(String email, String password) async {
    try {
      final response = await apiClient.login(
        email: email,
        password: password,
      );

      if (response['success']) {
        return true;
      }
      throw Exception(response['message']);
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> logout() async {
    try {
      await apiClient.logout();
      return true;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await apiClient.getCurrentUser();
      if (response['success']) {
        return response['data'];
      }
      throw Exception(response['message']);
    } catch (e) {
      rethrow;
    }
  }
}
```

### Example 2: Shift Management Service

```dart
class ShiftService {
  final ApiClient apiClient;

  ShiftService({required this.apiClient});

  Future<List<Map<String, dynamic>>> getActiveShifts() async {
    try {
      final response = await apiClient.getShifts(
        status: 'IN_PROGRESS',
        limit: 50,
      );

      if (response['success']) {
        return List<Map<String, dynamic>>.from(response['data']['shifts']);
      }
      throw Exception(response['message']);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createNewShift({
    required String trainNumber,
    required String locomotiveNo,
    required String locoPilotName,
    required String locoPilotId,
    required String trainManagerName,
    required String trainManagerId,
    required DateTime trainArrivalDateTime,
    required DateTime signOnDateTime,
    required String signOnStation,
    required String section,
  }) async {
    try {
      final response = await apiClient.createShift(
        trainNumber: trainNumber,
        locomotiveNo: locomotiveNo,
        locoPilotName: locoPilotName,
        locoPilotId: locoPilotId,
        trainManagerName: trainManagerName,
        trainManagerId: trainManagerId,
        trainArrivalDateTime: trainArrivalDateTime,
        signOnDateTime: signOnDateTime,
        signOnStation: signOnStation,
        section: section,
      );

      if (response['success']) {
        return response['data'];
      }
      throw Exception(response['message']);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> completeShift({
    required String shiftId,
    required DateTime signOffDateTime,
    required String signOffStation,
  }) async {
    try {
      final response = await apiClient.completeShift(
        shiftId: shiftId,
        signOffDateTime: signOffDateTime,
        signOffStation: signOffStation,
      );

      if (response['success']) {
        return response['data'];
      }
      throw Exception(response['message']);
    } catch (e) {
      rethrow;
    }
  }
}
```

### Example 3: Using Provider for State Management

```dart
import 'package:provider/provider.dart';

class ShiftProvider extends ChangeNotifier {
  final ShiftService shiftService;
  List<Map<String, dynamic>> _shifts = [];
  bool _isLoading = false;
  String? _error;

  ShiftProvider({required this.shiftService});

  List<Map<String, dynamic>> get shifts => _shifts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadActiveShifts() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _shifts = await shiftService.getActiveShifts();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createShift({
    required String trainNumber,
    required String locomotiveNo,
    required String locoPilotName,
    required String locoPilotId,
    required String trainManagerName,
    required String trainManagerId,
    required DateTime trainArrivalDateTime,
    required DateTime signOnDateTime,
    required String signOnStation,
    required String section,
  }) async {
    try {
      await shiftService.createNewShift(
        trainNumber: trainNumber,
        locomotiveNo: locomotiveNo,
        locoPilotName: locoPilotName,
        locoPilotId: locoPilotId,
        trainManagerName: trainManagerName,
        trainManagerId: trainManagerId,
        trainArrivalDateTime: trainArrivalDateTime,
        signOnDateTime: signOnDateTime,
        signOnStation: signOnStation,
        section: section,
      );

      // Reload shifts after successful creation
      await loadActiveShifts();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
```

### Example 4: Widget Implementation

```dart
class ShiftsScreen extends StatefulWidget {
  @override
  State<ShiftsScreen> createState() => _ShiftsScreenState();
}

class _ShiftsScreenState extends State<ShiftsScreen> {
  @override
  void initState() {
    super.initState();
    // Load shifts when widget initializes
    Provider.of<ShiftProvider>(context, listen: false).loadActiveShifts();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ShiftProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Error: ${provider.error}'),
                SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => provider.loadActiveShifts(),
                  child: Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (provider.shifts.isEmpty) {
          return Center(child: Text('No active shifts'));
        }

        return ListView.builder(
          itemCount: provider.shifts.length,
          itemBuilder: (context, index) {
            final shift = provider.shifts[index];
            return ListTile(
              title: Text('Train ${shift['trainNumber']}'),
              subtitle: Text('${shift['section']} - ${shift['status']}'),
              onTap: () => _showShiftDetails(context, shift),
            );
          },
        );
      },
    );
  }

  void _showShiftDetails(BuildContext context, Map<String, dynamic> shift) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Train ${shift['trainNumber']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Section: ${shift['section']}'),
            Text('Status: ${shift['status']}'),
            Text('Duty Hours: ${shift['dutyHours'] ?? "In Progress"}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
          ),
        ],
      ),
    );
  }
}
```

---

## 📞 Support

For API issues or questions, contact the backend development team or check the [main API documentation](API_DOCUMENTATION.md).

---

**Last Updated:** March 25, 2026


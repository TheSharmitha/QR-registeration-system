# ASCAS QR-Based Patient Registration System (v1.0)

A secure, modern, QR Code-based patient registration system designed to streamline check-ins. Patients scan a QR Code in the clinic lobby, fill in their details on a mobile-friendly form, and receive a check-in code. Receptionists can then review, edit, approve, or reject submissions from a glassmorphic dashboard.

---

## 🌟 Key Features

1. **Mobile-First Registration Form**:
   - Clean, highly responsive touch UI.
   - Real-time age calculation immediately upon selecting DOB.
   - Government ID (Aadhaar) input masking (strictly displays only the last 4 digits for privacy and compliance).
   - Generates a simulated registration ticket with a check-in QR Code.

2. **Receptionist Admin Dashboard**:
   - Secure role-based login (JWT authenticated).
   - Real-time queue showing all `PENDING` patient registrations.
   - Multi-criteria filtering (Name, Mobile, Specialist, Visit Date).
   - Approval Drawer to review, edit details, assign doctor & appointment type, and process entries.

3. **Robust Backend & Database Integration**:
   - Node.js & Express.js server secured with Helmet headers and CORS protection.
   - Database schema mapped via Prisma ORM for PostgreSQL.
   - Automatic background cron jobs for cleaning old registrations.
   - Swagger documentation available at `/api-docs`.

4. **Security & Single-Transaction Approval Logic**:
   - Full 12-digit Government IDs (Aadhaar) are encrypted on the server with AES-256-CBC and stored in the database.
   - Single-transaction approval flow checks for duplicates (preventing database pollution by linking appointments to existing patient records) and increments the ID sequence (e.g. `ASCAS000001`, `ASCAS000002`).
   - Mock WhatsApp notification hook triggered upon approval.
   - Winston logger audit trail for tracking administrative changes.

---

## 🛠️ Tech Stack

- **Frontend**: React.js (v18), Vite, React Router, Axios, Custom CSS Variables (Vanilla).
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, jsonwebtoken, Helmet, express-validator, Winston, node-cron, Swagger UI.
- **Infrastructure**: NGINX Reverse Proxy, Docker, Docker Compose.

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose installed.
- Or, local installations of Node.js (v20+), npm, and PostgreSQL.

---

### Run with Docker (Recommended)

To spin up the entire system (PostgreSQL, Backend API, Frontend build, NGINX proxy) in a single command, run the following at the root of the project:

```bash
docker-compose up --build
```

- **Patient Portal**: Access at `http://localhost/register` (through NGINX).
- **Reception Dashboard**: Access at `http://localhost/dashboard`.
- **API Documentation (Swagger)**: Access at `http://localhost/api-docs`.
- **Backend API**: Listening internally on port `5000` (routed via `/api/*` on port `80`).

#### Receptionist Login Credentials
- **Username**: `admin`
- **Password**: `password123`

---

### Run Locally (Without Docker)

1. **Database Setup**:
   Ensure PostgreSQL is running and create a database named `ascas_qr_reg`.
   
2. **Backend Config & Launch**:
   ```bash
   cd backend
   npm install
   # Create a .env file mirroring .env.example and set your DATABASE_URL
   npx prisma db push
   node prisma/seed.js
   npm run dev
   ```

3. **Frontend Launch**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   Access the frontend application at `http://localhost:3000`.

---

## 🔒 Security Compliance Note

- **Aadhaar Privacy**: The full Aadhaar number is never stored in plain text. It is encrypted using AES-256-CBC with a server-side secret key before writing to the database. The receptionist dashboard API decrypts this value and masks it as `XXXX-XXXX-1234` before transmitting it to the client, ensuring complete privacy compliance.
- **Audit Logs**: All receptionist actions (approvals, rejections, edits) are written to backend audit logs (`logs/combined.log` and `logs/error.log`).

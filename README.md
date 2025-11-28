# STOCK - Restaurant Inventory Management Platform

A full-stack inventory management system for restaurants and small businesses. This project demonstrates practical solutions to real-world business problems: multi-user authentication, real-time data synchronization, role-based access control, and scalable server architecture.

## 🎯 Problems This Project Solves

### 1. Multi-User Role Management
- Owner, employee, and pending user roles with different permissions
- Secure authentication and session management
- Employee invitation and approval workflow

### 2. Real-Time Inventory Tracking
- Instant stock updates across all users
- Create, read, update, delete operations for inventory items
- Order list management with status tracking

### 3. Efficient View Rendering
- Server-side templating with EJS for fast initial load
- Modular view components for maintainability
- Reusable header, navigation, and layout patterns

### 4. Chat Integration
- Built-in messaging system for team communication
- Real-time updates without page refresh
- Persistent message history

## 🏗️ Project Structure

```
STOCK/
├── node_modules/          # Dependencies
├── public/               # Static assets
│   └── main.css         # Global styles
├── views/               # EJS templates (view layer)
│   ├── chat.ejs        # Team chat interface
│   ├── createItem.ejs  # New inventory item form
│   ├── detail.ejs      # Item detail view
│   ├── edit.ejs        # Edit item form
│   ├── header.ejs      # Reusable header component
│   ├── list.ejs        # Main inventory list
│   ├── login.ejs       # Login page
│   ├── mypage.ejs      # User profile
│   ├── nav.ejs         # Navigation component
│   ├── navbar-bottom.ejs  # Bottom navigation
│   ├── orderlist.ejs   # Order management
│   ├── pending-employees.ejs  # Employee approval
│   ├── showimg.ejs     # Image display
│   ├── signup-employee.ejs    # Employee registration
│   ├── signup-owner.ejs       # Owner registration
│   ├── signup-pending.ejs     # Pending approval page
│   └── write.ejs       # General write form
├── .gitignore          # Git ignore rules
├── index.html          # Entry HTML
├── package.json        # Project dependencies
├── package-lock.json   # Dependency lock file
├── README.md           # Project documentation
└── server.js           # Main server file (routing & logic)
```

## 🔧 Technical Architecture

### Server Architecture (`server.js`)

Main server file handles:
- **Routing**: All HTTP endpoints (GET, POST, PUT, DELETE)
- **Database operations**: MongoDB queries via Mongoose
- **Authentication**: Session management and user verification
- **Business logic**: Role-based access control, inventory operations

```javascript
// Example structure in server.js
app.get('/list', isAuthenticated, async (req, res) => {
  // Fetch inventory items
  // Render list.ejs with data
});

app.post('/createItem', isAuthenticated, async (req, res) => {
  // Validate user role
  // Save to database
  // Redirect or respond
});
```

### View Layer (EJS Templates)

Modular template system:
- **Component templates**: `header.ejs`, `nav.ejs`, `navbar-bottom.ejs`
- **Page templates**: Each feature has dedicated view
- **Reusable layouts**: Consistent UI across all pages

```ejs
<!-- Example: list.ejs -->
<%- include('header.ejs') %>
<%- include('nav.ejs') %>
<!-- Page-specific content -->
<%- include('navbar-bottom.ejs') %>
```

### Role-Based Features

**Owner Role:**
- Approve/reject employee requests (`pending-employees.ejs`)
- Full CRUD access to inventory
- Manage orders and team

**Employee Role:**
- View and update inventory
- Create orders
- Participate in team chat

**Pending Role:**
- Limited access until owner approval
- Displays waiting status (`signup-pending.ejs`)

## 🛠️ Development Setup

### Prerequisites
- Node.js >= 14
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
# MONGO_URI=your_mongodb_connection_string
# SESSION_SECRET=your_session_secret
# PORT=3000

# Start server
node server.js
```

### Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.x",
    "ejs": "^3.x",
    "mongoose": "^7.x",
    "express-session": "^1.x",
    "bcrypt": "^5.x",
    "connect-mongo": "^5.x"
  }
}
```

## 📊 Data Flow

### Inventory Management Flow

```
User Action (Create Item)
    ↓
POST /createItem
    ↓
Validate Authentication
    ↓
Check User Role (Owner/Employee)
    ↓
Save to MongoDB
    ↓
Redirect to /list
    ↓
Render list.ejs with updated data
```

### Authentication Flow

```
User Login (login.ejs)
    ↓
POST /login
    ↓
Verify credentials (bcrypt)
    ↓
Create session
    ↓
Redirect to /list or /mypage
```

### Employee Approval Flow

```
Employee Signup (signup-employee.ejs)
    ↓
Save with status: 'pending'
    ↓
Show signup-pending.ejs
    ↓
Owner views pending-employees.ejs
    ↓
Approve/Reject
    ↓
Update user status
    ↓
Employee gets full access
```

## 🎨 Key Features Implementation

### 1. Inventory CRUD
- **Create**: `createItem.ejs` → POST `/createItem`
- **Read**: `list.ejs` → GET `/list`
- **Update**: `edit.ejs` → PUT `/edit/:id`
- **Delete**: DELETE `/delete/:id`
- **Detail**: `detail.ejs` → GET `/detail/:id`

### 2. Multi-User System
- Owner registration: `signup-owner.ejs`
- Employee registration: `signup-employee.ejs`
- Approval workflow: `pending-employees.ejs`
- Role verification middleware in `server.js`

### 3. Order Management
- Create orders: `orderlist.ejs`
- Track order status
- Link orders to inventory items

### 4. Team Communication
- Real-time chat: `chat.ejs`
- Message persistence
- User identification in messages

### 5. User Profile
- Personal info management: `mypage.ejs`
- View assigned business
- Update preferences

## 🔒 Security Features

### Authentication & Authorization
```javascript
// Middleware in server.js
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function isOwner(req, res, next) {
  if (req.session.user.role === 'owner') {
    return next();
  }
  res.status(403).send('Access denied');
}
```

### Session Management
- Secure session storage with connect-mongo
- Session expiration
- CSRF protection (recommended to add)

### Password Security
- Bcrypt hashing for passwords
- Salt rounds configuration
- No plain text storage

## 📱 Responsive Design

### CSS Architecture (`public/main.css`)
- Mobile-first approach
- Reusable utility classes
- Consistent spacing and typography
- Bottom navigation for mobile (`navbar-bottom.ejs`)

### View Optimization
- Server-side rendering for fast initial load
- Minimal client-side JavaScript
- Progressive enhancement strategy

## 🧪 Testing Strategy

### Recommended Tests
```javascript
// Unit tests (to be added)
- Authentication functions
- Role verification
- Data validation

// Integration tests
- User signup flow
- Inventory CRUD operations
- Order creation

// E2E tests
- Complete user journey
- Multi-user scenarios
```

## 🚀 Deployment Considerations

### Environment Variables
```bash
# .env file
MONGO_URI=mongodb+srv://...
SESSION_SECRET=random_string_here
PORT=3000
NODE_ENV=production
```

### Production Checklist
- [ ] Set secure session secret
- [ ] Enable HTTPS
- [ ] Configure MongoDB Atlas
- [ ] Set up error logging
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Optimize static assets

### Deployment Options
- **Heroku**: Easy deployment with MongoDB Atlas
- **AWS EC2**: Full control over environment
- **DigitalOcean**: Balanced cost and control
- **Vercel/Netlify**: Would need serverless adaptation

## 🔧 Architecture Decisions

### Why EJS Templates?
- Server-side rendering for SEO
- Faster initial page load
- Simpler state management
- No build step required
- Easy to learn and maintain

### Why Single server.js?
- Clear flow of all routes in one place
- Easy to understand for small teams
- Quick prototyping and iteration
- Can be refactored to MVC pattern later

### Why Session-Based Auth?
- Simpler than JWT for traditional web apps
- Built-in Express support
- Automatic session management
- Secure by default with HTTPS

### Why MongoDB?
- Flexible schema for evolving requirements
- Easy integration with Node.js
- Scalable for growing businesses
- Rich query capabilities

## 📊 Performance Optimizations

### Implemented:
- Server-side rendering (no client hydration delay)
- Efficient EJS compilation
- Reusable template components
- MongoDB indexing (recommended to add)

### To Consider:
- Add Redis for session store
- Implement database query caching
- Add CDN for static assets
- Enable gzip compression

## 🔮 Scalability Patterns

### Current Architecture:
```
Client → Express Server → MongoDB
```

### Scaling Strategy:
```
Client → Load Balancer → [Server 1, Server 2, ...] → MongoDB Cluster
                      ↓
                 Redis (sessions)
```

### Extractable Modules:
- **Auth middleware**: Can be packaged as npm module
- **Role-based access**: Reusable authorization system
- **EJS components**: Template library for other projects
- **MongoDB schemas**: Can be extracted to separate package

## 📖 API Endpoints

### Public Routes
- `GET /` - Landing page
- `GET /login` - Login page
- `POST /login` - Login handler
- `GET /signup-owner` - Owner registration
- `POST /signup-owner` - Owner registration handler
- `GET /signup-employee` - Employee registration
- `POST /signup-employee` - Employee registration handler

### Protected Routes (Authenticated)
- `GET /list` - Inventory list
- `GET /detail/:id` - Item details
- `GET /mypage` - User profile
- `GET /chat` - Team chat
- `GET /orderlist` - Order list

### Owner-Only Routes
- `GET /pending-employees` - Pending approvals
- `POST /approve-employee/:id` - Approve employee
- `POST /reject-employee/:id` - Reject employee

### Inventory Management
- `GET /createItem` - Create form
- `POST /createItem` - Create handler
- `GET /edit/:id` - Edit form
- `PUT /edit/:id` - Update handler
- `DELETE /delete/:id` - Delete handler

## 🎓 Key Learnings

### 1. Full-Stack Development
- Connecting frontend (EJS) to backend (Express)
- Managing state on the server
- Session-based authentication flow

### 2. Database Design
- Schema modeling for business relationships
- User roles and permissions
- Data relationships (users → businesses → inventory)

### 3. Code Organization
- Modular view templates
- Centralized routing
- Separation of concerns (views vs. logic)

### 4. User Experience
- Multi-step registration flows
- Role-based UI rendering
- Responsive navigation patterns

## 🔮 Future Improvements

- [ ] Refactor `server.js` into MVC pattern (routes/, controllers/, models/)
- [ ] Add input validation middleware
- [ ] Implement WebSocket for real-time chat
- [ ] Add unit and integration tests
- [ ] Create API documentation
- [ ] Add image upload for inventory items
- [ ] Implement notifications system
- [ ] Add data export functionality
- [ ] Create mobile app version

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS templates, vanilla JavaScript
- **Database**: MongoDB with Mongoose
- **Authentication**: express-session, bcrypt
- **Styling**: CSS3

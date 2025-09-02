# Break The Fear - Fee Management System

A comprehensive fee management system for coaching centers built with vanilla HTML, CSS, and JavaScript.

## 🔐 Security Setup

### First Time Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd break-the-fear-fee-management
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your credentials in `.env`:**
   ```env
   # Change these to your secure credentials
   VITE_DEFAULT_ADMIN_USERNAME=your_admin_username
   VITE_DEFAULT_ADMIN_PASSWORD=your_secure_password
   VITE_DEFAULT_MANAGER_USERNAME=your_manager_username
   VITE_DEFAULT_MANAGER_PASSWORD=your_secure_password
   VITE_DEFAULT_DEVELOPER_USERNAME=your_developer_username
   VITE_DEFAULT_DEVELOPER_PASSWORD=your_secure_password
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

### 🚨 Important Security Notes

- **Never commit `.env` files** - They are automatically ignored by git
- **Change default passwords immediately** after first login
- **Use strong passwords** with mixed case, numbers, and special characters
- **Regularly update user passwords** through the user management system

### Default Behavior

If no environment variables are set, the system will:
1. Generate a random 12-character password for the admin user
2. Display the password in the browser console
3. Show the credentials on the login screen for first-time setup
4. Require you to change the password after first login

## 🚀 Features

- **User Management**: Role-based access control (Admin, Manager, Developer)
- **Student Management**: Complete student database with enrollment tracking
- **Fee Payment**: Advanced payment processing with discount support
- **Batch & Course Management**: Organize students by batches and courses
- **Reports**: Comprehensive payment and discount reports
- **Invoice Generation**: Professional thermal printer-ready invoices
- **Dark/Light Theme**: User preference theme switching

## 🛡️ Security Features

- **Password Hashing**: All passwords are hashed before storage
- **Account Lockout**: Automatic lockout after failed login attempts
- **Session Management**: Secure user session handling
- **Environment Variables**: Sensitive data stored in environment variables
- **Input Sanitization**: All user inputs are sanitized

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Thermal printers (for invoices)

## 🔧 Development

### Project Structure
```
├── index.html          # Main application file
├── js/                 # JavaScript modules
│   ├── auth.js         # Authentication system
│   ├── main.js         # Application initialization
│   ├── storage.js      # Data management
│   └── ...            # Other modules
├── styles/             # CSS stylesheets
│   ├── main.css        # Main styles
│   ├── themes.css      # Theme definitions
│   └── components.css  # Component styles
└── .env.example        # Environment variables template
```

### Adding New Features

1. Create new JavaScript modules in the `js/` directory
2. Add corresponding CSS in the `styles/` directory
3. Update the main HTML file if needed
4. Test thoroughly before deployment

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and queries, contact: info@breakthefear.com
</parameter>